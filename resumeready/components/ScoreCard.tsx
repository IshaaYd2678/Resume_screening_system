"use client";

type ScoreCardProps = {
  label: string;
  value: number;
  caption: string;
  delta?: number;
  accent?: "fitness" | "match" | "muted";
  size?: "large" | "small";
};

const accentClasses = {
  fitness: "text-violet-coach",
  match: "text-teal-ready",
  muted: "text-zinc-500 dark:text-zinc-300"
};

export default function ScoreCard({
  label,
  value,
  caption,
  delta = 0,
  accent = "fitness",
  size = "large"
}: ScoreCardProps) {
  const deltaText = delta > 0 ? `+${delta} pts` : `${delta} pts`;
  const deltaColor = delta > 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300";

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-soft dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <div className="mt-4 flex items-end gap-3">
        <span
          className={`${accentClasses[accent]} font-bold leading-none ${
            size === "large" ? "text-5xl" : "text-3xl"
          }`}
        >
          {value}
        </span>
        {delta !== 0 && <span className={`pb-1 text-sm font-semibold ${deltaColor}`}>{deltaText}</span>}
      </div>
      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">{caption}</p>
    </section>
  );
}
