"use client";

import { Share2 } from "lucide-react";

function buildShareText(powerLevel: number) {
  if (powerLevel >= 1_000_000) {
    return `طاقة الكي الخاصة بي تجاوزت المليون! (${powerLevel.toLocaleString("ar")}) هل تجرؤ على هزيمتي؟`;
  }
  return `طاقة الكي الخاصة بي الآن ${powerLevel.toLocaleString("ar")}! هل يمكنك التفوق عليّ في تحدي دراغون بول؟`;
}

export default function SharePowerButton(props: { powerLevel: number }) {
  const { powerLevel } = props;

  const onShare = () => {
    const text = buildShareText(powerLevel);
    const url = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const intent = new URL("https://twitter.com/intent/tweet");
    intent.searchParams.set("text", text);
    intent.searchParams.set("url", url);

    window.open(intent.toString(), "_blank", "noopener,noreferrer");
  };

  return (
    <button
      type="button"
      onClick={onShare}
      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
    >
      <Share2 className="h-4 w-4" />
      مشاركة مستوى الطاقة على X
    </button>
  );
}
