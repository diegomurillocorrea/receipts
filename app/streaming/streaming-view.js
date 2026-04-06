const STREAMING_SERVICES = [
  {
    key: "netflix",
    barClass: "bg-streaming-netflix",
    title: "NETFLIX",
    titleClass: "text-[55px]",
    subtitle: "Películas y Series",
    price: "$5",
    priceSuffix: "/mes",
    priceBorder: "border-brand-red",
  },
  {
    key: "disney",
    barClass: "bg-streaming-disney",
    title: "DISNEY+",
    titleClass: "text-[55px]",
    subtitle: "Magia y Acción",
    price: "$6",
    priceSuffix: "/mes",
    priceBorder: "border-brand-green",
  },
  {
    key: "crunchyroll",
    barClass: "bg-streaming-crunchyroll",
    title: "CRUNCHYROLL",
    titleClass: "text-[52px]",
    subtitle: "Lo mejor del Anime",
    price: "$2.50",
    priceSuffix: "/mes",
    priceBorder: "border-brand-red",
  },
  {
    key: "prime",
    barClass: "bg-streaming-prime",
    title: "PRIME VIDEO",
    titleClass: "text-[50px] leading-none",
    subtitle: "Series Exclusivas",
    subtitleClass: "mt-2",
    price: "$3",
    priceSuffix: "/mes",
    priceBorder: "border-brand-green",
  },
  {
    key: "youtube",
    barClass: "bg-streaming-youtube",
    title: "YOUTUBE PREM.",
    titleClass: "text-[48px] leading-none",
    subtitle: "Videos sin anuncios",
    subtitleClass: "mt-2",
    price: "$6.50",
    priceSuffix: "/mes",
    priceBorder: "border-brand-red",
  },
  {
    key: "spotify",
    barClass: "bg-streaming-spotify",
    title: "SPOTIFY",
    titleClass: "text-[55px]",
    subtitle: "Música Ilimitada",
    price: "$4.50",
    priceSuffix: "/mes",
    priceBorder: "border-brand-green",
  },
];

function StreamingCard({
  barClass,
  title,
  titleClass,
  subtitle,
  subtitleClass = "",
  price,
  priceSuffix,
  priceBorder,
}) {
  return (
    <div className="relative flex flex-col items-center justify-between overflow-hidden rounded-[40px] border-4 border-gray-200 bg-white p-8 text-center shadow-xl">
      <div className={`absolute top-0 h-4 w-full ${barClass}`} aria-hidden />
      <h2
        className={`mb-1 mt-4 font-black tracking-tight text-gray-900 ${titleClass}`}
      >
        {title}
      </h2>
      <p
        className={`mb-6 text-2xl font-bold uppercase tracking-widest text-gray-500 ${subtitleClass}`}
      >
        {subtitle}
      </p>
      <div
        className={`w-full rounded-3xl border-b-8 bg-gray-900 py-5 text-white shadow-lg ${priceBorder}`}
      >
        <span className="text-[65px] font-black">{price}</span>
        <span className="text-3xl font-bold">{priceSuffix}</span>
      </div>
    </div>
  );
}

export function StreamingView() {
  return (
    <div className="flex min-h-screen w-full min-w-0 flex-col items-center justify-start overflow-x-hidden bg-gradient-to-b from-slate-200 via-slate-100 to-slate-200/90 px-4 pt-2 pb-12">
      <div className="relative mx-auto w-[1080px] max-w-full origin-top max-[600px]:scale-[0.32] min-[601px]:scale-[0.4]">
        <div
          id="poster"
          className="relative flex w-[1080px] max-w-full shrink-0 flex-col overflow-hidden rounded-[2rem] bg-white shadow-[0_32px_64px_-16px_rgba(15,23,42,0.28)] ring-1 ring-slate-900/10"
        >
          <header className="relative z-10 border-b-4 border-brand-green bg-gray-50 px-12 pb-8 pt-10 text-center">
            <div className="mb-6 flex justify-center">
              <img
                src="/DAIEGO.png"
                alt="Logo DAIEGO"
                className="h-32 rounded-xl border border-gray-200 bg-black object-contain shadow-sm"
              />
            </div>
            <div className="mb-4 inline-block rounded-full border-2 border-brand-red bg-brand-red px-8 py-3 text-3xl font-black uppercase tracking-wider text-white shadow-md">
              ¡Entretenimiento Premium!
            </div>
            <h1 className="text-[75px] font-black uppercase leading-none tracking-tight text-gray-900 drop-shadow-sm">
              Suscripción de
            </h1>
            <h2 className="mb-2 text-[55px] font-black uppercase leading-tight text-brand-green drop-shadow-sm">
              Plataformas de Streaming
            </h2>
            <p className="mt-2 text-[34px] font-bold text-gray-700">
              Series, películas y música sin pausas <span aria-hidden>🍿</span>
            </p>
          </header>

          <div className="relative z-10 flex flex-col justify-center gap-8 px-12 py-10">
            <div className="grid grid-cols-2 gap-8">
              {STREAMING_SERVICES.map((s) => (
                <StreamingCard
                  key={s.key}
                  barClass={s.barClass}
                  title={s.title}
                  titleClass={s.titleClass}
                  subtitle={s.subtitle}
                  subtitleClass={s.subtitleClass ?? ""}
                  price={s.price}
                  priceSuffix={s.priceSuffix}
                  priceBorder={s.priceBorder}
                />
              ))}
            </div>
          </div>

          <footer className="relative z-10 mt-auto border-t-8 border-brand-green bg-gray-900 py-10 text-center">
            <p className="mb-3 text-[52px] font-black text-white">
              <span aria-hidden className="mr-2">
                📲
              </span>
              ¡Activa tu cuenta aquí!
            </p>
            <p className="text-3xl font-bold text-brand-green">
              Aceptamos efectivo y transferencias
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
