"use client";

import { useEffect, useState } from "react";
import AchievementCard from "@/components/AchievementCard";
import type { PerformanceReviewExtraction } from "@/lib/types";

function readAchievements(): PerformanceReviewExtraction | null {
  try {
    const raw = window.localStorage.getItem("resumeready-achievements");
    return raw ? (JSON.parse(raw) as PerformanceReviewExtraction) : null;
  } catch {
    return null;
  }
}

export default function AchievementsPage() {
  const [extraction, setExtraction] = useState<PerformanceReviewExtraction | null>(null);

  useEffect(() => {
    setExtraction(readAchievements());
  }, []);

  if (!extraction) {
    return (
      <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-[28px] border border-zinc-200 bg-white p-8 shadow-soft dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-teal-ready">ResumeReady</p>
          <h1 className="mt-4 text-3xl font-black text-zinc-950 dark:text-white">
            No extracted achievements yet
          </h1>
          <p className="mt-3 text-zinc-600 dark:text-zinc-300">
            Upload a performance review to turn past wins into resume-ready bullet points.
          </p>
          <a
            href="/"
            className="mt-6 inline-block rounded-2xl bg-zinc-950 px-5 py-3 font-semibold text-white dark:bg-white dark:text-zinc-950"
          >
            Add performance review
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(25,185,154,0.14),_transparent_30%),linear-gradient(180deg,#fbfbf8_0%,#f1f1eb_100%)] px-4 py-8 dark:bg-[radial-gradient(circle_at_top,_rgba(25,185,154,0.12),_transparent_30%),linear-gradient(180deg,#111214_0%,#050606_100%)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-teal-ready">ResumeReady</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-zinc-950 dark:text-white sm:text-5xl">
              Achievements extracted from your review
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-zinc-600 dark:text-zinc-300">
              These bullets turn review language into stronger resume-ready evidence. Use them as a starting point, then tailor them to the role you want.
            </p>
          </div>
          <a
            href="/dashboard"
            className="rounded-2xl border border-zinc-300 bg-white/80 px-5 py-3 text-center font-semibold text-zinc-800 transition hover:bg-white dark:border-zinc-700 dark:bg-zinc-950/70 dark:text-zinc-100 dark:hover:bg-zinc-950"
          >
            Open dashboard
          </a>
        </header>

        <section className="mb-6 rounded-[28px] border border-zinc-200 bg-white p-6 shadow-soft dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
            Extraction summary
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl bg-zinc-50 p-5 dark:bg-zinc-950">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                Bullets extracted
              </p>
              <p className="mt-3 text-4xl font-black text-teal-ready">
                {extraction.achievements.length}
              </p>
            </div>
            <div className="rounded-3xl bg-zinc-50 p-5 dark:bg-zinc-950">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                Extracted at
              </p>
              <p className="mt-3 text-lg font-semibold text-zinc-950 dark:text-white">
                {new Date(extraction.extractedAt).toLocaleString()}
              </p>
            </div>
            <div className="rounded-3xl bg-zinc-50 p-5 dark:bg-zinc-950">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                Best next move
              </p>
              <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                Pull the two strongest quantified bullets into your resume before the next application cycle.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          {extraction.achievements.map((achievement, index) => (
            <AchievementCard
              key={`${achievement.bulletForm}-${index}`}
              achievement={achievement}
              index={index}
            />
          ))}
        </section>
      </div>
    </main>
  );
}
