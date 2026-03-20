"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { getMyProfile, updateMyProfile, uploadMyAvatar } from "@/actions/profile";

type Profile = {
  id: string;
  username: string;
  email: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  show_on_leaderboard: boolean;
  power_level: number;
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result;
      if (typeof res !== "string") return reject(new Error("INVALID_FILE"));
      // "data:image/png;base64,...." -> keep only base64 part
      const comma = res.indexOf(",");
      resolve(comma >= 0 ? res.slice(comma + 1) : res);
    };
    reader.onerror = () => reject(new Error("READ_FAILED"));
    reader.readAsDataURL(file);
  });
}

export default function ProfileClient() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, startSaving] = useTransition();

  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  // form state
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [showOnLeaderboard, setShowOnLeaderboard] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState("");

  // upload state
  const [uploading, startUpload] = useTransition();
  const [avatarPreview, setAvatarPreview] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await getMyProfile();
        if (!mounted) return;
        if (!res.ok) throw new Error("FAILED");

        setProfile(res.profile);
        setDisplayName(res.profile.display_name);
        setBio(res.profile.bio);
        setShowOnLeaderboard(res.profile.show_on_leaderboard);
        setAvatarUrl(res.profile.avatar_url);
        setAvatarPreview(res.profile.avatar_url);
      } catch {
        setError("تعذر تحميل الملف الشخصي.");
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const canSave = useMemo(() => {
    if (!profile) return false;

    const dn = (displayName ?? "").trim();
    const b = (bio ?? "").trim();

    if (dn.length < 3) return false;
    if (dn.length > 32) return false;
    if (b.length > 160) return false;

    return true;
  }, [profile, displayName, bio]);

  const onSave = () => {
    if (!canSave) return;

    setMessage("");
    setError("");

    startSaving(async () => {
      const res = await updateMyProfile({
        display_name: displayName.trim(),
        bio: bio.trim(),
        show_on_leaderboard: showOnLeaderboard,
        avatar_url: avatarUrl.trim(),
      });

      if (!res.ok) {
        setError(res.message);
        return;
      }

      setMessage(res.message);
      // update local snapshot
      setProfile((p) =>
        p
          ? {
              ...p,
              display_name: displayName.trim(),
              bio: bio.trim(),
              show_on_leaderboard: showOnLeaderboard,
              avatar_url: avatarUrl.trim(),
            }
          : p,
      );
    });
  };

  const onPickAvatar = (file: File | null) => {
    if (!file) return;

    setMessage("");
    setError("");

    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowed.includes(file.type)) {
      setError("نوع الصورة غير مدعوم. استخدم PNG/JPG/WebP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("حجم الصورة كبير. الحد الأقصى 2MB.");
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setAvatarPreview(localUrl);

    startUpload(async () => {
      try {
        const base64 = await fileToBase64(file);
        const res = await uploadMyAvatar({
          fileName: file.name,
          contentType: file.type,
          base64,
        });

        if (!res.ok) {
          setError(res.message);
          return;
        }

        setAvatarUrl(res.avatarUrl);
        setAvatarPreview(res.avatarUrl);
        setMessage(res.message);
      } catch {
        setError("تعذر رفع الصورة.");
      }
    });
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-10 text-white/80">
        جاري تحميل الملف الشخصي...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-10 text-white/80">
        {error || "لا يمكن عرض الملف الشخصي."}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 text-white">
      <h1 className="text-2xl font-extrabold">الملف الشخصي</h1>
      <p className="mt-2 text-sm text-white/70">
        عدّل بياناتك وارفع صورة أفاتار. (Power Level:{" "}
        <span className="font-bold">{profile.power_level.toLocaleString("ar")}</span>)
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-5">
            <div className="h-20 w-20 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarPreview || "/vercel.svg"}
                alt="Avatar"
                className="h-full w-full object-cover"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-sm font-bold text-white/80">
                {profile.username} <span className="text-white/50">({profile.email})</span>
              </div>

              <label className="inline-flex cursor-pointer items-center gap-3 text-sm font-semibold">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={(e) => onPickAvatar(e.target.files?.[0] ?? null)}
                  disabled={uploading}
                />
                <span className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 transition hover:bg-white/15">
                  {uploading ? "جاري الرفع..." : "رفع صورة من الجهاز"}
                </span>
                <span className="text-xs text-white/50">PNG/JPG/WebP — 2MB</span>
              </label>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-bold text-white/80">Avatar URL</label>
            <input
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-sky-400/40 focus:ring-2 focus:ring-sky-400/30"
            />
            <p className="mt-2 text-xs text-white/50">
              يتم ملؤه تلقائيًا بعد الرفع إلى Cloudinary. يمكنك تغييره يدويًا أيضًا.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-bold text-white/80">
                الاسم المعروض
              </label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-sky-400/40 focus:ring-2 focus:ring-sky-400/30"
                maxLength={32}
              />
              <p className="mt-2 text-xs text-white/50">3-32 حرف.</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-white/80">نبذة</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="mt-2 min-h-28 w-full resize-y rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-sky-400/40 focus:ring-2 focus:ring-sky-400/30"
                maxLength={160}
              />
              <p className="mt-2 text-xs text-white/50">حتى 160 حرف.</p>
            </div>

            <label className="inline-flex items-center gap-3 text-sm font-semibold">
              <input
                type="checkbox"
                checked={showOnLeaderboard}
                onChange={(e) => setShowOnLeaderboard(e.target.checked)}
              />
              إظهار حسابي في لوحة المتصدرين
            </label>

            <button
              type="button"
              onClick={onSave}
              disabled={!canSave || saving}
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
            </button>

            {message ? (
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-50">
                {message}
              </div>
            ) : null}

            {error ? (
              <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-50">
                {error}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
