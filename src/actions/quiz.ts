"use server";

import { z } from "zod";
import type { LeaderboardRecord, QuestionRecord, UserRecord } from "@/lib/pocketbase";
import { createPBServerClient } from "@/lib/pocketbase";
import {
  calculatePowerLevel,
  computeAwardedScore,
  evaluateZenkai,
  type DifficultyTier,
  type ZenkaiState,
} from "@/lib/gamification";

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

export async function submitAnswer(questionId: string, selectedOption: string, timeMs?: number) {
  // 1) Input Validation (Zod)
  const parsed = submitAnswerSchema.safeParse({ questionId, selectedOption, timeMs });
  if (!parsed.success) {
    return {
      isCorrect: false,
      message: "مدخلات غير صالحة.",
    };
  }

  // 2) Authentication Verification (Server-side PB client per request)
  const pb = await createPBServerClient();

  if (!pb.authStore.isValid || !pb.authStore.record?.id) {
    return {
      isCorrect: false,
      message: "يجب تسجيل الدخول للإجابة.",
    };
  }

  const userId = pb.authStore.record.id;

  // 3) Compare Answer (NEVER expose correct_answer to client)
  const q = await pb
    .collection<QuestionRecord>("questions")
    .getOne(parsed.data.questionId, {
      // safety: don't expand anything; keep minimal
      requestKey: `q_${parsed.data.questionId}`,
    });

  const isCorrect = parsed.data.selectedOption === q.correct_answer;

  // 4) Update leaderboard securely on server
  // - record per user in leaderboard (enforced by app logic)
  let leaderboard: LeaderboardRecord | null = null;

  try {
    leaderboard = await pb
      .collection<LeaderboardRecord>("leaderboard")
      .getFirstListItem(`user="${userId}"`, { requestKey: `lb_${userId}` });
  } catch {
    leaderboard = null;
  }

  if (!leaderboard) {
    leaderboard = await pb.collection<LeaderboardRecord>("leaderboard").create({
      user: userId,
      score: 0,
      streak: 0,
    } satisfies Partial<LeaderboardRecord>);
  }

  // Type-narrowing safety
  const lb = leaderboard;
  if (!lb) {
    // should never happen, but keep strict TS + safety
    return {
      isCorrect: false,
      message: "حدث خطأ غير متوقع. حاول مرة أخرى.",
    };
  }

  // --- Gamification (server-side) ---
  // Base score can later vary by difficulty, speed, etc.
  const baseScore = 10;

  // Pull user's current power/zenkai fields from auth record (fallbacks)
  // NOTE: We'll keep it defensive; missing fields default to 0.
  const currentPowerLevel = Number((pb.authStore.record as unknown as Partial<UserRecord>)?.power_level ?? 0);
  const currentZenkaiBoosts = Number((pb.authStore.record as unknown as Partial<UserRecord>)?.zenkai_boosts ?? 0);

  // Simple streak transition
  const prevStreak = lb.streak ?? 0;
  const nextStreak = isCorrect ? prevStreak + 1 : 0;

  // For now, we don't persist consecutiveWrong; we infer zenkai activation when streak is lost
  // and we store only the activation count in `zenkai_boosts`.
  const currentZenkai: ZenkaiState | null = null;

  // Evaluate zenkai activation (basic version based on streak loss)
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
    await pb.collection<LeaderboardRecord>("leaderboard").update(lb.id, {
      score: (lb.score ?? 0) + awardedScore,
      streak: nextStreak,
    });
  } else {
    await pb.collection<LeaderboardRecord>("leaderboard").update(lb.id, {
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

  // Persist power level, and increment zenkai_boosts when activated
  // IMPORTANT: this is server-side update; user should not be allowed to update power_level directly via rules.
  await pb.collection<UserRecord>("users").update(userId, {
    power_level: nextPowerLevel,
    zenkai_boosts: currentZenkaiBoosts + (zenkaiEval.zenkaiActivated ? 1 : 0),
  } satisfies Partial<UserRecord>);

  // 5) Return minimal safe payload
  return {
    isCorrect,
    message: isCorrect ? "إجابة صحيحة! أحسنت." : "إجابة خاطئة. حاول مرة أخرى.",
  };
}
