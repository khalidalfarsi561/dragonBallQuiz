"use client";

import { useEffect, useRef, useState } from "react";

export default function TimerBadge(props: {
  startedAtMs: number;
  /**
   * Optional: stop updating when answered to avoid extra work.
   * When true, the timer will freeze on the last value.
   */
  stopped?: boolean;
}) {
  const { startedAtMs, stopped = false } = props;

  const timerRef = useRef<number | null>(null);
  // Avoid hydration mismatch: render a deterministic initial value, then update after mount.
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // If stopped, just freeze the current value (no interval).
    if (stopped) return;

    const update = () => {
      const deltaMs = Date.now() - startedAtMs;

      // If startedAtMs is accidentally provided in seconds (epoch seconds),
      // delta becomes ~1.7e12ms and the UI shows huge values like 1774021570s.
      // Detect that case and convert seconds -> ms.
      const startedAtMsFixed = startedAtMs < 10_000_000_000 ? startedAtMs * 1000 : startedAtMs;
      const safeDeltaMs = Date.now() - startedAtMsFixed;

      setElapsedSec(Math.max(0, Math.floor(safeDeltaMs / 1000)));
    };

    // Update immediately on mount to avoid showing 0s for a full second.
    update();

    timerRef.current = window.setInterval(() => {
      update();
    }, 1000);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [startedAtMs, stopped]);

  return (
    <span
      className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-bold text-white/90"
      aria-label={`الوقت: ${elapsedSec} ثانية`}
    >
      {elapsedSec}s
    </span>
  );
}
