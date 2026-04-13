import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { dragonBallSeries } from "@/lib/series";

type SeriesPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params,
}: SeriesPageProps): Promise<Metadata> {
  const { slug } = await params;
  const series = dragonBallSeries.find((item) => item.slug === slug);

  if (!series) {
    return {
      title: "السلسلة غير موجودة | تحدي دراغون بول",
    };
  }

  return {
    title: `اختبار ${series.name} | تحدي دراغون بول`,
    description: series.metaDescription,
  };
}

export default async function SeriesSlugPage({ params }: SeriesPageProps) {
  const { slug } = await params;
  const series = dragonBallSeries.find((item) => item.slug === slug);

  if (!series) {
    notFound();
  }

  return (
    <main dir="rtl" className="min-h-screen bg-zinc-950 px-4 py-10 text-white">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
          <div className="absolute inset-0 bg-linear-to-br from-amber-500/10 via-transparent to-sky-500/10" />
          <div className="relative z-10 space-y-3">
            <span className="inline-flex rounded-full border border-white/10 bg-black/40 px-4 py-1 text-xs font-semibold text-amber-300">
              {series.coverLabel}
            </span>
            <h1 className="text-4xl font-black tracking-tight md:text-5xl">
              {series.name}
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-zinc-300 md:text-base">
              {series.subtitle}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
            <p className="text-sm text-zinc-400">المعرف</p>
            <p className="mt-2 text-lg font-bold text-white">{series.id}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
            <p className="text-sm text-zinc-400">المسار</p>
            <p className="mt-2 text-lg font-bold text-white">
              /series/{series.slug}
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
            <p className="text-sm text-zinc-400">الغلاف</p>
            <p className="mt-2 text-lg font-bold text-white">
              {series.coverHint}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
