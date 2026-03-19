"use client";

import { useState, useTransition } from "react";
import { signIn, signUp } from "@/actions/auth";

type Mode = "signin" | "signup";

export default function AuthModal() {
  const [mode, setMode] = useState<Mode>("signin");
  const [pending, startTransition] = useTransition();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState<string>("");

  const onSubmit = () => {
    setMessage("");

    startTransition(async () => {
      try {
        const res =
          mode === "signin"
            ? await signIn(email, password)
            : await signUp(username, email, password);

        setMessage(res.message);

        if (res.ok) {
          // Refresh server components so page.tsx can see updated cookies/session
          window.location.reload();
        }
      } catch {
        setMessage("حدث خطأ. حاول مرة أخرى.");
      }
    });
  };

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-950 px-6 py-10 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
        <h1 className="text-xl font-extrabold">ابدأ التحدي</h1>
        <p className="mt-1 text-sm text-white/70">سجّل دخولك لتثبيت مستوى طاقتك ولوحة الصدارة.</p>

        <div className="mt-5 flex gap-2 rounded-xl border border-white/10 bg-black/20 p-1">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={[
              "flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition",
              mode === "signin" ? "bg-white/15 text-white" : "text-white/70 hover:text-white",
            ].join(" ")}
          >
            تسجيل الدخول
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={[
              "flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition",
              mode === "signup" ? "bg-white/15 text-white" : "text-white/70 hover:text-white",
            ].join(" ")}
          >
            إنشاء حساب
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {mode === "signup" ? (
            <div>
              <label className="mb-1 block text-xs text-white/70">اسم المستخدم</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm outline-none focus:border-white/25"
                placeholder="مثال: GokuFan"
              />
            </div>
          ) : null}

          <div>
            <label className="mb-1 block text-xs text-white/70">البريد الإلكتروني</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm outline-none focus:border-white/25"
              placeholder="you@example.com"
              inputMode="email"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-white/70">كلمة المرور</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm outline-none focus:border-white/25"
              placeholder="••••••••"
              type="password"
            />
          </div>

          <button
            type="button"
            disabled={pending}
            onClick={onSubmit}
            className="mt-2 w-full rounded-xl bg-white/15 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "..." : mode === "signin" ? "دخول" : "إنشاء حساب"}
          </button>

          {message ? <p className="text-sm text-white/80">{message}</p> : null}

          <p className="text-xs text-white/50">
            ملاحظة: سيتم حفظ الجلسة في Cookies تلقائياً عبر PocketBase/Next.js لتعمل SSR بشكل صحيح.
          </p>
        </div>
      </div>
    </div>
  );
}
