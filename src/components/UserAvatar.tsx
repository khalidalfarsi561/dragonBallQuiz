"use client";

import { motion } from "framer-motion";
import Image from "next/image";

type AuraTone = "yellow" | "red" | "blue" | "silver";

function toneFromPowerLevel(powerLevel: number): AuraTone {
  if (powerLevel >= 5_000_000) return "silver";
  if (powerLevel >= 1_200_000) return "blue";
  if (powerLevel >= 300_000) return "red";
  return "yellow";
}

function auraColor(tone: AuraTone) {
  switch (tone) {
    case "silver":
      return {
        particle: "rgba(235,235,255,0.95)",
        particleSoft: "rgba(190,190,255,0.55)",
        glow:
          "bg-[radial-gradient(circle_at_center,rgba(240,240,255,0.95)_0%,rgba(210,210,255,0.40)_35%,rgba(120,120,160,0.00)_70%)]",
        ring:
          "shadow-[0_0_30px_rgba(240,240,255,0.75),0_0_80px_rgba(180,180,255,0.35)]",
      };
    case "blue":
      return {
        particle: "rgba(90,180,255,0.95)",
        particleSoft: "rgba(60,120,255,0.55)",
        glow:
          "bg-[radial-gradient(circle_at_center,rgba(80,160,255,0.95)_0%,rgba(80,160,255,0.45)_35%,rgba(20,60,160,0.00)_70%)]",
        ring:
          "shadow-[0_0_28px_rgba(80,160,255,0.70),0_0_85px_rgba(40,90,255,0.35)]",
      };
    case "red":
      return {
        particle: "rgba(255,110,90,0.95)",
        particleSoft: "rgba(255,140,90,0.55)",
        glow:
          "bg-[radial-gradient(circle_at_center,rgba(255,80,90,0.92)_0%,rgba(255,120,80,0.40)_35%,rgba(150,30,30,0.00)_70%)]",
        ring:
          "shadow-[0_0_28px_rgba(255,80,90,0.65),0_0_80px_rgba(255,140,60,0.28)]",
      };
    default:
      return {
        particle: "rgba(255,235,110,0.95)",
        particleSoft: "rgba(255,175,70,0.55)",
        glow:
          "bg-[radial-gradient(circle_at_center,rgba(255,230,90,0.95)_0%,rgba(255,200,80,0.45)_35%,rgba(120,80,20,0.00)_70%)]",
        ring:
          "shadow-[0_0_28px_rgba(255,230,90,0.65),0_0_80px_rgba(255,160,40,0.25)]",
      };
  }
}

function particleProfile(tone: AuraTone) {
  // يتحكم في الكثافة/السرعة/الحجم حسب المستوى
  switch (tone) {
    case "silver":
      return { count: 10, durationMin: 1.9, durationMax: 2.8, sizeMin: 2, sizeMax: 4, spread: 26 };
    case "blue":
      return { count: 14, durationMin: 1.5, durationMax: 2.2, sizeMin: 2, sizeMax: 5, spread: 30 };
    case "red":
      return { count: 12, durationMin: 1.2, durationMax: 2.0, sizeMin: 2, sizeMax: 5, spread: 28 };
    default:
      return { count: 8, durationMin: 1.0, durationMax: 1.8, sizeMin: 2, sizeMax: 4, spread: 24 };
  }
}

type Particle = {
  id: string;
  x: number; // px
  delay: number; // s
  duration: number; // s
  size: number; // px
  blur: number; // px
  opacity: number;
};

