const actionIconBaseClass =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-50"

export function ActionIconButton({
  label,
  onClick,
  disabled,
  tone = "muted",
  children,
}) {
  const toneClass =
    tone === "danger"
      ? "text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/40"
      : tone === "primary"
        ? "text-emerald-700 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-900/40"
        : tone === "info"
          ? "text-sky-500 hover:bg-sky-100 dark:text-sky-400 dark:hover:bg-sky-900/40"
          : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"

  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`${actionIconBaseClass} ${toneClass}`}
        aria-label={label}
      >
        {children}
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full right-0 z-20 mb-2 whitespace-nowrap rounded-lg bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {label}
      </span>
    </span>
  )
}
