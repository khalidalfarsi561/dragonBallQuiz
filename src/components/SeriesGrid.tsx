"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

type DragonBallSeries = {
  slug: string;
  name: string;
  titleAr?: string;
  subtitle?: string;
  description?: string;
  questionCount?: number;
  arcs?: string[];
  coverSrc: string;
  coverLabel?: string;
  coverHint?: string;
};

type SeriesGridProps = {
  series: DragonBallSeries[];
};

const gridVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.09,
    },
  },
};

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 24,
    scale: 0.98,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
};

export default function SeriesGrid({ series }: SeriesGridProps) {
  return (
    <motion.div
      variants={gridVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4"
    >
      {series.map((item) => (
        <SeriesCard key={item.slug} item={item} />
      ))}
    </motion.div>
  );
}

function SeriesCard({ item }: { item: DragonBallSeries }) {
  const [open, setOpen] = useState(false);
  const arcs = item.arcs ?? [];

  return (
    <motion.div variants={cardVariants}>
      <div className="group relative overflow-visible rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md">
        <Link
          href={`/quiz/${item.slug}`}
          className="relative block overflow-hidden rounded-3xl"
          dir="rtl"
        >
          <div className="relative aspect-9/16 overflow-hidden">
            <Image
              src={item.coverSrc}
              fill
              alt={item.name}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              loading="eager"
              priority={
                item.slug === "dragon-ball-z" ||
                item.slug === "dragon-ball-super"
              }
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-y-0 left-0 w-20 bg-linear-to-r from-black/60 via-black/25 to-transparent" />
            <div className="absolute inset-y-0 right-0 w-20 bg-linear-to-l from-black/60 via-black/25 to-transparent" />
            <div className="absolute right-3 top-3 flex items-start gap-2">
              <div className="rounded-full bg-linear-to-r from-red-600 via-red-500 to-red-700 px-2.5 py-1 text-[11px] font-black leading-none text-white shadow-lg shadow-red-950/30 ring-1 ring-white/10">
                {item.questionCount ?? "?"} سؤال
              </div>
              <div
                className={`rounded-full px-2.5 py-1 text-[11px] font-black leading-none text-white shadow-lg ring-1 ring-white/10 ${
                  item.slug === "dragon-ball-z"
                    ? "bg-linear-to-r from-amber-500 via-orange-500 to-amber-600 shadow-amber-950/30"
                    : item.slug === "dragon-ball-super"
                      ? "bg-linear-to-r from-sky-500 via-cyan-500 to-sky-600 shadow-sky-950/30"
                      : item.slug === "dragon-ball"
                        ? "bg-linear-to-r from-fuchsia-500 via-violet-500 to-fuchsia-600 shadow-fuchsia-950/30"
                        : "bg-linear-to-r from-emerald-500 via-teal-500 to-emerald-600 shadow-emerald-950/30"
                }`}
              >
                {item.titleAr ?? item.name}
              </div>
            </div>

            <div className="absolute inset-x-0 bottom-4 flex justify-center px-4">
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  setOpen((value) => !value);
                }}
                className="min-w-44 rounded-full border border-white/10 bg-linear-to-r from-amber-500 via-orange-500 to-red-500 px-5 py-2 text-center text-sm font-bold tracking-wide text-white backdrop-blur-md shadow-lg shadow-orange-950/30 transition hover:from-amber-400 hover:via-orange-400 hover:to-red-400"
                aria-expanded={open}
                aria-haspopup="listbox"
              >
                <span className="block text-sm uppercase tracking-[0.25em]">
                  اختر الآرك
                </span>
              </button>
            </div>
          </div>
        </Link>

        {open ? (
          <div className="absolute inset-x-3 bottom-14 z-20 rounded-2xl border border-white/10 bg-zinc-950/95 p-2 shadow-2xl shadow-black/40 backdrop-blur-md">
            <div className="max-h-44 overflow-y-auto rounded-xl">
              {arcs.length > 0 ? (
                arcs.map((arc) => (
                  <button
                    key={arc}
                    type="button"
                    className="block w-full rounded-xl px-3 py-2 text-right text-sm font-semibold text-zinc-100 transition hover:bg-white/10"
                    onClick={() => setOpen(false)}
                  >
                    {arc}
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-right text-sm text-zinc-300">
                  آرك السايان
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
