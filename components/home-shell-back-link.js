"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

function BackChevron() {
  return (
    <svg
      className="h-5 w-5 shrink-0"
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
  );
}

export function HomeShellBackLink() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const paymentId = (searchParams.get("paymentId") ?? "").trim();

  if (pathname === "/") return null;

  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 1) {
    return (
      <Link
        href="/"
        className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 dark:focus:ring-offset-zinc-950"
        aria-label="Volver a servicios"
      >
        <BackChevron />
        Servicios
      </Link>
    );
  }

  if (segments.length === 2) {
    const serviceId = segments[0];
    const href = paymentId ? "/payments" : `/${serviceId}`;
    const ariaLabel = paymentId ? "Volver a pagos" : "Volver a búsqueda";

    return (
      <Link
        href={href}
        className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 dark:focus:ring-offset-zinc-950"
        aria-label={ariaLabel}
      >
        <BackChevron />
        Volver
      </Link>
    );
  }

  return null;
}
