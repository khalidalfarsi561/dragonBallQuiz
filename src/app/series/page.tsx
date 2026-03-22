import AuthModal from "@/components/AuthModal";
import Link from "next/link";
import SeriesGrid from "@/components/SeriesGrid";
import { createPBServerClient } from "@/lib/pocketbase";
import { dragonBallSeries } from "@/lib/series";

export default async function SeriesPage() {
  const pb = await createPBServerClient();

  if (!pb.authStore.isValid || !pb.authStore.record?.id) {
    return <AuthModal />;
  }

  return (
    <main className="relative mx-auto w-full max-w-6xl overflow-hidden px-4 py-10 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64">
        <div className="absolute left-1/2 top-8 h-40 w-40 -translate-x-1/2 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="absolute left-1/2 top-20 h-56 w-56 -translate-x-1/2 rounded-full bg-sky-500/20 blur-3xl" />
      </div>

      <div className="relative mb-10 text-center">
        <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl [font-family:var(--font-ar-display),var(--font-ar-body),serif]">
          اختبر معلوماتك في دراغون بول
        </h1>
      </div>

      <div className="mb-8 h-px w-full bg-linear-to-r from-transparent via-white/15 to-transparent" />

      <SeriesGrid series={dragonBallSeries} />
    </main>
  );
}
