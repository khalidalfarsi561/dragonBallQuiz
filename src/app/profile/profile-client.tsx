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
      <div className="mx-auto w-full max-w-4xl px-6 py-12">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-white/80 backdrop-blur-md">
          جاري تحميل الملف الشخصي...
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto w-full max-w-4xl px-6 py-12">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-white/80 backdrop-blur-md">
          {error || "لا يمكن عرض الملف الشخصي."}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* background glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute -bottom-40 right-10 h-96 w-96 rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>

      <div className="mx-auto w-full max-w-4xl px-6 py-12 text-white">
        {/* header / hero */}
        <div className="rounded-3xl border border-white/10 bg-linear-to-b from-white/10 to-white/5 p-6 backdrop-blur-md md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
                الملف الشخصي
              </h1>
              <p className="mt-2 text-sm text-white/70">
                عدّل بياناتك وارفع صورة أفاتار تعكس إنجازك.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm">
                  <span className="text-white/60">Power Level</span>{" "}
                  <span className="font-extrabold">
                    {profile.power_level.toLocaleString("ar")}
                  </span>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white/80">
                  {profile.username}{" "}
                  <span className="text-white/50">({profile.email})</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute -inset-1 rounded-3xl bg-linear-to-rrom-sky-500/40 to-fuchsia-500/30 blur" />
                <div className="relative h-24 w-24 overflow-hidden rounded-3xl border border-white/10 bg-black/30">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={avatarPreview || "/vercel.svg"}
                    alt="Avatar"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>

              <label className="group inline-flex cursor-pointer flex-col gap-2 text-sm font-semibold">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={(e) => onPickAvatar(e.target.files?.[0] ?? null)}
                  disabled={uploading}
                />
                <span className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 transition group-hover:bg-white/15">
                  {uploading ? "جاري الرفع..." : "رفع صورة"}
                </span>
                <span className="text-xs text-white/50">PNG/JPG/WebP — 2MB</span>
              </label>
            </div>
          </div>
        </div>

        {/* content */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* left: avatar url + preferences */}
          <div className="space-y-6 lg:col-span-1">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-extrabold text-white/90">الإعدادات</h2>
                <span className="text-xs text-white/50">الخصوصية</span>
              </div>

              <label className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm">
                <span className="font-semibold text-white/80">
                  إظهار حسابي في لوحة المتصدرين
                </span>
                <input
                  type="checkbox"
                  checked={showOnLeaderboard}
                  onChange={(e) => setShowOnLeaderboard(e.target.checked)}
                  className="h-4 w-4 accent-sky-400"
                />
              </label>

              <p className="mt-3 text-xs text-white/50">
                يمكنك إخفاء ظهورك في لوحة المتصدرين مع بقاء تقدمك محفوظًا.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
              <h2 className="text-sm font-extrabold text-white/90">Avatar URL</h2>
              <p className="mt-1 text-xs text-white/50">
                يُملأ تلقائيًا بعد الرفع إلى Cloudinary (ويمكن تعديله يدويًا).
              </p>
              <input
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
                className="mt-4 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-sky-400/40 focus:ring-2 focus:ring-sky-400/30"
              />
            </div>
          </div>

          {/* right: main form */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md lg:col-span-2">
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-extrabold text-white/95">
                معلومات الحساب
              </h2>
              <p className="text-xs text-white/50">
                اجعل ملفك مرتبًا—الاسم المختصر والنبذة الجميلة تعطي انطباعًا احترافيًا.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-bold text-white/80">
                    الاسم المعروض
                  </label>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-sky-400/40 focus:ring-2 focus:ring-sky-400/30"
                    maxLength={32}
                  />
                  <p className="mt-2 text-xs text-white/50">3-32 حرف.</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs text-white/50">حالة الحفظ</div>
                  <div className="mt-1 text-sm font-semibold text-white/80">
                    {saving ? "جاري الحفظ..." : canSave ? "جاهز للحفظ" : "تحقق من البيانات"}
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className={[
                        "h-full rounded-full bg-linear-to-r from-sky-400 to-fuchsia-400 transition-all",
                        saving ? "w-2/3 animate-pulse" : canSave ? "w-full" : "w-1/3",
                      ].join(" ")}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-white/80">نبذة</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="mt-2 min-h-32 w-full resize-y rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-sky-400/40 focus:ring-2 focus:ring-sky-400/30"
                  maxLength={160}
                />
                <div className="mt-2 flex items-center justify-between text-xs text-white/50">
                  <span>حتى 160 حرف.</span>
                  <span>{(bio ?? "").length}/160</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onSave}
                disabled={!canSave || saving}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-linear-to-r from-sky-500/30 to-fuchsia-500/20 px-4 py-3 text-center text-sm font-extrabold text-white transition hover:from-sky-500/40 hover:to-fuchsia-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
              </button>

              {message ? (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-50">
                  {message}
                </div>
              ) : null}

              {error ? (
                <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-50">
                  {error}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
