"use server";

import { z } from "zod";
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

/**
 * ---- Rate Limiting (In-Memory / Server Action scope) ----
 * الهدف: منع brute-force / spam clicks (أكثر من إجابة كل ثانيتين لكل مستخدم).
 *
 * ملاحظة: هذا تقييد "أفضل جهد" داخل الذاكرة في بيئة Node runtime.
 * عند التشغيل على Serverless متعدد الـ instances قد يحتاج إلى Redis،
 * لكن هذا يحقق مطلب الحماية الحالي بدون إضافة بنية تحتية إضافية.
 */
const answerRateLimit = new Map<string, number>();
const RATE_LIMIT_WINDOW_MS = 2_000;

function checkAndTouchRateLimit(userId: string) {
  const now = Date.now();
  const last = answerRateLimit.get(userId) ?? 0;

  if (now - last < RATE_LIMIT_WINDOW_MS) {
    return { ok: false as const, message: "أنت سريع جداً، يرجى الانتظار!" };
  }

  answerRateLimit.set(userId, now);

  // تنظيف بسيط لمنع نمو الذاكرة
  // (يعمل بشكل احتمالي عند كل طلب)
  if (answerRateLimit.size > 10_000) {
    for (const [k, ts] of answerRateLimit) {
      if (now - ts > 60_000) answerRateLimit.delete(k);
    }
  }

  return { ok: true as const };
}

const submitAnswerSchema = z.object({
  questionId: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[a-z0-9]+$/i, "معرّف السؤال غير صالح"),
  selectedOption: z.string().min(1).max(512),

  // Optional for power-level feeling (measured client-side later)
  timeMs: z.number().int().min(0).max(120_000).optional(),
});

export async function submitAnswer(
  questionId: string,
  selectedOption: string,
  timeMs?: number
): Promise<{ isCorrect: boolean; message: string; newPowerLevel: number }> {
  // 1) Input Validation (Zod)
  const parsed = submitAnswerSchema.safeParse({ questionId, selectedOption, timeMs });
  if (!parsed.success) {
    return {
      isCorrect: false,
      message: "مدخلات غير صالحة.",
      newPowerLevel: 0,
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
    };
  }

  const userId = pb.authStore.record.id;

  // ---- Rate Limiting (after auth) ----
  const rl = checkAndTouchRateLimit(userId);
  if (!rl.ok) {
    return {
      isCorrect: false,
      message: rl.message,
      newPowerLevel: 0,
    };
  }

  // 3) Admin client (يتجاوز API Rules بأمان داخل الخادم)
  const adminPb = await createPBAdminClient();

  // 4) Compare Answer (NEVER expose correct_answer to client)
  const q = await adminPb
    .collection<QuestionRecord>("questions")
    .getOne(parsed.data.questionId, {
      requestKey: `q_${parsed.data.questionId}_admin`,
    });

  const isCorrect = parsed.data.selectedOption === q.correct_answer;

  // 5) Update leaderboard securely on server (admin)
  let leaderboard: LeaderboardRecord | null = null;

  try {
    leaderboard = await adminPb
      .collection<LeaderboardRecord>("leaderboard")
      .getFirstListItem(`user_id="${userId}"`, { requestKey: `lb_${userId}` });
  } catch {
    leaderboard = null;
  }

  if (!leaderboard) {
    // PocketBase schema uses field name `user_id` (relation) not `user`
    leaderboard = await adminPb.collection<LeaderboardRecord>("leaderboard").create({
      user_id: userId,
      score: 0,
      streak: 0,
    } as unknown as Partial<LeaderboardRecord>);
  }

  // Type-narrowing safety
  const lb = leaderboard;
  if (!lb) {
    // should never happen, but keep strict TS + safety
    return {
      isCorrect: false,
      message: "حدث خطأ غير متوقع. حاول مرة أخرى.",
      newPowerLevel: 0,
    };
  }

  // --- Gamification (server-side) ---
  // Base score can later vary by difficulty, speed, etc.
  const baseScore = 10;

  // Pull user data from DB via admin (to support locked-down rules + zenkai persistence)
  const user = await adminPb.collection<UserRecord>("users").getOne(userId, {
    requestKey: `u_${userId}`,
  });

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

  // Evaluate zenkai activation (with persistence)
  const zenkaiEval = evaluateZenkai({
    wasCorrect: isCorrect,
    prevStreak,
    nextStreak,
    prevConsecutiveWrong: isCorrect ? 0 : 1,
    nextConsecutiveWrong: isCorrect ? 0 : 2,
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
    });
  } else {
    await adminPb.collection<LeaderboardRecord>("leaderboard").update(lb.id, {
      streak: 0,
    });
  }

  // Calculate power level (difficulty from question, time from client if provided)
  const difficultyTier = (q.difficulty_tier ?? 1) as DifficultyTier;
  const safeTimeMs = typeof parsed.data.timeMs === "number" ? parsed.data.timeMs : 10_000;

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
  } catch {
    // تجاهل أي خطأ هنا لضمان عدم كسر submitAnswer
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
  return {
    isCorrect,
    message: isCorrect ? "إجابة صحيحة! أحسنت." : "إجابة خاطئة. حاول مرة أخرى.",
    newPowerLevel: nextPowerLevel,
  };
}
