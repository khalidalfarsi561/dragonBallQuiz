import "server-only";

import { z } from "zod";
import type { QuestionRecord } from "@/lib/pocketbase";
import { createPBAdminClient } from "@/lib/pocketbase";
import type { PublicQuestion } from "@/components/QuizUI";
import { createQuizQuestionToken } from "@/lib/quiz-session";
import { dragonBallSeries } from "@/lib/series";

const optionsSchema = z.array(z.string().min(1)).min(2).max(8);

const seriesSlugs = new Set(dragonBallSeries.map((series) => series.slug));

function toPublicQuestion(q: QuestionRecord): PublicQuestion | null {
  const optionsParsed = optionsSchema.safeParse(q.options);
  if (!optionsParsed.success) return null;

  return {
    id: q.id,
    content: q.content,
    options: optionsParsed.data,
    difficultyTier: Number(q.difficulty_tier ?? 1),
  };
}

/**
 * يجلب سؤالاً واحداً بشكل آمن بدون إرسال correct_answer للعميل نهائياً.
 * نستخدم server-only + تحويل للـ PublicQuestion.
 */
/**
 * يجلب سؤالاً واحداً بشكل آمن:
 * - يتم الجلب عبر Superuser client (لأن collection مغلقة عن العامة)
 * - يتم "تعقيم" السجل عبر تحويله إلى PublicQuestion (لا يحتوي correct_answer أصلاً)
 */
export async function getOnePublicQuestion(seriesSlug?: string): Promise<PublicQuestion | null> {
  const pb = await createPBAdminClient();

  const filter =
    seriesSlug && seriesSlugs.has(seriesSlug)
      ? `series_slug = "${seriesSlug}"`
      : "";

  let list;
  try {
    list = await pb.collection<QuestionRecord>("questions").getList(1, 1, {
      sort: "@random",
      filter: filter || undefined,
      requestKey: seriesSlug ? `questions_latest_admin_${seriesSlug}` : "questions_latest_admin",
    });
  } catch (error) {
    console.error("[Question Load Error]:", error);
    return null;
  }

  const first = list.items?.[0];
  if (!first) return null;

  // خطوة أمنية: حتى لو وصل الحقل من PB، لن نُرجعه أبداً للعميل
  // (نحوّل فقط إلى PublicQuestion)
  return toPublicQuestion(first);
}

/**
 * Fetch a question + a server-signed token that binds (userId, questionId, issuedAt).
 * This token must be sent back to `submitAnswer` to:
 * - compute time server-side (no client cheating)
 * - prevent replaying answers for the same question (nonce)
 */
export async function getQuestionForUser(userId: string, seriesSlug?: string): Promise<{ question: PublicQuestion; token: string } | null> {
  const q = await getOnePublicQuestion(seriesSlug);
  if (!q) return null;

  const token = createQuizQuestionToken({ userId, questionId: q.id });
  return { question: q, token };
}
