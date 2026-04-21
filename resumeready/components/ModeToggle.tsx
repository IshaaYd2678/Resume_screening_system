"use client";

export type DashboardMode = "growth" | "apply";

type ModeToggleProps = {
  mode: DashboardMode;
  onChange: (mode: DashboardMode) => void;
};

export default function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="grid grid-cols-2 rounded-lg border border-zinc-300 p-1 dark:border-zinc-700">
      {(["growth", "apply"] as const).map((option) => {
        const active = mode === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`rounded-md px-4 py-3 text-sm font-semibold transition ${
              active
                ? "bg-gray-100 text-zinc-950 dark:bg-gray-800 dark:text-white"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            }`}
          >
            {option === "growth" ? "Growth mode" : "Apply mode"}
          </button>
        );
      })}
    </div>
  );
}
