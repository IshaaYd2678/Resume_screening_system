"use client";

import { useEffect, useMemo, useState } from "react";
import CrossScorePanel from "@/components/CrossScorePanel";
import InsightBox from "@/components/InsightBox";
import ModeToggle, { type DashboardMode } from "@/components/ModeToggle";
import ScoreCard from "@/components/ScoreCard";
import SectionList from "@/components/SectionList";
import type {
  CoverLetterScore,
  JobMatchScore,
  MatchResponse,
  PortfolioScore,
  ResumeScore,
  ResumeSection
} from "@/lib/types";

function readStoredItem<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function mapCoverLetterDimensions(score: CoverLetterScore): ResumeSection[] {
  return Object.entries(score.dimensions).map(([name, value]) => ({
    name,
    score: value,
    impact: value < 60 ? "high" : value < 80 ? "medium" : "low",
    impactWeight: Math.max(0.2, Math.min(1, value / 100)),
    suggestion: "Tighten this section with one more concrete detail."
  }));
}

function keywordHint(keyword: string): string {
  const normalized = keyword.toLowerCase();

  if (/(sql|python|aws|tableau|excel|api)/.test(normalized)) {
    return "Add this in skills and one results-focused experience bullet.";
  }

  if (/(leadership|stakeholder|roadmap|strategy)/.test(normalized)) {
    return "Add this in your summary and strongest leadership bullet.";
  }

  return "Add this where it appears naturally in skills or experience.";
}

