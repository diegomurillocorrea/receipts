"use client";

import { DaiegoLogo } from "@/components/daiego-logo";

export function Footer() {
  return (
    <footer
      className="flex w-full flex-wrap items-center justify-between gap-4 bg-emerald-500 px-4 py-4 text-zinc-900 tablet:px-6 desktop:px-8"
      role="contentinfo"
      aria-label="Pie de página"
    >
      <div className="flex flex-wrap items-center gap-3">
        <DaiegoLogo
          width={112}
          height={36}
          className="max-h-9 w-auto drop-shadow-sm"
        />
      </div>
      <span className="text-sm font-medium" aria-label="DAIEGO LLC copyright 2026">
        DAIEGO LLC © 2026
      </span>
    </footer>
  );
}
