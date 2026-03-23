"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { updateMyProfile } from "@/actions/profile";
import UserAvatar from "@/components/UserAvatar";

type ProfileClientProps = {
  username: string;
  avatarSrc: string;
  powerLevel: number;
  streak: number;
  questScore: number;
  totalQuestsCompleted: number;
  title: string;
};

const skinOptions = [
  "/avatars/goku-blue.jpg",
  "/avatars/goku-red.jpg",
  "/avatars/goku-black.jpg",
  "/avatars/goku-ultra.jpg",
  "/avatars/goku-ssj1.jpg",
  "/avatars/goku-ssj2.jpg",
  "/avatars/goku-ssj3.jpg",
  "/avatars/goku-ssj4.jpg",
];

export default function ProfileClient({
  username,
  avatarSrc,
  powerLevel,
  streak,
  questScore,
  totalQuestsCompleted,
  title,
}: ProfileClientProps) {
  const [name, setName] = useState(username);
  const [selectedAvatar, setSelectedAvatar] = useState(avatarSrc);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setName(username);
  }, [username]);

  useEffect(() => {
    setSelectedAvatar(avatarSrc);
  }, [avatarSrc]);

  const derivedTitle = useMemo(
    () => `Tier ${Math.max(1, Math.ceil(powerLevel / 1000000))}`,
    [powerLevel],
  );

  const handleSave = () => {
    startTransition(async () => {
      setMessage(null);
      try {
        const result = await updateMyProfile({
          display_name: name.trim(),
          avatar_url: selectedAvatar,
          bio: "",
          show_on_leaderboard: true,
        });

        if (!result.ok) {
          setMessage(result.message ?? "تعذر حفظ الملف الشخصي.");
          return;
        }

        setMessage(result.message);
      } catch {
        setMessage("تعذر الاتصال بالخادم.");
      }
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl border border-white/10 bg-linear-to-r from-sky-500/40 to-violet-500/20 p-6 shadow-2xl shadow-sky-950/30 backdrop-blur-md sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-white/60">
                  الملف الشخصي
                </p>
                <h1 className="mt-2 text-3xl font-black sm:text-4xl">{name}</h1>
                <p className="mt-2 text-sm text-white/70">
                  {title} • {derivedTitle}
                </p>
              </div>

              <div className="mx-auto sm:mx-0">
                <UserAvatar
                  src={selectedAvatar}
                  alt={name}
                  powerLevel={powerLevel}
                  size={112}
                />
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">
                  Power Level
                </p>
                <p className="mt-2 text-2xl font-black">
                  {powerLevel.toLocaleString("ar")}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">
                  Streak
                </p>
                <p className="mt-2 text-2xl font-black">{streak}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">
                  Quests
                </p>
                <p className="mt-2 text-2xl font-black">
                  {totalQuestsCompleted}
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4">
              <label className="text-sm font-semibold text-white/70">
                الاسم
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none ring-0 placeholder:text-white/30 focus:border-sky-400/40 focus:bg-black/30"
                placeholder="اكتب اسمك"
              />
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="rounded-full bg-sky-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "جارٍ الحفظ..." : "حفظ التغييرات"}
              </button>
              {message ? (
                <p className="text-sm text-white/70">{message}</p>
              ) : null}
            </div>
          </section>

          <aside className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md sm:p-8">
            <h2 className="text-lg font-bold">اختيار الأفاتار</h2>
            <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
              {skinOptions.map((src) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setSelectedAvatar(src)}
                  className={[
                    "overflow-hidden rounded-2xl border p-1 transition",
                    selectedAvatar === src
                      ? "border-sky-400 bg-sky-500/10"
                      : "border-white/10 bg-black/20 hover:bg-white/10",
                  ].join(" ")}
                >
                  <div className="relative aspect-square overflow-hidden rounded-xl">
                    <Image
                      src={src}
                      alt="avatar option"
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-8 rounded-2xl border border-white/10 bg-linear-to-r from-sky-500/40 to-violet-500/20 p-4 text-sm text-white/80">
              حافظ على تحديث بياناتك لتظهر في لوحة الشرف.
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
