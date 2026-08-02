"use client"

import { DaiegoLogoMark } from "@/components/daiego-logo-mark"

export function Footer() {
  return (
    <footer
      className="flex w-full items-center justify-between gap-4 bg-emerald-500 px-6 py-4 text-zinc-900 sm:px-8 lg:px-10"
      role="contentinfo"
      aria-label="Pie de página"
    >
      <DaiegoLogoMark
        markClassName="h-8"
        tile="dark"
        className="rounded-md p-1"
      />
      <span className="text-sm font-medium" aria-label="DAIEGO LLC copyright 2026">
        DAIEGO LLC © 2026
      </span>
    </footer>
  )
}
