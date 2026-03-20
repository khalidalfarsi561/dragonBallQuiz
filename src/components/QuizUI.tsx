"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type React from "react";
import { useRouter } from "next/navigation";
import QuizCard from "@/components/QuizCard";
import TimerBadge from "@/components/TimerBadge";
import SharePowerButton from "@/components/SharePowerButton";
import UserAvatar from "@/components/UserAvatar";
import { submitAnswer } from "@/actions/quiz";

export type PublicQuestion = {
  id: string;
  content: string;
  options: string[];
  difficultyTier: number;

  // Optional explanation shown AFTER the user answers
  explanation?: string;
};

type Feedback = "idle" | "correct" | "wrong";

type OptionState =
  | "idle"
  | "selected"
  | "correct"
  | "revealed-correct"
  | "revealed-wrong";

export default function QuizUI(props: {
  question: PublicQuestion | null;
  questionToken: string | null;

  username: string;
  powerLevel: number;
  avatarSrc?: string;

  leaderboardSlot?: React.ReactNode;
}) {
  const {
    question,
    questionToken,
    username,
    powerLevel: powerLevelProp,
    avatarSrc = "/vercel.svg",
    leaderboardSlot,
  } = props;

  const router = useRouter();

  const [powerLevel, setPowerLevel] = useState<number>(powerLevelProp);
  const [feedback, setFeedback] = useState<Feedback>("idle");
  const [message, setMessage] = useState<string>("");
  const [hasAnswered, setHasAnswered] = useState(false);
  const [pending, startTransition] = useTransition();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [pendingOption, setPendingOption] = useState<string | null>(null);
  const [correctOption, setCorrectOption] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string>("");

  // Client-side timing (used فقط لإحساس السرعة)
  const questionStartRef = useRef<number>(0);

  useEffect(() => {
    // effect is the right place for impure values like Date.now()
    questionStartRef.current = Date.now();
  }, [question?.id]);

  useEffect(() => {
    // keep in sync when server provides updated value after refresh
    setPowerLevel(powerLevelProp);
  }, [powerLevelProp]);

  useEffect(() => {
    // reset selection when question changes
    setSelectedOption(null);
    setPendingOption(null);
    setCorrectOption(null);
    setExplanation("");
    setHasAnswered(false);
    setFeedback("idle");
    setMessage("");
  }, [question?.id]);

  const difficultyLabel = useMemo(() => {
    const tier = question?.difficultyTier ?? 0;
    if (tier <= 1)
      return {
        text: "سهل",
        className: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100",
      };
    if (tier === 2)
      return {
        text: "متوسط",
        className: "border-amber-400/30 bg-amber-500/10 text-amber-100",
      };
    return {
      text: "صعب",
      className: "border-rose-400/30 bg-rose-500/10 text-rose-100",
    };
  }, [question?.difficultyTier]);

  const questionProgress = useMemo(() => {
    // Progress "مبدئي" بدون تغييرات سيرفر:
    // نستخدم اليوم/الأسبوع كإحساس تقدم، ويمكن استبداله لاحقًا بقيم حقيقية (index/total).
    const day = new Date().getDate();
    const total = 30;
    const current = Math.min(Math.max(day, 1), total);
    return { current, total, pct: Math.round((current / total) * 100) };
  }, []);

  const onPick = (opt: string) => {
    if (!question || pending || hasAnswered) return;

    setSelectedOption(opt);
    setPendingOption(opt);
    setHasAnswered(true);

    startTransition(async () => {
      const timeMs = Date.now() - questionStartRef.current;
      setMessage("");
      setFeedback("idle");

      try {
        const res = await submitAnswer(question.id, opt, questionToken, timeMs);

        setFeedback(res.isCorrect ? "correct" : "wrong");
        setMessage(res.message);
        setCorrectOption(res.correctOption || null);
        setExplanation(res.explanation || "");

        // سيتم تحديثه بالقيمة الحقيقية القادمة من الخادم
        setPowerLevel(res.newPowerLevel);
      } catch {
        setHasAnswered(false);
        setFeedback("wrong");
        setMessage(
          "تعذر إرسال الإجابة. تأكد من تشغيل PocketBase وتسجيل الدخول.",
        );
      } finally {
        setPendingOption(null);
      }
    });
  };

  return (
    <div className="flex flex-1 flex-col bg-zinc-950 text-white">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
        <header className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <UserAvatar
                src={avatarSrc}
                alt="User"
                powerLevel={powerLevel}
                size={84}
              />
              <div>
                <h1 className="text-xl font-extrabold">مرحباً {username}</h1>
                <p className="mt-1 text-sm text-white/70">
                  مستوى طاقتك الحالي:
                  <span className="ms-2 font-(--font-ibm-plex-arabic)">
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
                لا يوجد سؤال متاح حالياً. تأكد من إضافة أسئلة في PocketBase
                (Collection: questions).
              </div>
            ) : (
              <QuizCard
                title="سؤال اليوم"
                feedback={feedback}
                headerSlot={
                  <div className="flex items-center gap-2">
                    <span
                      className={[
                        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold",
                        difficultyLabel.className,
                      ].join(" ")}
                      aria-label={`مستوى الصعوبة: ${difficultyLabel.text}`}
                    >
                      {difficultyLabel.text}
                    </span>

                    <TimerBadge
                      startedAtMs={questionStartRef.current}
                      stopped={hasAnswered}
                    />

                    <span
                      className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-bold text-white/90"
                      aria-label={`التقدم: ${questionProgress.current} من ${questionProgress.total}`}
                      title="تقدم مبدئي (سيستبدل لاحقاً بتقدم حقيقي من السيرفر)"
                    >
                      {questionProgress.current}/{questionProgress.total}
                    </span>
                  </div>
                }
              >
                <p className="mb-4 text-base font-semibold leading-7 text-white">
                  {question.content}
                </p>

                <div className="grid grid-cols-1 gap-3">
                  {question.options.map((opt) => {
                    const state: OptionState = !selectedOption
                      ? "idle"
                      : feedback === "idle"
                        ? opt !== selectedOption
                          ? "idle"
                          : "selected"
                        : feedback === "correct"
                          ? opt === selectedOption
                            ? "correct"
                            : "idle"
                          : // feedback === "wrong"
                            opt === correctOption
                            ? "revealed-correct"
                            : opt === selectedOption
                              ? "revealed-wrong"
                              : "idle";

                    const stateClass =
                      state === "correct" || state === "revealed-correct"
                        ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-50"
                        : state === "revealed-wrong"
                          ? "border-rose-400/40 bg-rose-500/15 text-rose-50"
                          : state === "selected"
                            ? "border-sky-400/30 bg-sky-500/10 text-white"
                            : "border-white/10 bg-white/10 text-white";

                    const isPendingThis = pending && pendingOption === opt;
                    const isSelectedThis = opt === selectedOption;

                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={pending || hasAnswered}
                        onClick={() => onPick(opt)}
                        className={[
                          "relative w-full rounded-xl border px-4 py-3 text-start text-sm font-semibold transition",
                          "wrap-break-word",
                          stateClass,
                          "hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
                        ].join(" ")}
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span className="min-w-0 flex-1 whitespace-normal leading-6">
                            {opt}
                          </span>

                          <span className="flex h-5 w-5 items-center justify-center">
                            {isPendingThis ? (
                              <span
                                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white/80"
                                aria-label="جاري الإرسال"
                              />
                            ) : feedback !== "idle" && isSelectedThis ? (
                              <span
                                className={[
                                  "text-xs font-extrabold",
                                  feedback === "correct"
                                    ? "text-emerald-300"
                                    : "text-rose-300",
                                ].join(" ")}
                                aria-hidden="true"
                              >
                                {feedback === "correct" ? "✓" : "✕"}
                              </span>
                            ) : null}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 min-h-10">
                  {message ? (
                    <p className="text-sm text-white/80" aria-live="polite">
                      {message}
                    </p>
                  ) : null}

                  {feedback !== "idle" && explanation ? (
                    <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="mb-1 text-xs font-bold text-white/70">
                        توضيح الإجابة
                      </div>
                      <p className="text-sm leading-7 text-white/85">
                        {explanation}
                      </p>
                    </div>
                  ) : null}
                </div>

                {feedback !== "idle" ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      router.refresh();
                      setSelectedOption(null);
                      setHasAnswered(false);
                      setFeedback("idle");
                      setMessage("");
                    }}
                    className="mt-4 w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                  >
                    السؤال التالي
                  </button>
                ) : null}
              </QuizCard>
            )}
          </section>

          {leaderboardSlot}
        </div>
      </main>
    </div>
  );
}
