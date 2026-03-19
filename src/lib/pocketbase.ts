import "server-only";

import PocketBase from "pocketbase";
import { cookies } from "next/headers";

/**
 * ⚠️ قاعدة أمنية حاسمة:
 * لا تنشئ PocketBase instance على مستوى global/module scope في بيئة SSR.
 * يجب إنشاء instance جديد لكل Request لتفادي تداخل جلسات المستخدمين (SSR cross-contamination).
 */
export async function createPBServerClient() {
  const pb = new PocketBase(process.env.NEXT_PUBLIC_PB_URL);

  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  const cookieString = allCookies.map((c) => `${c.name}=${c.value}`).join("; ");

  pb.authStore.loadFromCookie(cookieString);

  return pb;
}

/**
 * ---- Types (Strict Type-Safety) ----
 * ملاحظة: هذه الواجهات تطابق PocketBase Collections المذكورة في `pocketbase_docs/schema.md`.
 * ننصح باستخدامها في `pb.collection<T>("collectionName")` لتقليل الأخطاء.
 */

export interface UserRecord {
  id: string;

  username: string;
  email: string;

  power_level: number;
  zenkai_boosts: number;
  current_form: string;
}

export interface QuestionRecord {
  id: string;
  collectionId: string;
  collectionName: "questions";
  created: string;
  updated: string;

  content: string;
  options: unknown; // JSON field (نحوّلها لاحقاً إلى string[] عبر Zod في طبقة القراءة)
  correct_answer: string; // لا يُرسل للعميل
  difficulty_tier: number;
}

export interface LeaderboardRecord {
  id: string;
  collectionId: string;
  collectionName: "leaderboard";
  created: string;
  updated: string;

  user: string; // Relation -> Users (record id)
  score: number;
  streak: number;
}
