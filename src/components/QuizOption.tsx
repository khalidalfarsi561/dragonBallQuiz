"use client";

import { cn } from "lib/utils";

type QuizOptionProps = {
  option: string;
  stateClass: string;
  isPendingThis: boolean;
  isSelectedThis: boolean;
  feedback: "idle" | "correct" | "wrong";
  disabled: boolean;
  onPick: () => void;
};

export default function QuizOption({
  option,
  stateClass,
  isPendingThis,
  isSelectedThis,
  feedback,
  disabled,
  onPick,
}: QuizOptionProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPick}
      className={cn(
        "relative w-full rounded-lg border px-3 py-2 text-start text-sm font-semibold transition sm:rounded-xl sm:px-4 sm:py-3",
        stateClass,
        "hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
      )}
    >
      <span className="flex items-center justify-between gap-2 sm:gap-3">
        <span className="min-w-0 flex-1 whitespace-normal leading-5 sm:leading-6">{option}</span>

        <span className="flex h-4 w-4 items-center justify-center sm:h-5 sm:w-5">
          {isPendingThis ? (
            <span
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white/80"
              aria-label="جاري الإرسال"
            />
          ) : feedback !== "idle" && isSelectedThis ? (
            <span
              className={cn("text-xs font-extrabold", feedback === "correct" ? "text-emerald-300" : "text-rose-300")}
              aria-hidden="true"
            >
              {feedback === "correct" ? "✓" : "✕"}
            </span>
          ) : null}
        </span>
      </span>
    </button>
  );
}
