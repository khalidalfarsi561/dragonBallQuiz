"use server";

import { z } from "zod";
import { getKV } from "@/lib/kv";
import { AppError, formatQuizErrorResponse } from "@/lib/errors";
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
import { dragonBallSeries } from "@/lib/series";

/**
 * ---- Rate Limiting ----
 * هدف: منع brute-force / spam clicks.
 *
 * Uses shared KV when configured (Upstash Redis REST), falls back to in-memory KV in dev.
 */
const RATE_LIMIT_WINDOW_MS = 800;

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

const seriesSlugs = new Set(dragonBallSeries.map((series) => series.slug));

const submitAnswerSchema = z.object({
  seriesSlug: z
    .string()
    .min(1)
    .max(64)
    .refine((value) => seriesSlugs.has(value), "السلسلة غير صالحة"),
  questionId: z.string()
    .min(1)
    .max(128)
    .regex(/^[a-z0-9]+$/i, "معرّف السؤال غير صالح"),
  selectedOption: z.string().min(1).max(512),

  // Server-signed token: binds questionId + issuedAt to prevent time cheating + replay
  questionToken: z.string().min(10).max(4096),

  // Optional: client-side only (UX). We DO NOT trust it for scoring.
  timeMs: z.number().int().min(0).max(120_000).optional(),
});

type SubmitAnswerSuccess = {
  isCorrect: boolean;
  message: string;
  newPowerLevel: number;
  correctOption: string;
  explanation: string;
};

type QuizTokenPayload = {
  userId: string;
  questionId: string;
  nonce: string;
  issuedAtMs: number;
  expiresAtMs: number;
};

type ValidateQuizSecurityResult = {
  tokenPayload: QuizTokenPayload;
};

type ProcessGamificationResult = {
  nextPowerLevel: number;
  awardedScore: number;
  nextStreak: number;
  currentZenkaiBoosts: number;
  zenkaiActivated: boolean;
  nextZenkai: ZenkaiState | null;
};

type ZenkaiPersistenceData = Pick<
  ProcessGamificationResult,
  "currentZenkaiBoosts" | "zenkaiActivated" | "nextZenkai"
>;

type LeaderboardCreatePayload = Omit<
  LeaderboardRecord,
  "id" | "collectionId" | "collectionName" | "created" | "updated"
>;

function getQuestionExplanation(questionRecord: QuestionRecord) {
  return String((questionRecord as unknown as { explanation?: unknown }).explanation ?? "");
}

async function validateQuizSecurity(
  userId: string,
  questionId: string,
  questionToken: string
): Promise<ValidateQuizSecurityResult> {
  const tokenCheck = verifyQuizQuestionToken(questionToken);

  if (!tokenCheck.ok) {
    throw new AppError("انتهت صلاحية السؤال أو أن الطلب غير صالح.", 400, "INVALID_QUESTION_TOKEN");
  }

  if (tokenCheck.payload.userId !== userId || tokenCheck.payload.questionId !== questionId) {
    throw new AppError("طلب غير مصرح به.", 403, "UNAUTHORIZED_QUESTION_REQUEST");
  }

  const replay = await markNonceUsedOrReject({
    userId,
    questionId,
    nonce: tokenCheck.payload.nonce,
    expiresAtMs: tokenCheck.payload.expiresAtMs,
  });

  if (!replay.ok) {
    throw new AppError("تم إرسال هذه الإجابة مسبقاً (محاولة مكررة).", 409, "REPLAY_REJECTED");
  }

  const rl = await checkAndTouchRateLimit(userId);

  if (!rl.ok) {
    throw new AppError(rl.message, 429, "RATE_LIMITED");
  }

  return {
    tokenPayload: tokenCheck.payload as QuizTokenPayload,
  };
}

