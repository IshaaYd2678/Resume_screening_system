"use client";

import { useMemo, useState } from "react";
import type { ResumeSection } from "@/lib/types";

type SectionListProps = {
  title: string;
  sections: ResumeSection[];
  tone?: "fitness" | "match";
};

const pillClasses = {
  high: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-200",
  medium: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  low: "bg-lime-50 text-lime-800 dark:bg-lime-950 dark:text-lime-200"
};

export default function SectionList({ title, sections, tone = "fitness" }: SectionListProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const sorted = useMemo(
    () => [...sections].sort((a, b) => b.impactWeight - a.impactWeight),
    [sections]
  );
  const barColor = tone === "match" ? "bg-teal-ready" : "bg-violet-coach";

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-soft dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
        {title}
      </h2>
      <div className="mt-5 divide-y divide-zinc-200 dark:divide-zinc-800">
        {sorted.map((section, index) => {
          const isOpen = openIndex === index;
          return (
            <button
              type="button"
              key={`${section.name}-${index}`}
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="block w-full py-4 text-left"
            >
              <div className="grid gap-3 md:grid-cols-[1fr_160px_160px] md:items-center">
                <div>
                  <p className="font-semibold text-zinc-950 dark:text-white">{section.name}</p>
                  {isOpen && (
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{section.suggestion}</p>
                  )}
                </div>
                <span
                  className={`w-fit rounded-full px-3 py-1 text-sm font-semibold ${pillClasses[section.impact]}`}
                >
                  {section.impact === "medium" ? "Med" : section.impact[0].toUpperCase() + section.impact.slice(1)} impact
                </span>
                <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-800">
                  <div
                    className={`h-2 rounded-full ${barColor}`}
                    style={{ width: `${Math.round(section.impactWeight * 100)}%` }}
                    aria-label={`${section.score} score`}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
