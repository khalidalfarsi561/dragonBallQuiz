"use client";

import { useEffect, useMemo, useRef, useReducer, useState, useTransition } from "react";
import type React from "react";
import { useRouter } from "next/navigation";
import QuizCard from "@/components/QuizCard";
import QuizOption from "@/components/QuizOption";
import TimerBadge from "@/components/TimerBadge";
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

type OptionState = "idle" | "selected" | "correct" | "revealed-correct" | "revealed-wrong";

type QuizState = {
  feedback: Feedback;
  message: string;
  hasAnswered: boolean;
  selectedOption: string | null;
  pendingOption: string | null;
  correctOption: string | null;
  explanation: string;
};

type QuizAction =
  | { type: "RESET" }
  | { type: "SELECT_OPTION"; option: string }
  | {
      type: "SUBMIT_SUCCESS";
      payload: {
        isCorrect: boolean;
        message: string;
        correctOption: string | null;
        explanation: string;
      };
    }
  | { type: "SUBMIT_ERROR"; message: string }
  | { type: "CLEAR_PENDING" };

const initialQuizState: QuizState = {
  feedback: "idle",
  message: "",
  hasAnswered: false,
  selectedOption: null,
  pendingOption: null,
  correctOption: null,
  explanation: "",
};

function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case "RESET":
      return initialQuizState;
    case "SELECT_OPTION":
      return {
        ...state,
        selectedOption: action.option,
        pendingOption: action.option,
        hasAnswered: true,
        message: "",
        feedback: "idle",
      };
    case "SUBMIT_SUCCESS":
      return {
        ...state,
        feedback: action.payload.isCorrect ? "correct" : "wrong",
        message: action.payload.message,
        correctOption: action.payload.correctOption,
        explanation: action.payload.explanation,
      };
    case "SUBMIT_ERROR":
      return {
        ...state,
        hasAnswered: false,
        feedback: "wrong",
        message: action.message,
      };
    case "CLEAR_PENDING":
      return {
        ...state,
        pendingOption: null,
      };
    default:
      return state;
  }
}

