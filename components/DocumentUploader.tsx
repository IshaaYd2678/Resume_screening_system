"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import DocumentTypeSelector from "@/components/DocumentTypeSelector";
import {
  DOCUMENT_CATEGORIES,
  getCategoryDefinition,
  isLikelyGithubUrl,
  isLikelyUrl,
  validateUploadSize
} from "@/lib/documents";
import type {
  AchievementsResponse,
  CoverLetterScore,
  DocumentCategory,
  PortfolioScore,
  ResumeScore,
  ScoreResponse
} from "@/lib/types";

type ParsedDocument = {
  category: DocumentCategory;
  rawText: string;
  wordCount: number;
  warnings: string[];
  metadata: Record<string, string | number | boolean | string[]>;
};

const PRIMARY_ACTIONS: Record<DocumentCategory, string> = {
  resume: "Get fitness score",
  linkedin_export: "Score LinkedIn export",
  portfolio_url: "Review portfolio",
  cover_letter: "Score cover letter",
  github_url: "Review GitHub profile",
  portfolio_deck: "Review portfolio deck",
  performance_review: "Extract achievements"
};

function storeSessionData(options: {
  sessionId: string;
  parsedDocument: ParsedDocument;
  generalScore?: ResumeScore;
  coverLetterScore?: CoverLetterScore;
  portfolioScore?: PortfolioScore;
  achievements?: AchievementsResponse["extraction"];
  contradictionFlags?: string[];
}) {
  window.localStorage.setItem("resumeready-session-id", options.sessionId);
  window.localStorage.setItem("resumeready-active-document-type", options.parsedDocument.category);
  window.localStorage.setItem("resumeready-last-parsed-document", JSON.stringify(options.parsedDocument));
  window.localStorage.setItem(
    `resumeready-document-${options.parsedDocument.category}`,
    options.parsedDocument.rawText
  );

  if (options.generalScore) {
    const historyRaw = window.localStorage.getItem("resumeready-score-history");
    const history = historyRaw ? (JSON.parse(historyRaw) as ResumeScore[]) : [];
    window.localStorage.setItem("resumeready-general-score", JSON.stringify(options.generalScore));
    window.localStorage.setItem(
      "resumeready-score-history",
      JSON.stringify([options.generalScore, ...history].slice(0, 6))
    );
  }

  if (options.coverLetterScore) {
    window.localStorage.setItem("resumeready-cover-letter-score", JSON.stringify(options.coverLetterScore));
  }

  if (options.portfolioScore) {
    window.localStorage.setItem("resumeready-portfolio-score", JSON.stringify(options.portfolioScore));
  }

  if (options.achievements) {
    window.localStorage.setItem("resumeready-achievements", JSON.stringify(options.achievements));
  }

  if (options.contradictionFlags) {
    window.localStorage.setItem(
      "resumeready-cover-letter-flags",
      JSON.stringify(options.contradictionFlags)
    );
  }
}

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

