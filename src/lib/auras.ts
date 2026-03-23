export type AuraTone = "yellow" | "red" | "blue" | "silver";

export function toneFromPowerLevel(powerLevel: number): AuraTone {
  if (powerLevel >= 5_000_000) return "silver";
  if (powerLevel >= 1_200_000) return "blue";
  if (powerLevel >= 300_000) return "red";
  return "yellow";
}

export function auraColor(tone: AuraTone) {
  switch (tone) {
    case "silver":
      return {
        particle: "rgba(235,235,255,0.95)",
        particleSoft: "rgba(190,190,255,0.55)",
        glow:
          "bg-[radial-gradient(circle_at_center,rgba(240,240,255,0.95)_0%,rgba(210,210,255,0.40)_35%,rgba(120,120,160,0.00)_70%)]",
        ring: "shadow-[0_0_30px_rgba(240,240,255,0.75),0_0_80px_rgba(180,180,255,0.35)]",
      };
    case "blue":
      return {
        particle: "rgba(90,180,255,0.95)",
        particleSoft: "rgba(60,120,255,0.55)",
        glow:
          "bg-[radial-gradient(circle_at_center,rgba(80,160,255,0.95)_0%,rgba(80,160,255,0.45)_35%,rgba(20,60,160,0.00)_70%)]",
        ring: "shadow-[0_0_28px_rgba(80,160,255,0.70),0_0_85px_rgba(40,90,255,0.35)]",
      };
    case "red":
      return {
        particle: "rgba(255,110,90,0.95)",
        particleSoft: "rgba(255,140,90,0.55)",
        glow:
          "bg-[radial-gradient(circle_at_center,rgba(255,80,90,0.92)_0%,rgba(255,120,80,0.40)_35%,rgba(150,30,30,0.00)_70%)]",
        ring: "shadow-[0_0_28px_rgba(255,80,90,0.65),0_0_80px_rgba(255,140,60,0.28)]",
      };
    default:
      return {
        particle: "rgba(255,235,110,0.95)",
        particleSoft: "rgba(255,175,70,0.55)",
        glow:
          "bg-[radial-gradient(circle_at_center,rgba(255,230,90,0.95)_0%,rgba(255,200,80,0.45)_35%,rgba(120,80,20,0.00)_70%)]",
        ring: "shadow-[0_0_28px_rgba(255,230,90,0.65),0_0_80px_rgba(255,160,40,0.25)]",
      };
  }
}

export function particleProfile(tone: AuraTone) {
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
