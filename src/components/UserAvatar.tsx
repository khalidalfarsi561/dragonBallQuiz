"use client";

import Image from "next/image";

type AuraTone = "yellow" | "red" | "blue" | "silver";

function toneFromPowerLevel(powerLevel: number): AuraTone {
  if (powerLevel >= 5_000_000) return "silver";
  if (powerLevel >= 1_200_000) return "blue";
  if (powerLevel >= 300_000) return "red";
  return "yellow";
}

function auraClasses(tone: AuraTone) {
  // Tailwind-only aura:
  // - radial gradients via arbitrary values
  // - blur + box-shadow
  // - subtle pulsing animation (inline keyframes via arbitrary animate)
  switch (tone) {
    case "silver":
      return {
        glow:
          "bg-[radial-gradient(circle_at_center,rgba(240,240,255,0.95)_0%,rgba(210,210,255,0.40)_35%,rgba(120,120,160,0.00)_70%)]",
        ring:
          "shadow-[0_0_30px_rgba(240,240,255,0.75),0_0_80px_rgba(180,180,255,0.35)]",
      };
    case "blue":
      return {
        glow:
          "bg-[radial-gradient(circle_at_center,rgba(80,160,255,0.95)_0%,rgba(80,160,255,0.45)_35%,rgba(20,60,160,0.00)_70%)]",
        ring:
          "shadow-[0_0_28px_rgba(80,160,255,0.70),0_0_85px_rgba(40,90,255,0.35)]",
      };
    case "red":
      return {
        glow:
          "bg-[radial-gradient(circle_at_center,rgba(255,80,90,0.92)_0%,rgba(255,120,80,0.40)_35%,rgba(150,30,30,0.00)_70%)]",
        ring:
          "shadow-[0_0_28px_rgba(255,80,90,0.65),0_0_80px_rgba(255,140,60,0.28)]",
      };
    default:
      return {
        glow:
          "bg-[radial-gradient(circle_at_center,rgba(255,230,90,0.95)_0%,rgba(255,200,80,0.45)_35%,rgba(120,80,20,0.00)_70%)]",
        ring:
          "shadow-[0_0_28px_rgba(255,230,90,0.65),0_0_80px_rgba(255,160,40,0.25)]",
      };
  }
}

export default function UserAvatar(props: {
  src: string;
  alt: string;
  powerLevel: number;
  size?: number;
}) {
  const { src, alt, powerLevel, size = 96 } = props;

  const tone = toneFromPowerLevel(powerLevel);
  const aura = auraClasses(tone);

  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Aura layer */}
      <div
        aria-hidden="true"
        className={[
          "absolute inset-0 rounded-full blur-xl",
          aura.glow,
          aura.ring,
          // Animated aura pulse + slight rotation wobble
          "animate-[auraPulse_1.15s_ease-in-out_infinite]",
        ].join(" ")}
        style={{ width: size + 34, height: size + 34 }}
      />

      {/* Inner flicker layer */}
      <div
        aria-hidden="true"
        className={[
          "absolute inset-0 rounded-full blur-2xl opacity-70",
          aura.glow,
          "animate-[auraFlicker_2.2s_ease-in-out_infinite]",
        ].join(" ")}
        style={{ width: size + 54, height: size + 54 }}
      />

      {/* Avatar */}
      <div
        className="relative overflow-hidden rounded-full border border-white/15 bg-white/5"
        style={{ width: size, height: size }}
      >
        <Image src={src} alt={alt} fill sizes={`${size}px`} className="object-cover" priority />
      </div>

      {/* Keyframes (Tailwind arbitrary animate requires keyframes exist in CSS)
          We'll inject them in globals.css later if needed. For now, define them inline via style tag. */}
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
