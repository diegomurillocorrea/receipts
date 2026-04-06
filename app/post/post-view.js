const chipBase =
  "inline-flex items-center justify-center rounded-2xl px-6 py-3 text-[1.65rem] font-bold leading-tight tracking-tight shadow-sm ring-1 ring-black/5";

const catalogNames = [
  "Arabela",
  "AVON",
  "LECLEIRE",
  "BELEZZA",
  "FLUSHING",
  "BELCORP",
  "ESIKA",
  "CYZONE",
  "L'BEL",
];

const gameNames = ["Free Fire", "Roblox", "Clash Royale", "Clash of Clans", "Brawl Stars"];

function IconTile({ emoji, accent }) {
  const accentClass =
    accent === "green"
      ? "from-emerald-50 to-teal-50/80 ring-emerald-200/60"
      : accent === "red"
        ? "from-rose-50 to-red-50/80 ring-rose-200/60"
        : "from-slate-100 to-slate-50 ring-slate-200/80";

  return (
    <div
      className={`flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-[2.35rem] leading-none shadow-inner ring-1 ${accentClass}`}
      aria-hidden
    >
      {emoji}
    </div>
  );
}

function SectionShell({ icon, iconAccent, title, children, highlight }) {
  return (
    <div
      className={`rounded-2xl border bg-white p-7 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.08)] ${
        highlight
          ? "border-brand-green/40 ring-2 ring-brand-green/20"
          : "border-slate-200/90"
      }`}
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <IconTile emoji={icon} accent={iconAccent} />
          <div className="min-w-0 text-left">
            <h3 className="text-[2.1rem] font-extrabold leading-tight tracking-tight text-slate-900">
              {title}
            </h3>
          </div>
        </div>
        <div className="border-t border-slate-100 pt-5">{children}</div>
      </div>
    </div>
  );
}

function Chip({ children, tone }) {
  const tones = {
    green: `${chipBase} bg-brand-green text-white`,
    red: `${chipBase} bg-brand-red text-white`,
    slate: `${chipBase} bg-slate-800 text-white`,
    rose: `${chipBase} bg-rose-600 text-white`,
  };

  return <span className={tones[tone] ?? tones.slate}>{children}</span>;
}

export function PostView() {
  return (
    <div className="flex min-h-screen w-full min-w-0 flex-col items-center justify-start overflow-x-hidden bg-gradient-to-b from-slate-200 via-slate-100 to-slate-200/90 px-4 pt-2 pb-12">
      <div className="relative mx-auto w-[1080px] max-w-full origin-top max-[600px]:scale-[0.32] min-[601px]:scale-[0.4]">
        <div
          id="poster"
          className="relative flex w-[1080px] max-w-full shrink-0 flex-col overflow-hidden rounded-[2rem] bg-white shadow-[0_32px_64px_-16px_rgba(15,23,42,0.28)] ring-1 ring-slate-900/10"
        >
          {/* Hero */}
          <header className="relative z-10 border-b border-brand-green/30 bg-gradient-to-b from-slate-50 via-white to-emerald-50/30 px-10 pb-8 pt-9 text-center">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-brand-green/40 to-transparent" />
            <div className="mb-6 flex justify-center">
              <div className="rounded-2xl bg-black p-3 shadow-lg ring-4 ring-white">
                <img
                  src="/DAIEGO.png"
                  alt="Logo DAIEGO"
                  className="h-28 w-auto object-contain"
                />
              </div>
            </div>
            <div className="mb-5 inline-flex items-center rounded-full bg-brand-red px-8 py-2.5 text-[1.35rem] font-extrabold uppercase tracking-[0.12em] text-white shadow-md ring-1 ring-red-900/10">
              ¡Evita las filas!
            </div>
            <h1 className="text-[5.5rem] font-black leading-[0.95] tracking-tight text-slate-900">
              PAGO DE
            </h1>
            <h2
              data-pdf-export="gradient-headline"
              className="mt-1 bg-gradient-to-r from-brand-green via-emerald-500 to-teal-600 bg-clip-text text-[4.5rem] font-black leading-tight tracking-tight text-transparent"
            >
              RECIBOS Y FACTURAS
            </h2>
            <p className="mt-4 text-[2rem] font-semibold text-slate-500">
              Fácil, rápido y 100% seguro <span aria-hidden>🔒</span>
            </p>
          </header>

          {/* Body */}
          <div className="relative z-10 flex flex-col gap-5 bg-gradient-to-b from-white to-slate-50/80 px-10 py-7">
            <div className="grid grid-cols-2 gap-5">
              <SectionShell icon="💧" iconAccent="green" title="Agua">
                <div className="flex flex-wrap gap-3">
                  <Chip tone="green">ANDA</Chip>
                </div>
              </SectionShell>
              <SectionShell icon="⚡" iconAccent="red" title="Luz eléctrica">
                <div className="flex flex-wrap gap-3">
                  <Chip tone="red">CAESS</Chip>
                  <Chip tone="red">CLESA</Chip>
                  <Chip tone="red">DELSUR</Chip>
                </div>
              </SectionShell>
            </div>

            <SectionShell icon="📱" iconAccent="neutral" title="Telefonía y línea fija">
              <div className="flex flex-wrap gap-3">
                <Chip tone="slate">CLARO</Chip>
                <Chip tone="slate">TIGO</Chip>
                <Chip tone="slate">Digicel</Chip>
                <Chip tone="green">Telefónica</Chip>
                <Chip tone="slate">Sky+</Chip>
              </div>
            </SectionShell>

            <SectionShell icon="🛍️" iconAccent="neutral" title="Catálogos">
              <div className="flex flex-wrap gap-2.5">
                {catalogNames.map((name) => (
                  <Chip key={name} tone="rose">
                    {name}
                  </Chip>
                ))}
              </div>
            </SectionShell>

            <SectionShell icon="🎮" iconAccent="neutral" title="Recarga de juegos">
              <div className="flex flex-wrap gap-2.5">
                {gameNames.map((name) => (
                  <Chip key={name} tone="slate">
                    {name}
                  </Chip>
                ))}
              </div>
            </SectionShell>

            <div className="grid grid-cols-2 gap-5">
              <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50 p-7 text-center shadow-[0_4px_24px_-4px_rgba(15,23,42,0.08)]">
                <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 text-5xl shadow-inner ring-1 ring-slate-200/80">
                  🎓
                </div>
                <h3 className="text-[2.25rem] font-extrabold text-slate-900">Universidades</h3>
                <p className="mt-2 text-[1.35rem] font-semibold text-slate-500">Mensualidades</p>
              </div>
              <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-brand-green/35 bg-gradient-to-b from-emerald-50/80 to-white p-7 text-center shadow-[0_4px_24px_-4px_rgba(0,188,125,0.12)] ring-2 ring-brand-green/15">
                <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-green/15 text-5xl shadow-inner ring-1 ring-brand-green/25">
                  💳
                </div>
                <h3 className="text-[2.25rem] font-extrabold text-slate-900">KrediYa</h3>
                <p className="mt-2 text-[1.35rem] font-semibold text-slate-500">Pago de cuotas</p>
              </div>
            </div>
          </div>

          <footer className="relative z-10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-8 py-9 text-center">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-brand-green via-emerald-400 to-brand-green" />
            <p className="text-[2.85rem] font-black leading-tight tracking-tight text-white">
              <span aria-hidden className="mr-2">
                📲
              </span>
              ¡Pregunta por tu recibo aquí!
            </p>
            <p className="mt-3 text-[1.65rem] font-semibold text-brand-green">
              Aceptamos efectivo y transferencias
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