async function processGamificationAndLeaderboard(
  adminPb: Awaited<ReturnType<typeof createPBAdminClient>>,
  userId: string,
  questionRecord: QuestionRecord,
  isCorrect: boolean,
  safeTimeMs: number
): Promise<ProcessGamificationResult> {
  let leaderboard: LeaderboardRecord | null = null;

  try {
    leaderboard = await adminPb.collection<LeaderboardRecord>("leaderboard").getFirstListItem(`user_id="${userId}"`);
  } catch {
    leaderboard = null;
  }

  if (!leaderboard) {
    const createPayload: LeaderboardCreatePayload = {
      user_id: userId,
      score: 0,
      streak: 0,
      consecutive_wrong: 0,
    };

    leaderboard = await adminPb.collection<LeaderboardRecord>("leaderboard").create(createPayload);
  }

  if (!leaderboard) {
    throw new AppError("حدث خطأ غير متوقع. حاول مرة أخرى.", 500, "LEADERBOARD_INIT_FAILED");
  }

  const userRecord = await adminPb.collection<UserRecord>("users").getOne(userId);

  const currentPowerLevel = Number(userRecord.power_level ?? 0);
  const currentZenkaiBoosts = Number(userRecord.zenkai_boosts ?? 0);

  const currentZenkai: ZenkaiState | null =
    Number(userRecord.zenkai_attempts_left ?? 0) > 0
      ? {
          multiplier: Number(userRecord.active_zenkai_multiplier ?? 0),
          remainingAttempts: Number(userRecord.zenkai_attempts_left ?? 0),
        }
      : null;

  const prevStreak = leaderboard.streak ?? 0;
  const nextStreak = isCorrect ? prevStreak + 1 : 0;

  const prevConsecutiveWrong = leaderboard.consecutive_wrong ?? 0;
  const nextConsecutiveWrong = isCorrect ? 0 : prevConsecutiveWrong + 1;

  const zenkaiEval = evaluateZenkai({
    wasCorrect: isCorrect,
    prevStreak,
    nextStreak,
    prevConsecutiveWrong,
    nextConsecutiveWrong,
    currentZenkai,
  });

  const baseScore = 10;
  const awardedScore = computeAwardedScore({
    baseScore,
    zenkai: zenkaiEval.nextZenkai,
  });

  if (isCorrect) {
    await adminPb.collection<LeaderboardRecord>("leaderboard").update(leaderboard.id, {
      score: (leaderboard.score ?? 0) + awardedScore,
      streak: nextStreak,
      consecutive_wrong: nextConsecutiveWrong,
    });
  } else {
    await adminPb.collection<LeaderboardRecord>("leaderboard").update(leaderboard.id, {
      streak: 0,
      consecutive_wrong: nextConsecutiveWrong,
    });
  }

  const difficultyTier = (questionRecord.difficulty_tier ?? 1) as DifficultyTier;

  const nextPowerLevel = calculatePowerLevel({
    currentPowerLevel,
    isCorrect,
    timeMs: safeTimeMs,
    difficultyTier,
    nextStreak,
    awardedScore,
  });

  return {
    nextPowerLevel,
    awardedScore,
    nextStreak,
    currentZenkaiBoosts,
    zenkaiActivated: zenkaiEval.zenkaiActivated,
    nextZenkai: zenkaiEval.nextZenkai,
  };
}