export default function QuizUI(props: {
  question: PublicQuestion | null;
  questionToken: string | null;
  seriesSlug?: string;

  username: string;
  powerLevel: number;
  avatarSrc?: string;

  leaderboardSlot?: React.ReactNode;
}) {
  const {
    question,
    questionToken,
    seriesSlug,
    username,
    powerLevel: powerLevelProp,
    avatarSrc = "/vercel.svg",
    leaderboardSlot,
  } = props;

  const router = useRouter();

  const [powerLevel, setPowerLevel] = useState<number>(powerLevelProp);
  const [state, dispatch] = useReducer(quizReducer, initialQuizState);
  const [pending, startTransition] = useTransition();

  // Client-side timing (used فقط لإحساس السرعة)
  const questionStartRef = useRef<number>(0);
  const [questionStartMs, setQuestionStartMs] = useState<number>(0);

  useEffect(() => {
    // effect is the right place for impure values like Date.now()
    const start = Date.now();
    questionStartRef.current = start;
    setQuestionStartMs(start);
  }, [question?.id]);

  useEffect(() => {
    // keep in sync when server provides updated value after refresh
    setPowerLevel(powerLevelProp);
  }, [powerLevelProp]);

  useEffect(() => {
    // reset selection when question changes
    dispatch({ type: "RESET" });
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
    // Progress مبدئي بدون تغييرات سيرفر:
    // نستخدم اليوم/الأسبوع كإحساس تقدم، ويمكن استبداله لاحقًا
    const day = new Date().getDate();
    const total = 30;
    const current = Math.min(Math.max(day, 1), total);
    return { current, total, pct: Math.round((current / total) * 100) };
  }, []);

  const onPick = (opt: string) => {
    if (!question || pending || state.hasAnswered) return;

    dispatch({ type: "SELECT_OPTION", option: opt });

    startTransition(async () => {
      const timeMs = Date.now() - questionStartMs;
      dispatch({ type: "CLEAR_PENDING" });

      try {
        const res = await submitAnswer(seriesSlug ?? "dragon-ball", question.id, opt, questionToken, timeMs);

        dispatch({
          type: "SUBMIT_SUCCESS",
          payload: {
            isCorrect: res.isCorrect,
            message: res.message,
            correctOption: res.correctOption || null,
            explanation: res.explanation || "",
          },
        });

        // سيتم تحديثه بالقيمة الحقيقية القادمة من الخادم
        setPowerLevel(res.newPowerLevel);
      } catch {
        dispatch({
          type: "SUBMIT_ERROR",
          message: "تعذر إرسال الإجابة. تأكد من تشغيل PocketBase وتسجيل الدخول.",
        });
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
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-xl font-extrabold">مرحباً {username}</h1>
                  <a
                    href="/profile"
                    className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold text-white/80 transition hover:bg-white/15"
                  >
                    الملف الشخصي
                  </a>
                </div>
                <p className="mt-1 text-sm text-white/70">
                  مستوى طاقتك الحالي:
                  <span className="ms-2 font-(--font-ibm-plex-arabic)">{powerLevel.toLocaleString("ar")}</span>
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-1 justify-center">
          <section className="flex w-full max-w-5xl flex-col gap-4">
            {!question ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70 backdrop-blur-md">
                لا يوجد سؤال متاح حالياً. تأكد من إضافة أسئلة في PocketBase (Collection: questions).
              </div>
            ) : (
              <QuizCard
                key={question.id}
                title="سؤال اليوم"
                feedback={state.feedback}
                headerSlot={
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={[
                        "inline-flex items-center rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-bold sm:px-2.5 sm:py-1 sm:text-xs",
                        difficultyLabel.className,
                      ].join(" ")}
                      aria-label={`مستوى الصعوبة: ${difficultyLabel.text}`}
                    >
                      {difficultyLabel.text}
                    </span>

                    <TimerBadge startedAtMs={questionStartMs} stopped={state.hasAnswered} />

                    <span
                      className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-white/90 sm:px-2.5 sm:py-1 sm:text-xs"
                      aria-label={`التقدم: ${questionProgress.current} من ${questionProgress.total}`}
                      title="تقدم مبدئي (سيستبدل لاحقاً بتقدم حقيقي من السيرفر)"
                    >
                      {questionProgress.current}/{questionProgress.total}
                    </span>
                  </div>
                }
              >
                <p className="mb-3 text-sm font-extrabold leading-6 text-white sm:mb-4 sm:text-[1.05rem] sm:leading-8">
                  {question.content}
                </p>

                <div className="grid grid-cols-1 gap-2 sm:gap-3">
                  {question.options.map((opt) => {
                    const stateClass =
                      !state.selectedOption
                        ? "border-white/10 bg-white/10 text-white"
                        : state.feedback === "idle"
                          ? opt !== state.selectedOption
                            ? "border-white/10 bg-white/10 text-white"
                            : "border-sky-400/30 bg-sky-500/10 text-white"
                          : state.feedback === "correct"
                            ? opt === state.selectedOption
                              ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-50"
                              : "border-white/10 bg-white/10 text-white"
                            : opt === state.correctOption
                              ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-50"
                              : opt === state.selectedOption
                                ? "border-rose-400/40 bg-rose-500/15 text-rose-50"
                                : "border-white/10 bg-white/10 text-white";

                    const isPendingThis = pending && state.pendingOption === opt;
                    const isSelectedThis = opt === state.selectedOption;

                    return (
                      <QuizOption
                        key={opt}
                        option={opt}
                        stateClass={stateClass}
                        isPendingThis={isPendingThis}
                        isSelectedThis={isSelectedThis}
                        feedback={state.feedback}
                        disabled={pending || state.hasAnswered}
                        onPick={() => onPick(opt)}
                      />
                    );
                  })}
                </div>

                <div className="mt-4 min-h-10">
                  {state.message ? (
                    <p className="text-sm text-white/80" aria-live="polite">
                      {state.message}
                    </p>
                  ) : null}

                  {state.feedback !== "idle" && state.explanation ? (
                    <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <div className="text-xs font-bold text-white/70">توضيح الإجابة</div>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-white/70">
                          {state.feedback === "correct" ? "✓" : "✕"}
                        </span>
                      </div>
                      <p className="text-sm leading-7 text-white/85">{state.explanation}</p>
                    </div>
                  ) : null}
                </div>

                {state.feedback !== "idle" ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      router.refresh();
                      dispatch({ type: "RESET" });
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
