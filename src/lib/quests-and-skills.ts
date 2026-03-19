import "server-only";

export type DailyQuestType = "answer_count" | "correct_streak";

export interface DailyQuest {
  id: string;
  type: DailyQuestType;
  title: string;
  target: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
  rewardSkillPoints: number;
}

export interface DailyQuestState {
  date: string; // YYYY-MM-DD
  quests: DailyQuest[];
}

function todayKey(d = new Date()) {
  // always YYYY-MM-DD (UTC) لتفادي اختلاف المناطق في SSR
  return d.toISOString().slice(0, 10);
}

function randomId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * generateDailyQuests()
 * تولّد 3 مهام يومية. (يمكن توسيعها لاحقاً)
 */
export function generateDailyQuests(now = new Date()): DailyQuestState {
  const date = todayKey(now);

  const quests: DailyQuest[] = [
    {
      id: randomId("q"),
      type: "answer_count",
      title: "أجب عن 5 أسئلة اليوم",
      target: 5,
      progress: 0,
      completed: false,
      claimed: false,
      rewardSkillPoints: 3,
    },
    {
      id: randomId("q"),
      type: "answer_count",
      title: "أجب عن 10 أسئلة اليوم",
      target: 10,
      progress: 0,
      completed: false,
      claimed: false,
      rewardSkillPoints: 5,
    },
    {
      id: randomId("q"),
      type: "correct_streak",
      title: "احصل على 3 إجابات صحيحة متتالية",
      target: 3,
      progress: 0,
      completed: false,
      claimed: false,
      rewardSkillPoints: 7,
    },
  ];

  return { date, quests };
}

function normalizeQuestState(input: unknown, now = new Date()): DailyQuestState {
  const date = todayKey(now);

  if (!input || typeof input !== "object") return generateDailyQuests(now);

  const maybe = input as Partial<DailyQuestState>;
  if (maybe.date !== date || !Array.isArray(maybe.quests)) {
    return generateDailyQuests(now);
  }

  // Sanitize fields to avoid runtime surprises from DB JSON
  const quests: DailyQuest[] = maybe.quests
    .map((q) => {
      if (!q || typeof q !== "object") return null;
      const qq = q as Partial<DailyQuest>;

      const type = qq.type === "correct_streak" ? "correct_streak" : "answer_count";
      const target = Number(qq.target ?? 0);
      const progress = Number(qq.progress ?? 0);
      const completed = Boolean(qq.completed);
      const claimed = Boolean(qq.claimed);
      const rewardSkillPoints = Number(qq.rewardSkillPoints ?? 0);

      const title =
        typeof qq.title === "string" && qq.title.length > 0
          ? qq.title
          : type === "correct_streak"
            ? "احصل على إجابات صحيحة متتالية"
            : "أجب عن أسئلة اليوم";

      return {
        id: typeof qq.id === "string" && qq.id.length > 0 ? qq.id : randomId("q"),
        type,
        title,
        target: Number.isFinite(target) && target > 0 ? target : 1,
        progress: Number.isFinite(progress) && progress >= 0 ? progress : 0,
        completed,
        claimed,
        rewardSkillPoints: Number.isFinite(rewardSkillPoints) && rewardSkillPoints >= 0 ? rewardSkillPoints : 0,
      } satisfies DailyQuest;
    })
    .filter(Boolean) as DailyQuest[];

  // ضمان وجود 3 مهام دائماً
  if (quests.length !== 3) return generateDailyQuests(now);

  return { date, quests };
}

export interface QuestUpdateInput {
  dailyQuests: unknown; // from PB JSON
  lastLogin: string | null | undefined; // from PB text
  now?: Date;
  // سياق الإجابة
  wasCorrect: boolean;
  nextStreak: number;
}

export interface QuestUpdateResult {
  nextDailyQuests: DailyQuestState;
  earnedSkillPoints: number;
  lastLoginToStore: string; // YYYY-MM-DD
}

/**
 * updateDailyQuestsOnAnswer()
 * - يضمن تهيئة/إعادة توليد المهام اليومية حسب التاريخ
 * - يحدّث التقدم عند كل إجابة (count) + عند الإجابة الصحيحة (streak)
 * - يمنح skill_points عند اكتمال المهمة (مرة واحدة عبر claimed=false -> true)
 */
export function updateDailyQuestsOnAnswer(input: QuestUpdateInput): QuestUpdateResult {
  const now = input.now ?? new Date();
  const today = todayKey(now);

  // last_login: نُحدّثه يومياً (حتى لو لم تُولد مهام جديدة في DB بعد)
  const lastLoginToStore = today;

  const state = normalizeQuestState(input.dailyQuests, now);

  let earnedSkillPoints = 0;

  const quests = state.quests.map((q) => {
    const next = { ...q };

    // 1) answer_count: زيادة التقدم لكل إجابة (صحيحة أو خاطئة)
    if (next.type === "answer_count") {
      next.progress = Math.min(next.target, next.progress + 1);
    }

    // 2) correct_streak: التقدم = streak الحالي عند الإجابة الصحيحة فقط
    if (next.type === "correct_streak") {
      if (input.wasCorrect) {
        next.progress = Math.min(next.target, Math.max(next.progress, input.nextStreak));
      } else {
        // reset visual progress if wrong
        next.progress = 0;
      }
    }

    // 3) completion + reward
    if (!next.completed && next.progress >= next.target) {
      next.completed = true;
    }

    if (next.completed && !next.claimed) {
      next.claimed = true;
      earnedSkillPoints += next.rewardSkillPoints;
    }

    return next;
  });

  return {
    nextDailyQuests: { date: today, quests },
    earnedSkillPoints,
    lastLoginToStore,
  };
}