export default function DocumentUploader() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [documentType, setDocumentType] = useState<DocumentCategory>("resume");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [parsedDocument, setParsedDocument] = useState<ParsedDocument | null>(null);
  const [error, setError] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isScoring, setIsScoring] = useState(false);

  const selectedCategory = getCategoryDefinition(documentType);

  function resetForNewType(nextType: DocumentCategory) {
    setDocumentType(nextType);
    setSelectedFile(null);
    setPastedText("");
    setSourceUrl("");
    setParsedDocument(null);
    setError("");
    if (fileRef.current) {
      fileRef.current.value = "";
    }
  }

  function validateUrlInput() {
    if (documentType === "github_url" && !isLikelyGithubUrl(sourceUrl)) {
      return "Paste a valid GitHub profile URL to continue.";
    }

    if ((documentType === "portfolio_url" || documentType === "github_url") && !isLikelyUrl(sourceUrl)) {
      return "Paste a valid URL to continue.";
    }

    return "";
  }

  async function parseDocument() {
    setError("");
    setParsedDocument(null);

    if (selectedCategory.inputMode === "url") {
      const urlError = validateUrlInput();
      if (urlError) {
        setError(urlError);
        return;
      }
    }

    if (!pastedText.trim() && selectedCategory.inputMode === "file" && !selectedFile) {
      setError("Add a file or paste extracted text to continue.");
      return;
    }

    if (selectedFile) {
      const sizeError = validateUploadSize(selectedFile.size);
      if (sizeError) {
        setError(sizeError);
        return;
      }
    }

    setIsParsing(true);
    try {
      const payload =
        selectedCategory.inputMode === "url"
          ? {
              documentType,
              sourceUrl
            }
          : pastedText.trim()
            ? {
                documentType,
                rawText: pastedText
              }
            : {
                documentType,
                fileName: selectedFile?.name,
                fileBase64: selectedFile ? await fileToBase64(selectedFile) : undefined
              };

      const response = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error ?? "We had trouble reading that file.");
      }

      setParsedDocument(body.parsedDocument as ParsedDocument);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We had trouble reading that file.");
    } finally {
      setIsParsing(false);
    }
  }

  async function submitForScoring() {
    if (!parsedDocument) {
      setError("Read your document first so we can confirm what will be scored.");
      return;
    }

    setError("");
    setIsScoring(true);

    try {
      const sessionId = window.localStorage.getItem("resumeready-session-id") ?? undefined;
      const previousRaw = window.localStorage.getItem("resumeready-general-score");
      const previousScore = previousRaw ? (JSON.parse(previousRaw) as { overall?: number }) : null;

      let endpoint = "/api/score";
      let payload: Record<string, unknown> = {
        sessionId,
        documentType,
        rawText: parsedDocument.rawText,
        sourceUrl: sourceUrl || undefined,
        fileName: selectedFile?.name,
        previousOverall: previousScore?.overall
      };

      if (documentType === "cover_letter") {
        const storedResumeText =
          window.localStorage.getItem("resumeready-document-resume") ||
          window.localStorage.getItem("resumeready-document-linkedin_export") ||
          "";
        endpoint = "/api/cover-letter";
        payload = {
          sessionId,
          coverLetterText: parsedDocument.rawText,
          fileName: selectedFile?.name,
          resumeText: storedResumeText || undefined
        };
      }

      if (documentType === "portfolio_url" || documentType === "portfolio_deck") {
        endpoint = "/api/portfolio";
        payload = {
          sessionId,
          sourceType: documentType === "portfolio_url" ? "url" : "deck",
          content: parsedDocument.rawText,
          sourceUrl: sourceUrl || undefined,
          fileName: selectedFile?.name
        };
      }

      if (documentType === "performance_review") {
        endpoint = "/api/achievements";
        payload = {
          sessionId,
          rawText: parsedDocument.rawText,
          fileName: selectedFile?.name
        };
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error ?? "We had trouble reading your document. Try pasting as plain text.");
      }

      if (documentType === "performance_review") {
        const data = body as AchievementsResponse & { parsedDocument: ParsedDocument };
        storeSessionData({
          sessionId: data.sessionId,
          parsedDocument,
          achievements: data.extraction
        });
        router.push("/achievements");
        return;
      }

      const data = body as ScoreResponse & { parsedDocument: ParsedDocument };
      if ("documentType" in data.score) {
        storeSessionData({
          sessionId: data.sessionId,
          parsedDocument,
          generalScore: data.score
        });
      } else if ("dimensions" in data.score) {
        storeSessionData({
          sessionId: data.sessionId,
          parsedDocument,
          coverLetterScore: data.score,
          contradictionFlags:
            "contradictionFlags" in body && Array.isArray(body.contradictionFlags)
              ? (body.contradictionFlags as string[])
              : []
        });
      } else {
        storeSessionData({
          sessionId: data.sessionId,
          parsedDocument,
          portfolioScore: data.score
        });
      }

      router.push("/dashboard");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "We had trouble reading your document. Try pasting as plain text."
      );
    } finally {
      setIsScoring(false);
    }
  }

  return (
    <div className="space-y-6">
      <DocumentTypeSelector selectedType={documentType} onSelect={resetForNewType} />

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[30px] border border-zinc-200/80 bg-white p-6 shadow-soft dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-ready">
                Input
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-zinc-950 dark:text-white">
                {selectedCategory.label}
              </h2>
            </div>
            <span className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
              {selectedCategory.inputMode === "url" ? "Paste a URL" : "Upload or paste text"}
            </span>
          </div>

          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300">
            {selectedCategory.helperText}
          </p>

          {selectedCategory.inputMode === "url" ? (
            <div className="mt-6">
              <label
                htmlFor="sourceUrl"
                className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400"
              >
                Source URL
              </label>
              <input
                id="sourceUrl"
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
                placeholder={
                  documentType === "github_url"
                    ? "https://github.com/your-handle"
                    : "https://yourportfolio.dev"
                }
                className="mt-3 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-base outline-none transition focus:border-teal-ready dark:border-zinc-800 dark:bg-zinc-900"
              />
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <div className="rounded-3xl border border-dashed border-zinc-300 bg-zinc-50/80 p-5 dark:border-zinc-700 dark:bg-zinc-900/70">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-base font-semibold text-zinc-950 dark:text-white">
                      {selectedFile ? selectedFile.name : "Choose a file"}
                    </p>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                      Accepted: {selectedCategory.accepts.join(", ")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white dark:bg-white dark:text-zinc-950"
                  >
                    Select file
                  </button>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept={selectedCategory.accepts.join(",")}
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setSelectedFile(file);
                    setParsedDocument(null);
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="pastedText"
                  className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400"
                >
                  Or paste extracted text
                </label>
                <textarea
                  id="pastedText"
                  value={pastedText}
                  onChange={(event) => {
                    setPastedText(event.target.value);
                    setParsedDocument(null);
                  }}
                  placeholder="Paste the plain text version here if that is faster."
                  className="mt-3 min-h-[220px] w-full rounded-3xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-base outline-none transition focus:border-teal-ready dark:border-zinc-800 dark:bg-zinc-900"
                />
              </div>
            </div>
          )}

          {error ? (
            <p className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:bg-rose-950 dark:text-rose-200">
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={parseDocument}
              disabled={isParsing}
              className="rounded-2xl bg-teal-ready px-5 py-4 text-sm font-semibold text-zinc-950 transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isParsing ? `Reading your ${selectedCategory.label.toLowerCase()}...` : `Read your ${selectedCategory.label.toLowerCase()}`}
            </button>
            <button
              type="button"
              onClick={submitForScoring}
              disabled={!parsedDocument || isScoring}
              className="rounded-2xl border border-zinc-300 px-5 py-4 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              {isScoring ? "Scoring in progress" : PRIMARY_ACTIONS[documentType]}
            </button>
          </div>
        </div>

        <aside className="rounded-[30px] border border-zinc-200/80 bg-[radial-gradient(circle_at_top,_rgba(25,185,154,0.16),_transparent_42%),linear-gradient(180deg,#ffffff_0%,#f7f7f4_100%)] p-6 shadow-soft dark:border-zinc-800 dark:bg-[radial-gradient(circle_at_top,_rgba(25,185,154,0.18),_transparent_40%),linear-gradient(180deg,#111214_0%,#050606_100%)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
            Parse preview
          </p>
          {parsedDocument ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-3xl bg-white/80 p-5 dark:bg-zinc-950/80">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                  Ready to score
                </p>
                <p className="mt-2 text-3xl font-black text-zinc-950 dark:text-white">
                  {parsedDocument.wordCount.toLocaleString()} words
                </p>
                <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                  We read this as a {getCategoryDefinition(parsedDocument.category).label.toLowerCase()}.
                </p>
              </div>

              {parsedDocument.warnings.length ? (
                <div className="space-y-2">
                  {parsedDocument.warnings.map((warning) => (
                    <p
                      key={warning}
                      className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100"
                    >
                      {warning}
                    </p>
                  ))}
                </div>
              ) : null}

              <div className="rounded-3xl bg-white/80 p-5 dark:bg-zinc-950/80">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                  Extract preview
                </p>
                <p className="mt-3 line-clamp-6 text-sm leading-7 text-zinc-700 dark:text-zinc-300">
                  {parsedDocument.rawText.slice(0, 520)}
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-3xl bg-white/80 p-5 dark:bg-zinc-950/80">
              <p className="text-lg font-bold text-zinc-950 dark:text-white">
                Read first, score second
              </p>
              <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                After parsing, we will confirm the document type, show the word count, and surface any format-specific notes before scoring or extraction begins.
              </p>
            </div>
          )}

          <div className="mt-5 rounded-3xl border border-zinc-200/80 bg-white/70 p-5 dark:border-zinc-800 dark:bg-zinc-950/70">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
              Supported today
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {DOCUMENT_CATEGORIES.map((category) => (
                <span
                  key={category.type}
                  className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                >
                  {category.label}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
