/**
 * Gamification Mechanics (Server-side logic)
 *
 * - Power Level: رقم ديناميكي كبير يعتمد على الدقة + السرعة + صعوبة السؤال.
 * - Zenkai Boost: إذا خسر اللاعب الـ streak بعد أخطاء متتالية، يحصل على مضاعف نقاط مؤقت لعدة محاولات.
 *
 * ملاحظة:
 * - هذا الملف منطق فقط، ويتم استدعاؤه من Server Actions.
 * - لا يوجد أي اعتماد على متصفح/DOM.
 */

export type DifficultyTier = 1 | 2 | 3 | 4 | 5;

export type ZenkaiState = {
  /** عدد المحاولات المتبقية للاستفادة من مضاعف الزنكاي */
  remainingAttempts: number;
  /** نسبة الزيادة (مثال 0.2 = +20%) */
  multiplier: number;
};

export type PerformanceInput = {
  isCorrect: boolean;

  /**
   * مدة الإجابة بالمللي ثانية (يُقاس من الواجهة ثم يُرسل للخادم)
   * سنقوم لاحقاً بالتحقق من مصداقيته عبر آليات أقوى، لكن الآن نستخدمه لإحساس "السرعة".
   */
  timeMs: number;

  /** صعوبة السؤال (1-5) */
  difficultyTier: DifficultyTier;

  /** نقاط اللاعب الحالية (من leaderboard) قبل تحديث هذا السؤال */
  currentScore: number;

  /** سلسلة الانتصارات الحالية قبل تحديث هذا السؤال */
  currentStreak: number;

  /** عدد الأخطاء المتتالية (على مستوى المنطق) */
  consecutiveWrong: number;

  /** حالة زنكاي الحالية إن وجدت */
  zenkai?: ZenkaiState | null;
};

export type PowerLevelResult = {
  /** قيمة الـ Power Level الجديدة (تراكمية) */
  nextPowerLevel: number;
  /** نقاط السؤال الحالي (بعد تطبيق مضاعف الزنكاي إن وجد) */
  awardedScore: number;
};

/**
 * دالة مساعدة لقص القيم.
 */
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Calculate Power Level
 *
 * الهدف: رقم "ضخم" يشعر اللاعب أنه يتطور بشكل ملحمي مثل السلسلة.
 *
 * الفكرة:
 * - baseScale يرتفع مع difficulty.
 * - عامل السرعة يعطي bonus أكبر كلما كانت الإجابة أسرع.
 * - streak يضاعف النمو بشكل تراكمي.
 * - نجمعها ضمن منحنى أسي خفيف + تراكم على الـ power الحالي.
 */
export function calculatePowerLevel(params: {
  currentPowerLevel: number;
  isCorrect: boolean;
  timeMs: number;
  difficultyTier: DifficultyTier;
  nextStreak: number;
  awardedScore: number;
}): number {
  const { currentPowerLevel, isCorrect, timeMs, difficultyTier, nextStreak, awardedScore } = params;

  // لا نرفع الـ power كثيراً عند الخطأ، فقط تدهور بسيط (يحافظ على الإدمان)
  if (!isCorrect) {
    const decay = Math.floor(currentPowerLevel * 0.002); // 0.2% تراجع
    return Math.max(0, currentPowerLevel - decay);
  }

  const t = clamp(timeMs, 600, 25_000);

  // سرعة: من 1.6 (سريع جداً) إلى 1.0 (بطيء)
  const speedFactor = clamp(1.65 - (t - 600) / 20_000, 1.0, 1.65);

  // صعوبة: 1 => 1.0 .. 5 => 2.2
  const difficultyFactor = 1 + (difficultyTier - 1) * 0.3;

  // streak: مضاعف تراكمي خفيف (يصبح محسوساً مع الوقت)
  const streakFactor = 1 + Math.log2(Math.max(1, nextStreak)) * 0.12;

  // منحنى أسّي خفيف لإنتاج أرقام كبيرة مع الوقت
  const baseGain = Math.floor(awardedScore * 150 * difficultyFactor * speedFactor * streakFactor);
  const exponentialBoost = Math.floor(Math.pow(baseGain, 1.08));

  return currentPowerLevel + exponentialBoost;
}

/**
 * Zenkai Boost
 *
 * - إذا حصلت أخطاء متتالية ثم خسر اللاعب streak (وصلت 0)، نفعل زنكاي.
 * - عند التفعيل: +20% نقاط لمدة 3 محاولات قادمة.
 * - كل إجابة صحيحة أو خاطئة أثناء الزنكاي تقلل remainingAttempts.
 */
export function evaluateZenkai(params: {
  wasCorrect: boolean;
  prevStreak: number;
  nextStreak: number;
  prevConsecutiveWrong: number;
  nextConsecutiveWrong: number;
  currentZenkai: ZenkaiState | null;
}): { nextZenkai: ZenkaiState | null; zenkaiActivated: boolean } {
  const { prevStreak, nextStreak, nextConsecutiveWrong, currentZenkai } = params;

  // إن كان الزنكاي مفعل: قلّل المحاولات المتبقية
  if (currentZenkai && currentZenkai.remainingAttempts > 0) {
    const remainingAttempts = Math.max(0, currentZenkai.remainingAttempts - 1);
    return {
      nextZenkai: remainingAttempts > 0 ? { ...currentZenkai, remainingAttempts } : null,
      zenkaiActivated: false,
    };
  }

  // تفعيل الزنكاي:
  // - massiveStreakLost: فقد سلسلة انتصارات قوية (>=5)
  // - reachedWrongThreshold: وصل إلى 3 أخطاء متتالية أو أكثر
  const massiveStreakLost = prevStreak >= 5 && nextStreak === 0;
  const reachedWrongThreshold = nextConsecutiveWrong >= 3;

  if (massiveStreakLost || reachedWrongThreshold) {
    return {
      nextZenkai: { remainingAttempts: 3, multiplier: 0.2 },
      zenkaiActivated: true,
    };
  }

  return { nextZenkai: null, zenkaiActivated: false };
}

/**
 * Apply score reward with optional zenkai multiplier.
 */
export function computeAwardedScore(params: {
  baseScore: number;
  zenkai: ZenkaiState | null;
}): number {
  const { baseScore, zenkai } = params;
  if (!zenkai) return baseScore;
  return Math.round(baseScore * (1 + zenkai.multiplier));
}
