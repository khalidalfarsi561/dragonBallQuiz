"use client";

import {} from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";

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
  imageAlt?: string;
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
      className="grid grid-cols-2 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4"
    >
      {series.map((item) => (
        <SeriesCard key={item.slug} item={item} />
      ))}
    </motion.div>
  );
}

function SeriesCard({ item }: { item: DragonBallSeries }) {
  const router = useRouter();

  const handleEnterQuiz = () => {
    router.push(`/quiz/${item.slug}`);
  };

  return (
    <motion.div variants={cardVariants}>
      <div className="group relative overflow-visible rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md">
        <div
          role="button"
          tabIndex={0}
          className="relative block cursor-pointer overflow-hidden rounded-3xl"
          dir="rtl"
          onClick={handleEnterQuiz}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              handleEnterQuiz();
            }
          }}
        >
          <div className="relative aspect-9/16 overflow-hidden">
            <Image
              src={item.coverSrc}
              fill
              alt={item.imageAlt ?? item.name}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              loading="eager"
              priority={
                item.slug === "dragon-ball-z" ||
                item.slug === "dragon-ball-super"
              }
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-black/10 z-0" />
            <div className="absolute inset-y-0 left-0 w-20 bg-linear-to-r from-black/60 via-black/25 to-transparent" />
            <div className="absolute inset-y-0 right-0 w-20 bg-linear-to-l from-black/60 via-black/25 to-transparent" />

            <div className="absolute inset-x-0 bottom-3 flex flex-col items-center px-4 z-10 pointer-events-none">
              <h3 className="text-sm sm:text-lg font-black text-white text-center drop-shadow-lg [font-family:var(--font-ar-display),serif]">
                {item.titleAr ?? item.name}
              </h3>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
