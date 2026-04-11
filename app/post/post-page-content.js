"use client";

import { useState } from "react";
import Link from "next/link";
import { PostPdfDownload } from "./post-pdf-download";
import { PostView } from "./post-view";

export function PostPageContent() {
  const [landscape, setLandscape] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b border-emerald-200/30 bg-white/85 px-4 py-3 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-emerald-900/20 dark:bg-zinc-950/90 relative">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />
        <Link
          href="/payments"
          className="relative inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50/50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-emerald-600/40 dark:hover:bg-zinc-800 dark:focus:ring-offset-zinc-950"
        >
          <svg
            className="h-4 w-4 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Volver
        </Link>

        <div
          className="relative flex flex-wrap items-center gap-1 rounded-full border border-slate-200/80 bg-slate-50/90 p-1 shadow-inner dark:border-zinc-700 dark:bg-zinc-900/80"
          role="group"
          aria-label="Orientación del cartel (tamaño carta)"
        >
          <button
            type="button"
            onClick={() => setLandscape(false)}
            aria-pressed={!landscape}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-900 ${
              !landscape
                ? "bg-gradient-to-b from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-900/20 ring-1 ring-white/20"
                : "text-slate-600 hover:bg-white/90 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            }`}
          >
            Vertical (carta)
          </button>
          <button
            type="button"
            onClick={() => setLandscape(true)}
            aria-pressed={landscape}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-900 ${
              landscape
                ? "bg-gradient-to-b from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-900/20 ring-1 ring-white/20"
                : "text-slate-600 hover:bg-white/90 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            }`}
          >
            Horizontal (carta)
          </button>
        </div>

        <PostPdfDownload
          embedded
          pageFormat="letter"
          letterLandscape={landscape}
        />
      </header>
      <PostView landscape={landscape} />
    </>
  );
}
