import { DaiegoLogo } from "@/components/daiego-logo";

function getServiceImageUrl(service) {
  if (!service?.image_bucket || !service?.image_path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/${service.image_bucket}/${service.image_path}`;
}

function ServicePlaceholder() {
  return (
    <div
      className="flex h-full w-full items-center justify-center bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
      aria-hidden
    >
      <svg
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    </div>
  );
}

function ServiceTile({ service }) {
  const imageUrl = getServiceImageUrl(service);
  const name = service.name?.trim() || "Servicio sin nombre";

  return (
    <li className="min-w-0">
      <div className="group flex flex-col items-center gap-1.5">
        <div
          className="aspect-square w-full overflow-hidden rounded-xl border border-zinc-200 bg-white transition-colors duration-200 group-hover:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:group-hover:border-emerald-500"
          title={name}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={`Logo de ${name}`}
              className="h-full w-full object-contain p-1.5"
              loading="lazy"
            />
          ) : (
            <ServicePlaceholder />
          )}
        </div>
        <span className="line-clamp-2 w-full text-center text-[11px] font-medium leading-snug text-zinc-700 dark:text-zinc-300 tablet:text-xs">
          {name}
        </span>
      </div>
    </li>
  );
}

export function HomeViewSkeleton() {
  return (
    <div
      className="mx-auto flex w-full max-w-5xl flex-col items-center px-1 pb-10 pt-8 tablet:pt-12 desktop:pt-14"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="mb-6 h-14 w-[min(100%,16vw)] min-w-36 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800 tablet:mb-8 tablet:h-20 tablet:min-w-44" />
      <div className="mb-8 h-7 w-72 max-w-full animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800 tablet:mb-10" />
      <p className="sr-only">Cargando servicios…</p>
      <ul
        className="grid w-full grid-cols-4 gap-3 tablet:grid-cols-6 tablet:gap-4 desktop:grid-cols-8 desktop:gap-4 xl:grid-cols-10"
        aria-hidden
      >
        {Array.from({ length: 20 }, (_, index) => (
          <li key={index} className="min-w-0">
            <div className="flex flex-col items-center gap-1.5">
              <div className="aspect-square w-full animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HomeView({ services, fetchError }) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-1 pb-10 pt-8 tablet:pt-12 desktop:pt-14">
      <div
        className="mb-6 flex w-[min(100%,16vw)] min-w-36 items-center justify-center rounded-2xl border border-zinc-200/80 bg-white px-4 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 tablet:mb-8 tablet:min-w-44 tablet:px-5 tablet:py-4"
        role="group"
        aria-label="DAIEGO"
      >
        <DaiegoLogo
          width={720}
          height={216}
          priority
          className="h-auto w-full"
        />
      </div>

      <h1 className="mb-8 max-w-xl text-center text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 tablet:mb-10 tablet:text-2xl">
        ¡Hola! ¿Qué servicio deseas realizar?
      </h1>

      {fetchError ? (
        <p
          className="max-w-md rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300"
          role="alert"
        >
          No se pudieron cargar los servicios. Intenta de nuevo más tarde.
        </p>
      ) : services.length === 0 ? (
        <p
          className="max-w-md text-center text-sm text-zinc-500 dark:text-zinc-400"
          role="status"
        >
          Aún no hay servicios disponibles.
        </p>
      ) : (
        <ul
          className="grid w-full grid-cols-4 justify-items-stretch gap-3 tablet:grid-cols-6 tablet:gap-4 desktop:grid-cols-8 desktop:gap-4 xl:grid-cols-10"
          aria-label="Servicios disponibles"
        >
          {services.map((service) => (
            <ServiceTile key={service.id} service={service} />
          ))}
        </ul>
      )}
    </div>
  );
}
