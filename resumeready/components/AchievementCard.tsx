import type { ExtractedAchievement } from "@/lib/types";

type AchievementCardProps = {
  achievement: ExtractedAchievement;
  index: number;
};

const impactStyles = {
  quantified: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
  qualitative: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-100",
  leadership: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
  technical: "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-100"
};

export default function AchievementCard({ achievement, index }: AchievementCardProps) {
  return (
    <article className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-soft dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
          Achievement {index + 1}
        </p>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${impactStyles[achievement.impactCategory]}`}
        >
          {achievement.impactCategory}
        </span>
      </div>

      <div className="mt-5 grid gap-4">
        <div className="rounded-3xl bg-zinc-50 p-4 dark:bg-zinc-950">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
            Source language
          </p>
          <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-300">{achievement.raw}</p>
        </div>

        <div className="rounded-3xl bg-teal-50 p-4 dark:bg-teal-950">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-900 dark:text-teal-100">
            Resume-ready bullet
          </p>
          <p className="mt-2 text-base font-semibold leading-7 text-zinc-900 dark:text-white">
            {achievement.bulletForm}
          </p>
        </div>
      </div>
    </article>
  );
}