async function updateUserStatsAndQuests(
  adminPb: Awaited<ReturnType<typeof createPBAdminClient>>,
  userRecord: UserRecord,
  isCorrect: boolean,
  nextStreak: number,
  nextPowerLevel: number,
  zenkaiData: ZenkaiPersistenceData
): Promise<void> {
  try {
    const questUpdate = updateDailyQuestsOnAnswer({
      dailyQuests: userRecord.daily_quests,
      lastLogin: userRecord.last_login,
      wasCorrect: isCorrect,
      nextStreak,
    });

    if (questUpdate.earnedSkillPoints > 0 || userRecord.last_login !== questUpdate.lastLoginToStore) {
      await adminPb.collection<UserRecord>("users").update(userRecord.id, {
        skill_points: Number(userRecord.skill_points ?? 0) + questUpdate.earnedSkillPoints,
        daily_quests: questUpdate.nextDailyQuests as unknown,
        last_login: questUpdate.lastLoginToStore,
      } satisfies Partial<UserRecord>);
    } else {
      await adminPb.collection<UserRecord>("users").update(userRecord.id, {
        daily_quests: questUpdate.nextDailyQuests as unknown,
        last_login: questUpdate.lastLoginToStore,
      } satisfies Partial<UserRecord>);
    }

    await adminPb.collection<UserRecord>("users").update(userRecord.id, {
      power_level: nextPowerLevel,
      zenkai_boosts: zenkaiData.currentZenkaiBoosts + (zenkaiData.zenkaiActivated ? 1 : 0),
      active_zenkai_multiplier: zenkaiData.nextZenkai?.multiplier ?? 0,
      zenkai_attempts_left: zenkaiData.nextZenkai?.remainingAttempts ?? 0,
    } satisfies Partial<UserRecord>);
  } catch (error) {
    console.error("[User Stats / Quest Update Error]:", error);
  }
}

export async function submitAnswer(
  seriesSlug: string,
  questionId: string,
  selectedOption: string,
  questionToken: string | null,
  timeMs?: number
): Promise<SubmitAnswerSuccess> {
  try {
    const parsed = submitAnswerSchema.safeParse({ seriesSlug, questionId, selectedOption, questionToken, timeMs });

    if (!parsed.success) {
      throw new AppError("مدخلات غير صالحة.", 400, "INVALID_INPUT");
    }

    const pb = await createPBServerClient();

    if (!pb.authStore.isValid || !pb.authStore.record?.id) {
      throw new AppError("يجب تسجيل الدخول للإجابة.", 401, "UNAUTHENTICATED");
    }

    const userId = pb.authStore.record.id;

    const { tokenPayload } = await validateQuizSecurity(userId, parsed.data.questionId, parsed.data.questionToken);

    const adminPb = await createPBAdminClient();
    const questionRecord = await adminPb.collection<QuestionRecord>("questions").getOne(parsed.data.questionId);

    const isCorrect = parsed.data.selectedOption === questionRecord.correct_answer;
    const safeTimeMs = Math.min(Math.max(Date.now() - tokenPayload.issuedAtMs, 0), 120_000);

    if (safeTimeMs > 45_000) {
      const userRecord = await adminPb.collection<UserRecord>("users").getOne(userId);

      return {
        isCorrect: false,
        message: "انتهى وقت الإجابة",
        newPowerLevel: Number(userRecord.power_level ?? 0),
        correctOption: questionRecord.correct_answer,
        explanation: getQuestionExplanation(questionRecord),
      };
    }

    const gamificationResult = await processGamificationAndLeaderboard(
      adminPb,
      userId,
      questionRecord,
      isCorrect,
      safeTimeMs
    );

    const userRecord = await adminPb.collection<UserRecord>("users").getOne(userId);

    void updateUserStatsAndQuests(
      adminPb,
      userRecord,
      isCorrect,
      gamificationResult.nextStreak,
      gamificationResult.nextPowerLevel,
      {
        currentZenkaiBoosts: gamificationResult.currentZenkaiBoosts,
        zenkaiActivated: gamificationResult.zenkaiActivated,
        nextZenkai: gamificationResult.nextZenkai,
      }
    );

    return {
      isCorrect,
      message: isCorrect ? "إجابة صحيحة! أحسنت." : "إجابة خاطئة. حاول مرة أخرى.",
      newPowerLevel: gamificationResult.nextPowerLevel,
      correctOption: questionRecord.correct_answer,
      explanation: getQuestionExplanation(questionRecord),
    };
  } catch (error) {
    return formatQuizErrorResponse(error);
  }
}