export default function DashboardPage() {
  const [mode, setMode] = useState<DashboardMode>("growth");
  const [score, setScore] = useState<ResumeScore | null>(null);
  const [match, setMatch] = useState<JobMatchScore | null>(null);
  const [history, setHistory] = useState<ResumeScore[]>([]);
  const [jobDescription, setJobDescription] = useState("");
  const [error, setError] = useState("");
  const [isMatching, setIsMatching] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [coverLetterScore, setCoverLetterScore] = useState<CoverLetterScore | null>(null);
  const [portfolioScore, setPortfolioScore] = useState<PortfolioScore | null>(null);
  const [contradictionFlags, setContradictionFlags] = useState<string[]>([]);
  const [activeDocumentType, setActiveDocumentType] = useState<string>("resume");

  useEffect(() => {
    setScore(readStoredItem<ResumeScore>("resumeready-general-score"));
    setMatch(readStoredItem<JobMatchScore>("resumeready-latest-match"));
    setCoverLetterScore(readStoredItem<CoverLetterScore>("resumeready-cover-letter-score"));
    setPortfolioScore(readStoredItem<PortfolioScore>("resumeready-portfolio-score"));
    setContradictionFlags(readStoredItem<string[]>("resumeready-cover-letter-flags") ?? []);
    setHistory(readStoredItem<ResumeScore[]>("resumeready-score-history") ?? []);
    setActiveDocumentType(window.localStorage.getItem("resumeready-active-document-type") ?? "resume");

    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(prefersDark);
    document.documentElement.classList.toggle("dark", prefersDark);
  }, []);

  function toggleDarkMode() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
  }

  async function runMatch() {
    setError("");
    if (!jobDescription.trim()) {
      setError("Paste a job description to check role readiness.");
      return;
    }

    const sessionId = window.localStorage.getItem("resumeready-session-id");
    if (!sessionId) {
      setError("Start with a resume checkup first.");
      return;
    }

    setIsMatching(true);
    try {
      const response = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, jobDescription })
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error ?? "We had trouble reading your document. Try pasting as plain text.");
      }

      const data = body as MatchResponse;
      setMatch(data.match);
      window.localStorage.setItem("resumeready-latest-match", JSON.stringify(data.match));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "We had trouble reading your document. Try pasting as plain text."
      );
    } finally {
      setIsMatching(false);
    }
  }

  const activeSections = useMemo(() => {
    if (mode === "apply" && match?.roleGaps.length) {
      return match.roleGaps;
    }

    if (score) {
      return score.sections;
    }

    if (portfolioScore) {
      return portfolioScore.sections;
    }

    if (coverLetterScore) {
      return mapCoverLetterDimensions(coverLetterScore);
    }

    return [];
  }, [coverLetterScore, match, mode, portfolioScore, score]);

  if (!score && !portfolioScore && !coverLetterScore) {
    return (
      <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-[28px] border border-zinc-200 bg-white p-8 shadow-soft dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-teal-ready">ResumeReady</p>
          <h1 className="mt-4 text-3xl font-black text-zinc-950 dark:text-white">
            Start with a document checkup
          </h1>
          <p className="mt-3 text-zinc-600 dark:text-zinc-300">
            Add a resume, portfolio, cover letter, deck, or profile so the dashboard has something to coach from.
          </p>
          <a
            href="/"
            className="mt-6 inline-block rounded-2xl bg-zinc-950 px-5 py-3 font-semibold text-white dark:bg-white dark:text-zinc-950"
          >
            Add document
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(25,185,154,0.14),_transparent_28%),linear-gradient(180deg,#fbfbf8_0%,#f1f1eb_100%)] px-4 py-8 dark:bg-[radial-gradient(circle_at_top,_rgba(25,185,154,0.12),_transparent_28%),linear-gradient(180deg,#111214_0%,#050606_100%)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 grid gap-6 xl:grid-cols-[1fr_360px] xl:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-teal-ready">ResumeReady</p>
              <button
                type="button"
                onClick={toggleDarkMode}
                className="rounded-full border border-zinc-300 px-3 py-1 text-sm font-semibold dark:border-zinc-700"
              >
                {isDark ? "Light mode" : "Dark mode"}
              </button>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                Active: {activeDocumentType.replace("_", " ")}
              </span>
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-zinc-950 dark:text-white sm:text-5xl">
              {score
                ? mode === "growth"
                  ? "Build career fitness between applications."
                  : "Check race-day readiness against a real role."
                : portfolioScore
                  ? "See how your portfolio supports the story."
                  : "Coach your cover letter before you send it."}
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-zinc-600 dark:text-zinc-300">
              {score
                ? mode === "growth"
                  ? "Track your baseline, focus on the highest-impact sections, and build stronger career materials over time."
                  : "Compare your current story against a target role and fix the fastest gaps first."
                : portfolioScore
                  ? "Portfolio reviews are advisory and work best alongside a strong resume."
                  : "Cover letter coaching is strongest when it stays tightly aligned with your resume."}
            </p>
          </div>
          {score ? <ModeToggle mode={mode} onChange={setMode} /> : null}
        </header>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {score ? (
            <>
              <ScoreCard
                label="Fitness score"
                value={score.overall}
                caption={score.delta ? "Movement since your last checkup" : "Baseline for your next improvement sprint"}
                delta={score.delta}
                accent="fitness"
              />
              <ScoreCard
                label={mode === "apply" && match ? "Role match" : "Industry percentile"}
                value={mode === "apply" && match ? match.matchScore : score.percentile}
                caption={mode === "apply" && match ? match.matchLabel : "Estimated standing for your field"}
                accent={mode === "apply" && match ? "match" : "muted"}
                size="small"
              />
            </>
          ) : null}

          {portfolioScore ? (
            <ScoreCard
              label="Portfolio score"
              value={portfolioScore.overall}
              caption={`Across ${portfolioScore.projectCount} highlighted projects`}
              accent="match"
            />
          ) : null}

          {coverLetterScore ? (
            <ScoreCard
              label="Cover letter score"
              value={coverLetterScore.overall}
              caption={`${coverLetterScore.wordCount} words`}
              accent="muted"
            />
          ) : null}
        </div>

        {score && mode === "apply" ? (
          <section className="mt-6 rounded-[28px] border border-zinc-200 bg-white p-6 shadow-soft dark:border-zinc-800 dark:bg-zinc-900">
            <label
              htmlFor="jobDescription"
              className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400"
            >
              Target role
            </label>
            <textarea
              id="jobDescription"
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              placeholder="Paste a job description to check how your current story matches this role."
              className="mt-4 min-h-40 w-full rounded-3xl border border-zinc-200 bg-zinc-50 px-4 py-4 outline-none transition focus:border-teal-ready dark:border-zinc-700 dark:bg-zinc-950"
            />
            {error ? (
              <p className="mt-3 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-200">
                {error}
              </p>
            ) : null}
            <button
              type="button"
              onClick={runMatch}
              disabled={isMatching}
              className="mt-4 rounded-2xl bg-teal-ready px-5 py-3 font-semibold text-zinc-950 transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isMatching ? "Checking role readiness" : "Check role readiness"}
            </button>

            {match?.missingKeywords.length ? (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {match.missingKeywords.map((keyword) => (
                  <div
                    key={keyword}
                    className="rounded-2xl bg-teal-50 p-4 text-sm text-teal-900 dark:bg-teal-950 dark:text-teal-100"
                  >
                    <p className="font-semibold">{keyword}</p>
                    <p className="mt-2 leading-6">{keywordHint(keyword)}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <SectionList
            title={
              score
                ? mode === "growth"
                  ? "Areas to strengthen"
                  : "Role-specific gaps"
                : portfolioScore
                  ? "Portfolio focus areas"
                  : "Cover letter dimensions"
            }
            sections={activeSections}
            tone={mode === "apply" ? "match" : "fitness"}
          />
          <div className="space-y-6">
            <InsightBox
              message={
                mode === "apply" && match
                  ? match.insightMessage
                  : score?.insightMessage ??
                    portfolioScore?.insightMessage ??
                    coverLetterScore?.insightMessage ??
                    "Start with the clearest improvement you can make this week."
              }
            />

            {coverLetterScore && score ? (
              <CrossScorePanel
                resumeScore={score}
                match={match}
                coverLetterScore={coverLetterScore}
                contradictionFlags={contradictionFlags}
              />
            ) : null}
          </div>
        </div>

        {score && history.length > 1 ? (
          <section className="mt-6 rounded-[28px] border border-zinc-200 bg-white p-6 shadow-soft dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
              Progress trail
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
              {history.slice(0, 6).map((item) => (
                <div key={item.scoredAt} className="rounded-3xl bg-zinc-100 p-4 dark:bg-zinc-950">
                  <p className="text-2xl font-black text-violet-coach">{item.overall}</p>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                    {new Date(item.scoredAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <a
            href="/"
            className="rounded-2xl border border-zinc-300 px-5 py-4 text-center font-semibold transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Score another document
          </a>
          {score ? (
            <button
              type="button"
              onClick={() => setMode(mode === "growth" ? "apply" : "growth")}
              className="rounded-2xl border border-zinc-300 px-5 py-4 font-semibold transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              {mode === "growth" ? "Switch to apply mode" : "Return to growth mode"}
            </button>
          ) : (
            <a
              href="/"
              className="rounded-2xl border border-zinc-300 px-5 py-4 text-center font-semibold transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              Add a resume for apply mode
            </a>
          )}
        </div>
      </div>
    </main>
  );
}
