import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

/**
 * Session token to bind an answer attempt to a specific question and server-time.
 * Prevents:
 * - client-side timeMs cheating
 * - replaying answers for the same question multiple times (anti-replay via nonce)
 *
 * Token format: v1.<base64url(payloadJSON)>.<base64url(hmac)>
 */
export type QuizQuestionTokenPayloadV1 = {
  v: 1;
  userId: string;
  questionId: string;
  issuedAtMs: number;
  expiresAtMs: number;
  nonce: string;
};

function base64UrlEncode(buf: Buffer) {
  return buf
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function base64UrlDecodeToBuffer(s: string) {
  const padLen = (4 - (s.length % 4)) % 4;
  const padded = s + "=".repeat(padLen);
  const b64 = padded.replaceAll("-", "+").replaceAll("_", "/");
  return Buffer.from(b64, "base64");
}

function sign(payloadJson: string) {
  const secret = requireEnv("QUIZ_TOKEN_SECRET");
  return createHmac("sha256", secret).update(payloadJson).digest();
}

export function createQuizQuestionToken(input: {
  userId: string;
  questionId: string;
  ttlMs?: number;
}): string {
  const now = Date.now();
  const ttlMs = Math.min(Math.max(input.ttlMs ?? 5 * 60_000, 5_000), 30 * 60_000);

  const payload: QuizQuestionTokenPayloadV1 = {
    v: 1,
    userId: input.userId,
    questionId: input.questionId,
    issuedAtMs: now,
    expiresAtMs: now + ttlMs,
    nonce: randomBytes(16).toString("hex"),
  };

  const payloadJson = JSON.stringify(payload);
  const payloadPart = base64UrlEncode(Buffer.from(payloadJson, "utf8"));
  const sigPart = base64UrlEncode(sign(payloadJson));

  return `v1.${payloadPart}.${sigPart}`;
}

export function verifyQuizQuestionToken(token: string): {
  ok: true;
  payload: QuizQuestionTokenPayloadV1;
} | { ok: false; reason: string } {
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, reason: "Bad token format" };
  const [v, payloadPart, sigPart] = parts;
  if (v !== "v1") return { ok: false, reason: "Unsupported token version" };

  let payloadJson = "";
  try {
    payloadJson = base64UrlDecodeToBuffer(payloadPart).toString("utf8");
  } catch {
    return { ok: false, reason: "Bad payload encoding" };
  }

  let expectedSig: Buffer;
  try {
    expectedSig = sign(payloadJson);
  } catch {
    return { ok: false, reason: "Missing server secret" };
  }

  let gotSig: Buffer;
  try {
    gotSig = base64UrlDecodeToBuffer(sigPart);
  } catch {
    return { ok: false, reason: "Bad signature encoding" };
  }

  if (gotSig.length !== expectedSig.length) return { ok: false, reason: "Bad signature" };
  if (!timingSafeEqual(gotSig, expectedSig)) return { ok: false, reason: "Bad signature" };

  let payload: QuizQuestionTokenPayloadV1;
  try {
    payload = JSON.parse(payloadJson) as QuizQuestionTokenPayloadV1;
  } catch {
    return { ok: false, reason: "Bad payload json" };
  }

  if (payload.v !== 1) return { ok: false, reason: "Bad payload version" };

  const now = Date.now();
  if (now < payload.issuedAtMs - 30_000) return { ok: false, reason: "Token from the future" };
  if (now > payload.expiresAtMs) return { ok: false, reason: "Token expired" };

  if (!payload.userId || !payload.questionId || !payload.nonce) {
    return { ok: false, reason: "Missing fields" };
  }

  return { ok: true, payload };
}
