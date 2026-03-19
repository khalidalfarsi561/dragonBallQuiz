"use server";

import { z } from "zod";
import { getKV } from "@/lib/kv";
import type { LeaderboardRecord, QuestionRecord, UserRecord } from "@/lib/pocketbase";
import { createPBAdminClient, createPBServerClient } from "@/lib/pocketbase";
import {
  calculatePowerLevel,
  computeAwardedScore,
  evaluateZenkai,
  type DifficultyTier,
  type ZenkaiState,
} from "@/lib/gamification";
import { updateDailyQuestsOnAnswer } from "@/lib/quests-and-skills";
import { verifyQuizQuestionToken } from "@/lib/quiz-session";
import { markNonceUsedOrReject } from "@/lib/anti-replay";

/**
 * ---- Rate Limiting ----
 * هدف: منع brute-force / spam clicks.
 *
 * Uses shared KV when configured (Upstash Redis REST), falls back to in-memory KV in dev.
 */
const RATE_LIMIT_WINDOW_MS = 2_000;

async function checkAndTouchRateLimit(userId: string) {
  const now = Date.now();
  const kv = await getKV();
  const key = `quiz:rl:${userId}`;

  const lastStr = await kv.get(key);
  const last = lastStr ? Number(lastStr) : 0;

  if (Number.isFinite(last) && now - last < RATE_LIMIT_WINDOW_MS) {
    return { ok: false as const, message: "أنت سريع جداً، يرجى الانتظار!" };
  }

  await kv.set(key, String(now), { exMs: RATE_LIMIT_WINDOW_MS + 10_000 });

  return { ok: true as const };
}

const submitAnswerSchema = z.object({
  questionId: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[a-z0-9]+$/i, "معرّف السؤال غير صالح"),
  selectedOption: z.string().min(1).max(512),

  // Server-signed token: binds questionId + issuedAt to prevent time cheating + replay
  questionToken: z.string().min(10).max(4096),

  // Optional: client-side only (UX). We DO NOT trust it for scoring.
  timeMs: z.number().int().min(0).max(120_000).optional(),
});

