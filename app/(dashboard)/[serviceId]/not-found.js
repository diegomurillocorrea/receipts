import Link from "next/link";

export default function ServiceNotFound() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Servicio no encontrado
      </h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        El servicio que buscas no existe o ya no está disponible.
      </p>
      <Link
        href="/"
        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-600 px-5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 dark:focus:ring-offset-zinc-950"
        aria-label="Volver al inicio"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
