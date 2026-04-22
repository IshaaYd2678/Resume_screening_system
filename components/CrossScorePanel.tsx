import type { CoverLetterScore, JobMatchScore, ResumeScore } from "@/lib/types";

type CrossScorePanelProps = {
  resumeScore: ResumeScore;
  match: JobMatchScore | null;
  coverLetterScore: CoverLetterScore | null;
  contradictionFlags: string[];
};

export default function CrossScorePanel({
  resumeScore,
  match,
  coverLetterScore,
  contradictionFlags
}: CrossScorePanelProps) {
  return (
    <section className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-soft dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
            Cross score
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-zinc-950 dark:text-white">
            Resume and cover letter alignment
          </h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          Use this panel to spot whether your role story is consistent across both documents.
        </p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl bg-zinc-50 p-5 dark:bg-zinc-950">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
            Resume fitness
          </p>
          <p className="mt-3 text-4xl font-black text-violet-coach">{resumeScore.overall}</p>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            {resumeScore.insightMessage}
          </p>
        </div>

        <div className="rounded-3xl bg-zinc-50 p-5 dark:bg-zinc-950">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
            Role match
          </p>
          <p className="mt-3 text-4xl font-black text-teal-ready">
            {match ? match.matchScore : "--"}
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            {match ? match.matchLabel : "Run apply mode to compare your resume against a job description."}
          </p>
        </div>

        <div className="rounded-3xl bg-zinc-50 p-5 dark:bg-zinc-950">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
            Cover letter score
          </p>
          <p className="mt-3 text-4xl font-black text-zinc-950 dark:text-white">
            {coverLetterScore ? coverLetterScore.overall : "--"}
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            {coverLetterScore
              ? coverLetterScore.insightMessage
              : "Upload a cover letter to compare your narrative across documents."}
          </p>
        </div>
      </div>

      {contradictionFlags.length ? (
        <div className="mt-5 grid gap-3">
          {contradictionFlags.map((flag) => (
            <p
              key={flag}
              className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-100"
            >
              {flag}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