export async function submitAnswer(
  questionId: string,
  selectedOption: string,
  questionToken: string | null,
  timeMs?: number
): Promise<{
  isCorrect: boolean;
  message: string;
  newPowerLevel: number;
  correctOption: string;
}> {
  // 1) Input Validation (Zod)
  const parsed = submitAnswerSchema.safeParse({ questionId, selectedOption, questionToken, timeMs });
  if (!parsed.success) {
    return {
      isCorrect: false,
      message: "مدخلات غير صالحة.",
      newPowerLevel: 0,
      correctOption: "",
    };
  }

  // 2) Authentication Verification (Server-side PB client per request)
  //    نستخدمه فقط للتحقق من الجلسة واستخراج userId (بدون أي عمليات على collections المحمية)
  const pb = await createPBServerClient();

  if (!pb.authStore.isValid || !pb.authStore.record?.id) {
    return {
      isCorrect: false,
      message: "يجب تسجيل الدخول للإجابة.",
      newPowerLevel: 0,
      correctOption: "",
    };
  }

  const userId = pb.authStore.record.id;

  // ---- Verify question token (anti-cheat + anti-replay binding) ----
  const tokenCheck = verifyQuizQuestionToken(parsed.data.questionToken);
  if (!tokenCheck.ok) {
    return {
      isCorrect: false,
      message: "انتهت صلاحية السؤال أو أن الطلب غير صالح.",
      newPowerLevel: 0,
      correctOption: "",
    };
  }

  if (tokenCheck.payload.userId !== userId || tokenCheck.payload.questionId !== parsed.data.questionId) {
    return {
      isCorrect: false,
      message: "طلب غير مصرح به.",
      newPowerLevel: 0,
      correctOption: "",
    };
  }

  const replay = await markNonceUsedOrReject({
    userId,
    questionId: parsed.data.questionId,
    nonce: tokenCheck.payload.nonce,
    expiresAtMs: tokenCheck.payload.expiresAtMs,
  });

  if (!replay.ok) {
    return {
      isCorrect: false,
      message: "تم إرسال هذه الإجابة مسبقاً (محاولة مكررة).",
      newPowerLevel: 0,
      correctOption: "",
    };
  }

  // ---- Rate Limiting (after auth) ----
  const rl = await checkAndTouchRateLimit(userId);
  if (!rl.ok) {
    return {
      isCorrect: false,
      message: rl.message,
      newPowerLevel: 0,
      correctOption: "",
    };
  }

  // 3) Admin client (يتجاوز API Rules بأمان داخل الخادم)
  const adminPb = await createPBAdminClient();

  // 4) Compare Answer (NEVER expose correct_answer to client)
  const q = await adminPb.collection<QuestionRecord>("questions").getOne(parsed.data.questionId);

  const isCorrect = parsed.data.selectedOption === q.correct_answer;

  // 5) Update leaderboard securely on server (admin)
  let leaderboard: LeaderboardRecord | null = null;

  try {
    leaderboard = await adminPb.collection<LeaderboardRecord>("leaderboard").getFirstListItem(`user_id="${userId}"`);
  } catch {
    leaderboard = null;
  }

  type LeaderboardCreatePayload = Omit<LeaderboardRecord, "id" | "collectionId" | "collectionName" | "created" | "updated">;

  if (!leaderboard) {
    // PocketBase schema uses field name `user_id` (relation) not `user`
    const createPayload: LeaderboardCreatePayload = {
      user_id: userId,
      score: 0,
      streak: 0,
      consecutive_wrong: 0,
    };

    leaderboard = await adminPb.collection<LeaderboardRecord>("leaderboard").create(createPayload);
  }

  // Type-narrowing safety
  const lb = leaderboard;
  if (!lb) {
    // should never happen, but keep strict TS + safety
    return {
      isCorrect: false,
      message: "حدث خطأ غير متوقع. حاول مرة أخرى.",
      newPowerLevel: 0,
      correctOption: "",
    };
  }

  // --- Gamification (server-side) ---
  // Base score can later vary by difficulty, speed, etc.
  const baseScore = 10;

  // Pull user data from DB via admin (to support locked-down rules + zenkai persistence)
  const user = await adminPb.collection<UserRecord>("users").getOne(userId);

  const currentPowerLevel = Number(user.power_level ?? 0);
  const currentZenkaiBoosts = Number(user.zenkai_boosts ?? 0);

  const currentZenkai: ZenkaiState | null =
    Number(user.zenkai_attempts_left ?? 0) > 0
      ? {
          multiplier: Number(user.active_zenkai_multiplier ?? 0),
          remainingAttempts: Number(user.zenkai_attempts_left ?? 0),
        }
      : null;

  // Simple streak transition
  const prevStreak = lb.streak ?? 0;
  const nextStreak = isCorrect ? prevStreak + 1 : 0;

  const prevConsecutiveWrong = lb.consecutive_wrong ?? 0;
  const nextConsecutiveWrong = isCorrect ? 0 : prevConsecutiveWrong + 1;

  // Evaluate zenkai activation (with persistence)
  const zenkaiEval = evaluateZenkai({
    wasCorrect: isCorrect,
    prevStreak,
    nextStreak,
    prevConsecutiveWrong,
    nextConsecutiveWrong,
    currentZenkai,
  });

  const awardedScore = computeAwardedScore({
    baseScore,
    zenkai: zenkaiEval.nextZenkai,
  });

  // Update leaderboard with awardedScore / nextStreak
  if (isCorrect) {
    await adminPb.collection<LeaderboardRecord>("leaderboard").update(lb.id, {
      score: (lb.score ?? 0) + awardedScore,
      streak: nextStreak,
      consecutive_wrong: nextConsecutiveWrong,
    });
  } else {
    await adminPb.collection<LeaderboardRecord>("leaderboard").update(lb.id, {
      streak: 0,
      consecutive_wrong: nextConsecutiveWrong,
    });
  }

  // Calculate power level (difficulty from question, time measured server-side from token issuance)
  const difficultyTier = (q.difficulty_tier ?? 1) as DifficultyTier;
  const safeTimeMs = Math.min(
    Math.max(Date.now() - tokenCheck.payload.issuedAtMs, 0),
    120_000
  );

  const nextPowerLevel = calculatePowerLevel({
    currentPowerLevel,
    isCorrect,
    timeMs: safeTimeMs,
    difficultyTier,
    nextStreak,
    awardedScore,
  });

  // ---- Daily Quests & Skill Points (silent background update) ----
  // هذه العملية لا تؤثر على الاستجابة الأساسية. نُشغّلها بدون تعطيل (fire-and-forget).
  // IMPORTANT: نستخدم adminPb فقط داخل الخادم مع بقاء آليات الأمان الحالية.
  try {
    const questUpdate = updateDailyQuestsOnAnswer({
      dailyQuests: user.daily_quests,
      lastLogin: user.last_login,
      wasCorrect: isCorrect,
      nextStreak,
    });

    if (questUpdate.earnedSkillPoints > 0 || user.last_login !== questUpdate.lastLoginToStore) {
      void adminPb.collection<UserRecord>("users").update(userId, {
        skill_points: Number(user.skill_points ?? 0) + questUpdate.earnedSkillPoints,
        daily_quests: questUpdate.nextDailyQuests as unknown,
        last_login: questUpdate.lastLoginToStore,
      } satisfies Partial<UserRecord>);
    } else {
      // حتى بدون مكافآت، نحدّث daily_quests إذا كان تقدم المهام تغيّر
      void adminPb.collection<UserRecord>("users").update(userId, {
        daily_quests: questUpdate.nextDailyQuests as unknown,
        last_login: questUpdate.lastLoginToStore,
      } satisfies Partial<UserRecord>);
    }
  } catch (error) {
    console.error("[Quest Update Error]:", error);
  }

  // Persist power level, and increment zenkai_boosts when activated
  // IMPORTANT: this is server-side update; user should not be allowed to update power_level directly via rules.
  await adminPb.collection<UserRecord>("users").update(userId, {
    power_level: nextPowerLevel,
    zenkai_boosts: currentZenkaiBoosts + (zenkaiEval.zenkaiActivated ? 1 : 0),

    active_zenkai_multiplier: zenkaiEval.nextZenkai?.multiplier ?? 0,
    zenkai_attempts_left: zenkaiEval.nextZenkai?.remainingAttempts ?? 0,
  } satisfies Partial<UserRecord>);

  // 5) Return minimal safe payload
  // NOTE: correctOption is returned only AFTER answer submission to allow UI to highlight it.
  return {
    isCorrect,
    message: isCorrect ? "إجابة صحيحة! أحسنت." : "إجابة خاطئة. حاول مرة أخرى.",
    newPowerLevel: nextPowerLevel,
    correctOption: q.correct_answer,
  };
}
