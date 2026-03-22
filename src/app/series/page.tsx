import AuthModal from "@/components/AuthModal";
import Link from "next/link";
import { createPBServerClient } from "@/lib/pocketbase";
import { dragonBallSeries } from "@/lib/series";

export default async function SeriesPage() {
  const pb = await createPBServerClient();

  if (!pb.authStore.isValid || !pb.authStore.record?.id) {
    return <AuthModal />;
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-amber-300/80">
          اختر السلسلة
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
          اختر سلسلة دراغون بول للاختبار
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
          بعد اختيار السلسلة سيتم نقلك إلى بطاقة السؤال الخاصة بها.
        </p>
      </div>

      <div className="series-grid series-grid--featured">
        {dragonBallSeries.map((series) => (
          <Link
            key={series.id}
            href={`/quiz/${series.slug}`}
            className="series-card group"
            aria-label={`ابدأ اختبار ${series.name}`}
          >
            <div
              className="series-card__cover"
              style={{
                backgroundImage: `linear-gradient(180deg, rgba(3, 7, 18, 0.08), rgba(3, 7, 18, 0.72)), url(${series.coverSrc})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div className="series-card__cover-placeholder">
                <div
                  className="absolute inset-0 bg-zinc-950/35"
                  aria-hidden="true"
                />
                <span className="series-card__cover-badge">
                  {series.coverLabel}
                </span>
                <span className="mt-3 text-xs font-medium uppercase tracking-[0.3em] text-slate-200/70">
                  {series.coverHint}
                </span>
              </div>
            </div>

            <div className="series-card__body">
              <div>
                <h2 className="series-card__title">{series.name}</h2>
                <p className="series-card__subtitle">{series.subtitle}</p>
              </div>
              <div className="series-card__meta">
                <span>ابدأ الاختبار</span>
                <span className="series-card__chevron">↗</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
