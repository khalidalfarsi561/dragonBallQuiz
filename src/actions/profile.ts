"use server";

import { z } from "zod";
import type { UserRecord } from "@/lib/pocketbase";
import { createPBServerClient, syncPBAuthToCookies } from "@/lib/pocketbase";
import { getCloudinary } from "@/lib/cloudinary";

function requireAuthUserId(pb: Awaited<ReturnType<typeof createPBServerClient>>) {
  const userId = pb.authStore.record?.id;
  if (!userId) throw new Error("UNAUTHORIZED");
  return userId;
}

const updateProfileSchema = z.object({
  display_name: z.string().trim().min(3).max(32),
  bio: z.string().trim().max(160).optional().or(z.literal("")),
  show_on_leaderboard: z.boolean().optional(),
  avatar_url: z.string().trim().url().optional().or(z.literal("")),
});

export async function getMyProfile() {
  const pb = await createPBServerClient();
  const userId = requireAuthUserId(pb);

  const record = await pb.collection("users").getOne<UserRecord>(userId);

  return {
    ok: true as const,
    profile: {
      id: record.id,
      username: record.username,
      email: record.email,
      display_name: record.display_name ?? record.username,
      bio: record.bio ?? "",
      avatar_url: record.avatar_url ?? "",
      show_on_leaderboard: record.show_on_leaderboard ?? true,
      power_level: record.power_level,
    },
  };
}

export async function updateMyProfile(input: unknown) {
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, message: "بيانات الملف الشخصي غير صحيحة." };
  }

  const pb = await createPBServerClient();
  const userId = requireAuthUserId(pb);

  // لا نسمح بتحديث حقول حساسة هنا (power_level/skill_points... إلخ)
  // فقط حقول الملف الشخصي.
  await pb.collection("users").update(userId, {
    display_name: parsed.data.display_name,
    bio: parsed.data.bio || "",
    show_on_leaderboard: parsed.data.show_on_leaderboard ?? true,
    avatar_url: parsed.data.avatar_url || "",
  });

  await syncPBAuthToCookies(pb);
  return { ok: true as const, message: "تم حفظ الملف الشخصي." };
}

const uploadAvatarSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z
    .string()
    .regex(/^image\/(png|jpe?g|webp)$/i, "نوع الصورة غير مدعوم."),
  base64: z.string().min(1),
});

/**
 * Upload avatar to Cloudinary and store the secure URL on the user record.
 * - Accepts base64 to avoid edge cases with multipart in server actions.
 * - For production, consider direct unsigned upload from client + signed preset.
 */
export async function uploadMyAvatar(input: unknown) {
  const parsed = uploadAvatarSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, message: "ملف الصورة غير صحيح." };
  }

  const pb = await createPBServerClient();
  const userId = requireAuthUserId(pb);

  const cld = getCloudinary();

  // Cloudinary accepts data URI: data:<mime>;base64,<...>
  const dataUri = `data:${parsed.data.contentType};base64,${parsed.data.base64}`;

  const uploadRes = await cld.uploader.upload(dataUri, {
    folder: "dragonballquiz/avatars",
    public_id: `user_${userId}`,
    overwrite: true,
    resource_type: "image",
    transformation: [
      { width: 256, height: 256, crop: "fill", gravity: "face" },
      { fetch_format: "auto", quality: "auto" },
    ],
  });

  await pb.collection("users").update(userId, {
    avatar_url: uploadRes.secure_url,
  });

  await syncPBAuthToCookies(pb);

  return {
    ok: true as const,
    message: "تم تحديث صورة الأفاتار.",
    avatarUrl: uploadRes.secure_url,
  };
}
