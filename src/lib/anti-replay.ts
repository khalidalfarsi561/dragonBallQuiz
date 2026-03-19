import "server-only";

import { createHash } from "node:crypto";
import { getKV } from "@/lib/kv";

/**
 * Anti-replay store.
 *
 * Uses a shared KV store (Upstash Redis REST when configured) so it also works
 * across multiple server instances. Falls back to in-memory KV in dev.
 */

function hashKey(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

function nonceKey(userId: string, questionId: string, nonce: string) {
  // Keep KV key length small and non-PII
  return `quiz:nonce:${hashKey(`${userId}:${questionId}:${nonce}`)}`;
}

/**
 * Atomically marks nonce as used (best-effort).
 * - We set a key with TTL up to expiresAtMs.
 * - If key already exists -> reject.
 *
 * NOTE: With REST-only KV, true atomic "set if not exists" depends on provider.
 * For Upstash REST, `SET` has NX options in some SDKs; here we do a safe best-effort:
 * read then set, which is still a big improvement over per-instance memory and
 * good enough for quiz UX.
 */
export async function markNonceUsedOrReject(input: {
  userId: string;
  questionId: string;
  nonce: string;
  expiresAtMs: number;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const now = Date.now();
  const ttlMs = Math.max(0, Math.min(input.expiresAtMs - now, 10 * 60_000)); // cap 10m
  const kv = await getKV();
  const key = nonceKey(input.userId, input.questionId, input.nonce);

  const existing = await kv.get(key);
  if (existing) return { ok: false, reason: "Replay detected" };

  // value doesn't matter; keep minimal
  await kv.set(key, "1", { exMs: ttlMs || 1 });

  return { ok: true };
}
