import "server-only";

import PocketBase from "pocketbase";
import { z } from "zod";
import type { QuestionRecord } from "@/lib/pocketbase";
import type { PublicQuestion } from "@/components/QuizUI";

const optionsSchema = z.array(z.string().min(1)).min(2).max(8);

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
function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

async function createPBAdminClient() {
  const pbUrl = requireEnv("NEXT_PUBLIC_PB_URL");
  const email = requireEnv("PB_ADMIN_EMAIL");
  const password = requireEnv("PB_ADMIN_PASSWORD");

  const pb = new PocketBase(pbUrl);
  await pb.collection("_superusers").authWithPassword(email, password);
  return pb;
}

/**
 * يجلب سؤالاً واحداً بشكل آمن:
 * - يتم الجلب عبر Superuser client (لأن collection مغلقة عن العامة)
 * - يتم "تعقيم" السجل عبر تحويله إلى PublicQuestion (لا يحتوي correct_answer أصلاً)
 */
export async function getOnePublicQuestion(): Promise<PublicQuestion | null> {
  const pb = await createPBAdminClient();

  const list = await pb.collection<QuestionRecord>("questions").getList(1, 1, {
    sort: "-created",
    requestKey: "questions_latest_admin",
  });

  const first = list.items?.[0];
  if (!first) return null;

  // خطوة أمنية: حتى لو وصل الحقل من PB، لن نُرجعه أبداً للعميل
  // (نحوّل فقط إلى PublicQuestion)
  return toPublicQuestion(first);
}
