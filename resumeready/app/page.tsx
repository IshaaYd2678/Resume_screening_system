import DocumentUploader from "@/components/DocumentUploader";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(25,185,154,0.15),_transparent_30%),linear-gradient(180deg,#fbfbf8_0%,#f1f1eb_100%)] px-4 py-8 dark:bg-[radial-gradient(circle_at_top,_rgba(25,185,154,0.12),_transparent_28%),linear-gradient(180deg,#0f1112_0%,#050606_100%)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-teal-ready">ResumeReady</p>
            <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-tight text-zinc-950 dark:text-white sm:text-5xl lg:text-6xl">
              Career fitness for every document that helps you move forward.
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-zinc-600 dark:text-zinc-300">
              Score resumes, LinkedIn exports, portfolios, GitHub profiles, decks, and cover letters with coaching-first feedback that helps you improve before the next application.
            </p>
          </div>
          <a
            href="/dashboard"
            className="rounded-2xl border border-zinc-300 bg-white/80 px-5 py-3 text-center font-semibold text-zinc-800 transition hover:bg-white dark:border-zinc-700 dark:bg-zinc-950/70 dark:text-zinc-100 dark:hover:bg-zinc-950"
          >
            Open dashboard
          </a>
        </header>
        <DocumentUploader />
      </div>
    </main>
  );
}
