"use client";

import { DOCUMENT_CATEGORIES } from "@/lib/documents";
import type { DocumentCategory } from "@/lib/types";

type DocumentTypeSelectorProps = {
  selectedType: DocumentCategory;
  onSelect: (type: DocumentCategory) => void;
};

export default function DocumentTypeSelector({
  selectedType,
  onSelect
}: DocumentTypeSelectorProps) {
  return (
    <section className="rounded-[28px] border border-zinc-200/80 bg-white/90 p-6 shadow-soft backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
            Document types
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-zinc-950 dark:text-white">
            Choose what you want to strengthen
          </h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          ResumeReady supports resumes, LinkedIn exports, portfolios, cover letters, GitHub profiles, decks, and performance reviews.
        </p>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {DOCUMENT_CATEGORIES.map((category) => {
          const selected = category.type === selectedType;

          return (
            <button
              key={category.type}
              type="button"
              onClick={() => onSelect(category.type)}
              className={`rounded-3xl border p-5 text-left transition ${
                selected
                  ? "border-teal-ready bg-teal-ready/10 shadow-[0_16px_40px_rgb(25_185_154_/0.16)]"
                  : "border-zinc-200 bg-zinc-50/80 hover:border-zinc-300 hover:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-950"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-lg font-bold text-zinc-950 dark:text-white">{category.label}</p>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                    category.inputMode === "url"
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                      : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  }`}
                >
                  {category.inputMode === "url" ? "URL" : "Upload"}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                {category.shortDescription}
              </p>
              <p className="mt-4 text-xs font-medium uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                {category.helperText}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
