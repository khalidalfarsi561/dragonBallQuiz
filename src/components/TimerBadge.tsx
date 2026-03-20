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

    // First update happens on the first interval tick.
    timerRef.current = window.setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedAtMs) / 1000));
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