function seededParticles(seed: number, count: number, spread: number): Particle[] {
  // LCG بسيط وثابت لضمان عدم تغيير الجزيئات بين re-renders
  let s = Math.max(1, Math.floor(seed)) % 2147483647;
  const rand = () => {
    s = (s * 48271) % 2147483647;
    return s / 2147483647;
  };

  return Array.from({ length: count }).map((_, i) => {
    const r1 = rand();
    const r2 = rand();
    const r3 = rand();
    const r4 = rand();

    const size = 2 + Math.floor(r1 * 4);
    return {
      id: `${seed}_${i}`,
      x: Math.round((r2 - 0.5) * spread * 2),
      delay: Number((r3 * 1.2).toFixed(2)),
      duration: Number((1.0 + r4 * 1.8).toFixed(2)),
      size,
      blur: Number((0.5 + rand() * 1.8).toFixed(2)),
      opacity: Number((0.35 + rand() * 0.55).toFixed(2)),
    };
  });
}

export default function UserAvatar(props: { src: string; alt: string; powerLevel: number; size?: number }) {
  const { src, alt, powerLevel, size = 96 } = props;

  const tone = toneFromPowerLevel(powerLevel);
  const colors = auraColor(tone);
  const profile = particleProfile(tone);

  // فكّك profile لتفادي تحذيرات React Compiler حول deps قابلة للتعديل
  const { count, spread, sizeMin, sizeMax, durationMin, durationMax } = profile;

  // react-hooks/preserve-manual-memoization:
  // لتفادي تعارض React Compiler مع useMemo هنا، نستخدم توليداً مباشراً
  // (النتيجة ثابتة نسبياً بسبب seed، والجزيئات بعد ذلك تتحرك بـ framer-motion).
  const seed = Math.floor(powerLevel / 2500) + size * 31;
  const particles = seededParticles(seed, count, spread).map((p) => {
    const sizePx = Math.max(sizeMin, Math.min(sizeMax, p.size));
    const duration = Math.max(durationMin, Math.min(durationMax, p.duration));
    return { ...p, size: sizePx, duration };
  });

  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Aura glow layers (still CSS) */}
      <div
        aria-hidden="true"
        className={[
          "absolute inset-0 rounded-full blur-xl",
          colors.glow,
          colors.ring,
          "animate-[auraPulse_1.15s_ease-in-out_infinite]",
        ].join(" ")}
        style={{ width: size + 34, height: size + 34 }}
      />

      <div
        aria-hidden="true"
        className={[
          "absolute inset-0 rounded-full blur-2xl opacity-70",
          colors.glow,
          "animate-[auraFlicker_2.2s_ease-in-out_infinite]",
        ].join(" ")}
        style={{ width: size + 54, height: size + 54 }}
      />

      {/* Particle aura (Framer Motion) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ width: size + 70, height: size + 70 }}
      >
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute left-1/2 top-1/2 rounded-full"
            style={{
              width: p.size,
              height: p.size,
              marginLeft: p.x,
              background: tone === "silver" ? colors.particleSoft : colors.particle,
              filter: `blur(${p.blur}px)`,
              opacity: p.opacity,
            }}
            initial={{ y: 18, scale: 0.9, opacity: 0 }}
            animate={{
              y: [-10, -(size * 0.55) - 18],
              opacity: [0, p.opacity, 0],
              scale: [0.85, 1.0, 0.95],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: "easeOut",
            }}
          />
        ))}
      </div>

      {/* Avatar */}
      <div
        className="relative overflow-hidden rounded-full border border-white/15 bg-white/5"
        style={{ width: size, height: size }}
      >
        <Image src={src} alt={alt} fill sizes={`${size}px`} className="object-cover" priority />
      </div>

      <style>{`
        @keyframes auraPulse {
          0% { transform: scale(0.96); opacity: 0.72; filter: blur(18px); }
          50% { transform: scale(1.06); opacity: 0.95; filter: blur(22px); }
          100% { transform: scale(0.96); opacity: 0.72; filter: blur(18px); }
        }
        @keyframes auraFlicker {
          0%, 100% { transform: scale(1.0); opacity: 0.55; }
          20% { opacity: 0.85; transform: scale(1.03); }
          40% { opacity: 0.65; transform: scale(0.98); }
          60% { opacity: 0.90; transform: scale(1.04); }
          80% { opacity: 0.60; transform: scale(1.01); }
        }
      `}</style>
    </div>
  );
}
