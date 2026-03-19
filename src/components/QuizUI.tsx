"use client";

import { useEffect, useRef, useState, useTransition } from "react";
/* eslint-disable */
import QuizCard from "@/components/QuizCard";
import Leaderboard from "@/components/Leaderboard";
import SharePowerButton from "@/components/SharePowerButton";
import UserAvatar from "@/components/UserAvatar";
import { submitAnswer } from "@/actions/quiz";

export type PublicQuestion = {
  id: string;
  content: string;
  options: string[];
  difficultyTier: number;
};

type Feedback = "idle" | "correct" | "wrong";

export default function QuizUI(props: {
  question: PublicQuestion | null;
  initialPowerLevel?: number;
  avatarSrc?: string;
}) {
  const { question, avatarSrc = "/vercel.svg", initialPowerLevel = 1_050_000 } = props;

  const [powerLevel, setPowerLevel] = useState<number>(initialPowerLevel);
  const [feedback, setFeedback] = useState<Feedback>("idle");
  const [message, setMessage] = useState<string>("");
  const [pending, startTransition] = useTransition();

  // Client-side timing (used فقط لإحساس السرعة)
  const questionStartRef = useRef<number>(0);

  useEffect(() => {
    // effect is the right place for impure values like Date.now()
    questionStartRef.current = Date.now();
  }, [question?.id]);

  const onPick = (selectedOption: string) => {
    if (!question || pending) return;

    startTransition(async () => {
      const timeMs = Date.now() - questionStartRef.current;
      setMessage("");
      setFeedback("idle");

      try {
        const res = await submitAnswer(question.id, selectedOption, timeMs);

        setFeedback(res.isCorrect ? "correct" : "wrong");
        setMessage(res.message);

        // تحديث محلي بسيط للهالة فوراً (حتى قبل جلب سجل المستخدم الحقيقي)
        // لاحقاً سنجلب power_level الحقيقي من PB بعد كل إجابة.
        setPowerLevel((p) => (res.isCorrect ? p + 50_000 : Math.max(0, p - 10_000)));
      } catch {
        setFeedback("wrong");
        setMessage("تعذر إرسال الإجابة. تأكد من تشغيل PocketBase وتسجيل الدخول.");
      }
    });
  };

  return (
    <div className="flex flex-1 flex-col bg-zinc-950 text-white">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
        <header className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <UserAvatar src={avatarSrc} alt="User" powerLevel={powerLevel} size={84} />
              <div>
                <h1 className="text-xl font-extrabold">اختبار دراغون بول</h1>
                <p className="mt-1 text-sm text-white/70">
                  مستوى طاقتك الحالي:
                  <span className="ms-2 font-[var(--font-ibm-plex-arabic)]">
                    {powerLevel.toLocaleString("ar")}
                  </span>
                </p>
              </div>
            </div>

            <SharePowerButton powerLevel={powerLevel} />
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="flex flex-col gap-4">
            {!question ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70 backdrop-blur-md">
                لا يوجد سؤال متاح حالياً. تأكد من إضافة أسئلة في PocketBase (Collection: questions).
              </div>
            ) : (
              <QuizCard title="سؤال اليوم" feedback={feedback}>
                <p className="mb-4 text-base font-semibold leading-7 text-white">{question.content}</p>

                <div className="grid grid-cols-1 gap-3">
                  {question.options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      disabled={pending}
                      onClick={() => onPick(opt)}
                      className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-start text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                {message ? <p className="mt-4 text-sm text-white/80">{message}</p> : null}
              </QuizCard>
            )}
          </section>

          <Leaderboard />
        </div>
      </main>
    </div>
  );
}
