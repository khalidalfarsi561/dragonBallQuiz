"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

type QuizCardProps = {
  title?: string;
  children: React.ReactNode;

  /**
   * استخدمها لتفعيل حركة الانزلاق (صحيح) أو الاهتزاز (خطأ).
   * يفضّل تغيير القيمة (toggle / increment key) عند كل إجابة.
   */
  feedback?: "idle" | "correct" | "wrong";
};

export default function QuizCard({ title, children, feedback = "idle" }: QuizCardProps) {
  const animate = useMemo(() => {
    if (feedback === "wrong") {
      // Screen shake (spring-ish) + slight rotation for "violent" impact
      return {
        x: [0, -18, 18, -16, 16, -12, 12, -8, 8, 0],
        rotate: [0, -2, 2, -2, 2, -1, 1, 0],
      };
    }

    if (feedback === "correct") {
      // Smooth slide in + gentle scale (keyframes => use tween in transition below)
      return {
        x: [0, 14, 0],
        y: [0, -4, 0],
        scale: [1, 1.02, 1],
      };
    }

    return { x: 0, y: 0, rotate: 0, scale: 1 };
  }, [feedback]);

  const transition = useMemo(() => {
    if (feedback === "wrong") {
      // Keyframes arrays (x/rotate) لا تعمل مع spring (يدعم فقط keyframeين)
      // لذلك نستخدم tween مع مدة قصيرة.
      return {
        type: "tween",
        duration: 0.4,
        ease: "easeOut",
      } as const;
    }

    if (feedback === "correct") {
      // keyframes arrays لا تعمل مع spring (يدعم فقط keyframeين)
      return {
        type: "tween",
        duration: 0.45,
        ease: "easeOut",
      } as const;
    }

    return { duration: 0.15 } as const;
  }, [feedback]);

  return (
    <motion.div
      animate={animate}
      transition={transition}
      className="relative w-full rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg backdrop-blur-md dark:bg-black/20"
    >
      {title ? <h2 className="mb-4 text-lg font-bold text-white">{title}</h2> : null}
      <div className="text-white/90">{children}</div>
    </motion.div>
  );
}
