"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { ScoreResponse } from "@/lib/types";

export default function ResumeUploader() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleFile(file: File) {
    const text = await file.text();
    setResumeText(text);
  }

  async function scoreResume() {
    setError("");
    setIsLoading(true);

    try {
      const previousRaw = window.localStorage.getItem("resumeready-general-score");
      const previousScore = previousRaw ? JSON.parse(previousRaw) as { overall?: number } : null;
      const response = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, previousOverall: previousScore?.overall })
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error ?? "We had trouble reading your resume. Try pasting it as plain text.");
      }

      const data = body as ScoreResponse;
      const historyRaw = window.localStorage.getItem("resumeready-score-history");
      const history = historyRaw ? JSON.parse(historyRaw) as ScoreResponse["score"][] : [];
      window.localStorage.setItem("resumeready-session-id", data.sessionId);
      window.localStorage.setItem("resumeready-general-score", JSON.stringify(data.score));
      window.localStorage.setItem("resumeready-score-history", JSON.stringify([data.score, ...history].slice(0, 6)));
      window.localStorage.removeItem("resumeready-latest-match");
      router.push("/dashboard");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We had trouble reading your resume. Try pasting it as plain text.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-soft dark:border-zinc-800 dark:bg-zinc-900">
        <label htmlFor="resume" className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
          Your resume checkup
        </label>
        <textarea
          id="resume"
          value={resumeText}
          onChange={(event) => setResumeText(event.target.value)}
          placeholder="Paste your resume here to start a calm, practical checkup."
          className="mt-4 min-h-[340px] w-full resize-y rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-base outline-none transition focus:border-violet-coach dark:border-zinc-700 dark:bg-zinc-950"
        />
        {error && <p className="mt-3 rounded-md bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-200">{error}</p>}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={scoreResume}
            disabled={isLoading}
            className="rounded-lg bg-zinc-950 px-5 py-3 font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-950"
          >
            {isLoading ? "Checking resume" : "Get fitness score"}
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-zinc-300 px-5 py-3 font-semibold text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
          >
            Upload text file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.md,.csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-soft dark:border-zinc-800 dark:bg-zinc-900">
        <Image
          src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80"
          alt="Calm workspace with notes and laptop"
          width={900}
          height={520}
          className="h-52 w-full object-cover"
        />
        <div className="p-5">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
            Career fitness
          </p>
          <p className="mt-3 text-2xl font-bold">Improve between applications, then check race-day readiness.</p>
          <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            Start in growth mode for steady coaching. Switch to apply mode when a specific role is on deck.
          </p>
        </div>
      </div>
    </section>
  );
}
