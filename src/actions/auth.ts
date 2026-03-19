"use server";

import { z } from "zod";
import type { UserRecord } from "@/lib/pocketbase";
import { createPBServerClient, syncPBAuthToCookies } from "@/lib/pocketbase";

type NewUserPayload = {
  username: string;
  email: string;
  password: string;
  passwordConfirm: string;

  power_level: number;
  zenkai_boosts: number;
  current_form: string;
  active_zenkai_multiplier: number;
  zenkai_attempts_left: number;
};

const signInSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(6).max(256),
});

const signUpSchema = z.object({
  username: z.string().min(3).max(32),
  email: z.string().email().max(320),
  password: z.string().min(6).max(256),
});

export async function signIn(email: string, password: string) {
  const parsed = signInSchema.safeParse({ email, password });
  if (!parsed.success) return { ok: false, message: "بيانات الدخول غير صحيحة." };

  const pb = await createPBServerClient();

  await pb.collection("users").authWithPassword(parsed.data.email, parsed.data.password);
  await syncPBAuthToCookies(pb);

  return { ok: true, message: "تم تسجيل الدخول بنجاح." };
}

export async function signUp(username: string, email: string, password: string) {
  const parsed = signUpSchema.safeParse({ username, email, password });
  if (!parsed.success) return { ok: false, message: "بيانات التسجيل غير صحيحة." };

  const pb = await createPBServerClient();

  const payload: NewUserPayload = {
    username: parsed.data.username,
    email: parsed.data.email,
    password: parsed.data.password,
    passwordConfirm: parsed.data.password,

    power_level: 0,
    zenkai_boosts: 0,
    current_form: "Base",
    active_zenkai_multiplier: 0,
    zenkai_attempts_left: 0,
  };

  await pb.collection<UserRecord>("users").create(payload as unknown as Partial<UserRecord>);

  await pb.collection("users").authWithPassword(parsed.data.email, parsed.data.password);
  await syncPBAuthToCookies(pb);

  return { ok: true, message: "تم إنشاء الحساب وتسجيل الدخول." };
}

export async function signOut() {
  const pb = await createPBServerClient();
  pb.authStore.clear();
  await syncPBAuthToCookies(pb);
  return { ok: true };
}
