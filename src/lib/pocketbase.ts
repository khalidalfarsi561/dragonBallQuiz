
import PocketBase from "pocketbase";
import { cookies } from "next/headers";

/**
 * ⚠️ قاعدة أمنية حاسمة:
 * لا تنشئ PocketBase instance على مستوى global/module scope في بيئة SSR.
 * يجب إنشاء instance جديد لكل Request لتفادي تداخل جلسات المستخدمين (SSR cross-contamination).
 */
export async function createPBServerClient() {
  const pb = new PocketBase(process.env.NEXT_PUBLIC_PB_URL);

  // Prevent PocketBase JS SDK auto-cancellation from bubbling as unhandledRejection
  // in Next.js server environment (SSR / RSC / server actions).
  pb.autoCancellation(false);

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
  const cookie = pb.authStore.exportToCookie({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

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
      secure: process.env.NODE_ENV === "production",
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
/**
 * Admin auth caching (in-memory)
 * - Prevents re-auth on every request which can overload PocketBase
 * - In serverless/edge environments, this cache may be short-lived, but still reduces burst load
 *
 * NOTE: Prefer a static Admin API key if your PocketBase version supports it.
 * This project currently authenticates via superuser email/password and caches the token.
 */
let adminAuthCache:
  | {
      token: string;
      // PocketBase `authStore.model` is used only to keep SDK happy; we avoid depending on its shape.
      model: unknown;
      // When we should refresh (ms since epoch)
      expiresAtMs: number;
    }
  | undefined;

// Thundering herd lock: ensures only one admin login happens at a time.
let adminAuthPromise: Promise<PocketBase> | null = null;

function decodeJwtExpMs(token: string): number | undefined {
  // JWT: header.payload.signature (payload is base64url JSON)
  const parts = token.split(".");
  if (parts.length < 2) return undefined;

  try {
    const payloadBase64Url = parts[1];
    const payloadBase64 = payloadBase64Url.replace(/-/g, "+").replace(/_/g, "/");
    // Add padding
    const pad = payloadBase64.length % 4;
    const padded = pad ? payloadBase64 + "=".repeat(4 - pad) : payloadBase64;

    const json =
      typeof atob !== "undefined"
        ? decodeURIComponent(escape(atob(padded)))
        : Buffer.from(padded, "base64").toString("utf8");
    const payload = JSON.parse(json) as { exp?: number };

    if (!payload.exp) return undefined;
    return payload.exp * 1000;
  } catch {
    return undefined;
  }
}

function isAdminCacheValid(nowMs: number) {
  if (!adminAuthCache) return false;
  // Refresh a bit early to avoid edge expiry while processing
  const refreshSkewMs = 30_000;
  return adminAuthCache.expiresAtMs - refreshSkewMs > nowMs;
}

export async function createPBAdminClient() {
  const pbUrl = requireEnv("NEXT_PUBLIC_PB_URL");

  const apiKey = process.env.PB_ADMIN_API_KEY;
  if (apiKey) {
    const pbApiKeyClient = new PocketBase(pbUrl);
    pbApiKeyClient.autoCancellation(false);
    pbApiKeyClient.authStore.save(apiKey, null);
    return pbApiKeyClient;
  }

  const email = requireEnv("PB_ADMIN_EMAIL");
  const password = requireEnv("PB_ADMIN_PASSWORD");

  const nowMs = Date.now();

  // Fast path: valid cache
  if (isAdminCacheValid(nowMs)) {
    const pb = new PocketBase(pbUrl);
    pb.autoCancellation(false);
    pb.authStore.save(adminAuthCache!.token, adminAuthCache!.model as never);
    return pb;
  }

  // Herd lock: if a login is already in progress, await it.
  if (adminAuthPromise) return adminAuthPromise;

  adminAuthPromise = (async () => {
    const pb = new PocketBase(pbUrl);
    pb.autoCancellation(false);

    return pb
      .collection("_superusers")
      .authWithPassword(email, password)
      .then((auth) => {
        const token = pb.authStore.token;
        const expMs = decodeJwtExpMs(token);

        // If we can't decode exp, fall back to a short TTL to reduce auth spam safely.
        const fallbackTtlMs = 5 * 60_000;
        const expiresAtMs = expMs ?? nowMs + fallbackTtlMs;

        adminAuthCache = {
          token,
          model: auth.record ?? pb.authStore.model,
          expiresAtMs,
        };

        adminAuthPromise = null;
        return pb;
      })
      .catch((err) => {
        adminAuthPromise = null;
        throw err;
      });
  })();

  return adminAuthPromise;
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
  consecutive_wrong: number;
}
