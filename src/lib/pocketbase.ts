
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
 * Persist PB auth state back to Next.js cookies (for SSR / Server Actions).
 * Use after authWithPassword / create, etc.
 */
export async function syncPBAuthToCookies(pb: PocketBase) {
  const cookieStore = await cookies();
  const cookie = pb.authStore.exportToCookie({ httpOnly: true, secure: false, sameSite: "lax", path: "/" });

  // PocketBase may return multiple Set-Cookie lines separated by "\n"
  const parts = cookie.split("\n").map((s) => s.trim()).filter(Boolean);

  for (const part of parts) {
    const [pair] = part.split(";");
    const eq = pair.indexOf("=");
    if (eq === -1) continue;

    const name = pair.slice(0, eq);
    const value = pair.slice(eq + 1);

    cookieStore.set(name, value, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
    });
  }
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

  // Zenkai persistence (stored in DB)
  active_zenkai_multiplier: number;
  zenkai_attempts_left: number;

  // --- RPG / Skill Tree / Daily Quests ---
  skill_points: number;

  /**
   * JSON field:
   * مثال: ["kamehameha", "instant_transmission"]
   */
  unlocked_skills: unknown;

  /**
   * JSON field:
   * مثال: { "date": "2026-03-20", "quests": [...] }
   */
  daily_quests: unknown;

  /**
   * Text field (YYYY-MM-DD) لتتبع تسجيل الدخول اليومي.
   */
  last_login: string;
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

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

/**
 * Superuser/Admin PB client (Server-only)
 * - يستخدم فقط داخل Server Actions/Server Components لتنفيذ عمليات خلفية تتجاوز API Rules
 * - لا يتم تمريره أبداً للعميل
 */
export async function createPBAdminClient() {
  const pbUrl = requireEnv("NEXT_PUBLIC_PB_URL");
  const email = requireEnv("PB_ADMIN_EMAIL");
  const password = requireEnv("PB_ADMIN_PASSWORD");

  const pb = new PocketBase(pbUrl);
  await pb.collection("_superusers").authWithPassword(email, password);

  return pb;
}

export interface LeaderboardRecord {
  id: string;
  collectionId: string;
  collectionName: "leaderboard";
  created: string;
  updated: string;

  user_id: string; // Relation -> Users (record id)
  score: number;
  streak: number;
}
