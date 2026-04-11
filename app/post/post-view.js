"use client";

import { useLayoutEffect, useRef, useState } from "react";

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

const chipBase =
  "inline-flex items-center justify-center rounded-2xl px-6 py-3 text-[1.65rem] font-bold leading-tight tracking-wide shadow-md ring-1 ring-white/25";

const chipBaseDense =
  "inline-flex items-center justify-center rounded-xl px-2.5 py-1.5 text-sm font-bold leading-tight tracking-wide shadow-sm ring-1 ring-white/20 sm:px-3.5 sm:py-1.5 sm:text-[0.9375rem]";

/** Chips en cartel horizontal (misma jerarquía que dense, texto más grande). */
const chipBaseDenseLg =
  "inline-flex items-center justify-center rounded-xl px-3.5 py-2 text-[1.0625rem] font-bold leading-tight tracking-wide shadow-sm ring-1 ring-white/20 sm:px-4 sm:py-2.5 sm:text-[1.125rem]";

/** Catálogos en horizontal: muchas etiquetas; caben en 2 filas sin pegar al borde. */
const chipBaseDenseLgCompact =
  "inline-flex max-w-full items-center justify-center rounded-lg px-2 py-1 text-[0.8125rem] font-bold leading-tight tracking-wide shadow-sm ring-1 ring-white/15 sm:px-2.5 sm:py-1.5 sm:text-[0.875rem]";

/** Catálogos: una sola franja que envuelve por ancho (sin rejilla forzada de 2 columnas). */
function CatalogChipStrip({ denseLg = false }) {
  const gap = denseLg ? "gap-x-1.5 gap-y-1.5 sm:gap-x-2 sm:gap-y-2" : "gap-x-2 gap-y-2 sm:gap-x-2.5 sm:gap-y-2.5";
  return (
    <div className={`flex w-full max-w-full min-w-0 flex-wrap content-center items-center justify-center px-0.5 ${gap}`}>
      {catalogNames.map((name) => (
        <Chip key={name} tone="rose" dense denseLg={denseLg} compact={denseLg}>
          {name}
        </Chip>
      ))}
    </div>
  );
}

/** Juegos: misma lógica de franja flexible centrada. */
function GameChipStrip({ denseLg = false }) {
  const gap = denseLg ? "gap-x-2.5 gap-y-2.5 sm:gap-x-3 sm:gap-y-3" : "gap-x-2 gap-y-2 sm:gap-x-2.5 sm:gap-y-2.5";
  return (
    <div
      className={`flex w-full max-w-full min-w-0 flex-wrap content-center items-center justify-center px-0.5 ${gap}`}
    >
      {gameNames.map((name) => (
        <Chip key={name} tone="slate" dense denseLg={denseLg}>
          {name}
        </Chip>
      ))}
    </div>
  );
}

/** Telefonía y línea fija: todas las marcas en una sola fila. */
function TelephonyChipStrip({ denseLg = false }) {
  const gap = denseLg ? "gap-2 sm:gap-2.5" : "gap-1.5 sm:gap-2";
  return (
    <div
      className={`flex w-full max-w-full min-w-0 flex-wrap content-center items-center justify-center ${gap}`}
    >
      <Chip tone="slate" dense denseLg={denseLg}>
        CLARO
      </Chip>
      <Chip tone="slate" dense denseLg={denseLg}>
        TIGO
      </Chip>
      <Chip tone="slate" dense denseLg={denseLg}>
        Digicel
      </Chip>
      <Chip tone="green" dense denseLg={denseLg}>
        Telefónica
      </Chip>
      <Chip tone="slate" dense denseLg={denseLg}>
        Sky+
      </Chip>
    </div>
  );
}

function IconTile({ emoji, accent, dense, denseLg }) {
  const accentClass =
    accent === "green"
      ? "from-emerald-50/95 to-teal-50/90 ring-emerald-200/70 shadow-sm shadow-emerald-900/5"
      : accent === "red"
        ? "from-rose-50/95 to-red-50/85 ring-rose-200/70 shadow-sm shadow-rose-900/5"
        : "from-slate-50 to-zinc-100/90 ring-slate-200/80 shadow-sm shadow-slate-900/5";

  const size = dense
    ? denseLg
      ? "h-[3.25rem] w-[3.25rem] rounded-xl text-[1.55rem] sm:h-14 sm:w-14 sm:rounded-2xl sm:text-[1.8rem]"
      : "h-11 w-11 rounded-xl text-[1.35rem] sm:h-12 sm:w-12 sm:rounded-2xl sm:text-[1.5rem]"
    : "h-[4.5rem] w-[4.5rem] rounded-2xl text-[2.35rem]";

  return (
    <div
      className={`flex shrink-0 items-center justify-center bg-gradient-to-br leading-none shadow-inner ring-1 ring-inset ring-white/40 ${size} ${accentClass}`}
      aria-hidden
    >
      {emoji}
    </div>
  );
}

function SectionShell({ icon, iconAccent, title, children, highlight, dense, denseLg, fillHeight }) {
  const pad = dense ? (denseLg ? "p-4 sm:p-5" : "p-3.5 sm:p-4") : "p-7";
  const gap = dense ? (denseLg ? "gap-3 sm:gap-4" : "gap-2.5 sm:gap-3") : "gap-5";
  const titleClass = dense
    ? denseLg
      ? "text-[1.45rem] font-extrabold leading-snug tracking-tight text-slate-800 sm:text-[1.65rem]"
      : "text-[1.2rem] font-extrabold leading-snug tracking-tight text-slate-800 sm:text-[1.35rem]"
    : "text-[2.1rem] font-extrabold leading-snug tracking-tight text-slate-800";
  const innerPt = dense ? (denseLg ? "pt-3 sm:pt-4" : "pt-2.5 sm:pt-3") : "pt-5";
  const iconRowGap = denseLg ? "gap-3 sm:gap-3.5" : "gap-2.5 sm:gap-3";

  const fillRoot = fillHeight ? "flex h-full min-h-0 flex-col" : "";
  const fillInner = fillHeight ? "min-h-0 flex flex-1 flex-col" : "";
  const borderInner = `border-t border-slate-200/50 ${innerPt}`;

  const shellSurface = highlight
    ? "border-emerald-300/50 bg-gradient-to-br from-white via-emerald-50/30 to-white shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_2px_8px_-2px_rgba(15,23,42,0.06),0_12px_32px_-8px_rgba(16,185,129,0.12)] ring-1 ring-emerald-400/25"
    : "border-slate-200/70 bg-gradient-to-br from-white via-white to-slate-50/90 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_2px_8px_-2px_rgba(15,23,42,0.05),0_10px_28px_-10px_rgba(15,23,42,0.08)]";

  return (
    <div
      className={`rounded-2xl border ${shellSurface} ${pad} ${fillRoot} ${fillHeight ? "min-w-0" : ""}`}
    >
      <div className={`flex flex-col ${gap} ${fillInner}`}>
        <div className={`flex shrink-0 items-center ${iconRowGap}`}>
          <IconTile emoji={icon} accent={iconAccent} dense={dense} denseLg={denseLg} />
          <div className="min-w-0 text-left">
            <h3 className={titleClass}>{title}</h3>
          </div>
        </div>
        {fillHeight ? (
          <div className={`${borderInner} flex min-h-0 flex-1 flex-col`}>
            <div className="flex min-h-10 w-full flex-1 items-center justify-center px-1 py-1">
              {children}
            </div>
          </div>
        ) : (
          <div className={borderInner}>{children}</div>
        )}
      </div>
    </div>
  );
}

function Chip({ children, tone, dense, denseLg, compact }) {
  const base = dense
    ? denseLg
      ? compact
        ? chipBaseDenseLgCompact
        : chipBaseDenseLg
      : chipBaseDense
    : chipBase;
  const tones = {
    green: `${base} bg-gradient-to-b from-emerald-400 via-brand-green to-teal-700 text-white shadow-emerald-900/25`,
    red: `${base} bg-gradient-to-b from-rose-400 via-brand-red to-red-800 text-white shadow-red-900/25`,
    slate: `${base} bg-gradient-to-b from-slate-600 to-slate-950 text-white shadow-slate-900/30`,
    rose: `${base} bg-gradient-to-b from-rose-400 to-rose-800 text-white shadow-rose-900/20`,
  };

  return <span className={tones[tone] ?? tones.slate}>{children}</span>;
}

function PosterPortrait() {
  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <header className="relative z-10 shrink-0 overflow-hidden border-b border-emerald-200/40 bg-gradient-to-b from-zinc-50/95 via-white to-emerald-50/35 px-6 pb-5 pt-6 text-center sm:px-10 sm:pb-6 sm:pt-7">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_55%_at_50%_-15%,rgba(16,185,129,0.14),transparent_55%)]"
          aria-hidden
        />
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent" />
        <div className="relative mb-3 flex justify-center sm:mb-4">
          <div className="rounded-2xl bg-gradient-to-b from-zinc-900 to-black p-2.5 shadow-xl shadow-zinc-900/25 ring-4 ring-white/95 ring-offset-2 ring-offset-emerald-50/50 sm:p-3">
            <img src="/DAIEGO.png" alt="Logo DAIEGO" className="h-20 w-auto object-contain sm:h-24" />
          </div>
        </div>
        <div className="relative mb-3 inline-flex items-center rounded-full bg-gradient-to-r from-rose-500 to-brand-red px-5 py-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-white shadow-lg shadow-red-900/20 ring-1 ring-white/25 sm:mb-4 sm:px-7 sm:py-2 sm:text-sm">
          ¡Evita las filas!
        </div>
        <h1 className="relative text-[clamp(2.25rem,6.5vw,4.25rem)] font-black leading-[0.95] tracking-tight text-slate-900">
          PAGO DE
        </h1>
        <h2
          data-pdf-export="gradient-headline"
          className="relative mt-0.5 bg-gradient-to-r from-emerald-600 via-brand-green to-teal-600 bg-clip-text text-[clamp(1.85rem,5.2vw,3.5rem)] font-black leading-tight tracking-tight text-transparent drop-shadow-[0_1px_0_rgba(255,255,255,0.4)]"
        >
          RECIBOS Y FACTURAS
        </h2>
        <p className="relative mt-2 text-[clamp(0.95rem,2.2vw,1.35rem)] font-medium text-slate-600 sm:mt-3">
          Fácil, rápido y 100% seguro <span aria-hidden>🔒</span>
        </p>
      </header>

      <div className="relative z-10 grid min-h-0 flex-1 grid-rows-[repeat(5,minmax(0,1fr))] gap-2.5 bg-gradient-to-b from-white via-slate-50/40 to-emerald-50/20 px-5 py-3 sm:gap-3 sm:px-10 sm:py-4">
        <div className="grid h-full min-h-0 grid-cols-2 gap-2.5 sm:gap-3">
          <SectionShell icon="💧" iconAccent="green" title="Agua" dense fillHeight>
            <div className="flex flex-wrap justify-center gap-2">
              <Chip tone="green" dense>
                ANDA
              </Chip>
            </div>
          </SectionShell>
          <SectionShell icon="⚡" iconAccent="red" title="Luz eléctrica" dense fillHeight>
            <div className="flex flex-wrap justify-center gap-2">
              <Chip tone="red" dense>
                CAESS
              </Chip>
              <Chip tone="red" dense>
                CLESA
              </Chip>
              <Chip tone="red" dense>
                DELSUR
              </Chip>
            </div>
          </SectionShell>
        </div>

        <div className="grid h-full min-h-0">
          <SectionShell icon="📱" iconAccent="neutral" title="Telefonía y línea fija" dense fillHeight>
            <TelephonyChipStrip />
          </SectionShell>
        </div>

        <div className="grid h-full min-h-0">
          <SectionShell icon="🛍️" iconAccent="neutral" title="Catálogos" dense fillHeight>
            <CatalogChipStrip />
          </SectionShell>
        </div>

        <div className="grid h-full min-h-0">
          <SectionShell icon="🎮" iconAccent="neutral" title="Recarga de juegos" dense fillHeight>
            <GameChipStrip />
          </SectionShell>
        </div>

        <div className="grid h-full min-h-0 grid-cols-2 gap-2.5 sm:gap-3">
          <PosterFeatureCard size="portrait">
            <div className="mb-1.5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200/80 text-2xl shadow-md shadow-slate-900/10 ring-1 ring-inset ring-white/60 sm:mb-2 sm:h-14 sm:w-14 sm:text-3xl">
              🎓
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 sm:text-xl">Universidades</h3>
            <p className="mt-0.5 text-xs font-semibold text-slate-500 sm:text-sm">Mensualidades</p>
          </PosterFeatureCard>
          <PosterFeatureCard size="portrait" highlight>
            <div className="mb-1.5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100/90 to-emerald-200/50 text-2xl shadow-md shadow-emerald-900/10 ring-1 ring-inset ring-white/50 sm:mb-2 sm:h-14 sm:w-14 sm:text-3xl">
              💳
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 sm:text-xl">KrediYa</h3>
            <p className="mt-0.5 text-xs font-semibold text-slate-500 sm:text-sm">Pago de cuotas</p>
          </PosterFeatureCard>
        </div>
      </div>

      <footer className="relative z-10 shrink-0 overflow-hidden bg-gradient-to-br from-zinc-950 via-slate-900 to-zinc-950 px-5 py-5 text-center sm:px-8 sm:py-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-emerald-600/80 via-brand-green to-teal-500/90" />
        <p className="relative text-[clamp(1.1rem,3.5vw,2.25rem)] font-black leading-tight tracking-tight text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.35)]">
          <span aria-hidden className="mr-2">
            📲
          </span>
          ¡Pregunta por tu recibo aquí!
        </p>
        <p className="relative mt-1.5 text-[clamp(0.8rem,1.8vw,1.25rem)] font-semibold text-emerald-300 sm:mt-2">
          Aceptamos efectivo y transferencias
        </p>
      </footer>
    </div>
  );
}

function PosterFeatureCard({ children, highlight, size = "landscape" }) {
  const pad =
    size === "portrait" ? "px-4 py-4 sm:px-5 sm:py-5" : "p-4 sm:p-5";

  const cardStylePortrait = highlight
    ? "border-emerald-300/45 bg-gradient-to-b from-emerald-50/90 via-white to-white shadow-[0_1px_0_rgba(255,255,255,0.85)_inset,0_8px_28px_-8px_rgba(16,185,129,0.18)] ring-1 ring-emerald-400/30"
    : "border-slate-200/70 bg-gradient-to-b from-white via-slate-50/50 to-white shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_6px_24px_-10px_rgba(15,23,42,0.08)]";

  const cardStyleLandscape = highlight
    ? "border-emerald-300/50 bg-gradient-to-br from-white via-emerald-50/30 to-white shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_2px_8px_-2px_rgba(15,23,42,0.06),0_12px_32px_-8px_rgba(16,185,129,0.12)] ring-1 ring-emerald-400/25"
    : "border-slate-200/70 bg-gradient-to-br from-white via-white to-slate-50/90 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_2px_8px_-2px_rgba(15,23,42,0.05),0_10px_28px_-10px_rgba(15,23,42,0.08)]";

  const cardStyle = size === "portrait" ? cardStylePortrait : cardStyleLandscape;
  const innerGap = size === "portrait" ? "gap-1" : "gap-2 sm:gap-2.5";

  return (
    <div
      className={`flex h-full min-h-0 flex-col items-center justify-center rounded-2xl border text-center ${pad} ${cardStyle} ${size === "landscape" ? "min-w-0" : ""}`}
    >
      <div
        className={`flex min-h-0 w-full max-w-full flex-1 flex-col items-center justify-center ${innerGap}`}
      >
        {children}
      </div>
    </div>
  );
}

function PosterLandscape() {
  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex min-h-0 flex-1 flex-row">
        <header className="relative z-10 flex h-full min-h-0 w-[380px] shrink-0 flex-col overflow-hidden border-r border-emerald-200/35 bg-gradient-to-br from-zinc-50/95 via-white to-emerald-50/30 px-5 py-5 text-center sm:w-[420px] sm:px-7 sm:py-6">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_70%_at_50%_0%,rgba(16,185,129,0.12),transparent_60%)]"
            aria-hidden
          />
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />
          <div className="min-h-0 flex-1" aria-hidden />
          <div className="relative flex shrink-0 flex-col items-center gap-3 sm:gap-4">
            <div className="rounded-xl bg-gradient-to-b from-zinc-900 to-black p-2.5 shadow-xl shadow-zinc-900/20 ring-2 ring-white/90 sm:rounded-2xl sm:p-3.5">
              <img src="/DAIEGO.png" alt="Logo DAIEGO" className="h-[4.25rem] w-auto object-contain sm:h-28" />
            </div>
            <div className="inline-flex items-center rounded-full bg-gradient-to-r from-rose-500 to-brand-red px-4 py-2 text-sm font-extrabold uppercase tracking-wider text-white shadow-md shadow-red-900/15 ring-1 ring-white/25 sm:px-5 sm:py-2 sm:text-base">
              ¡Evita las filas!
            </div>
            <div className="flex flex-col gap-1.5 px-1">
              <h1 className="text-[2.25rem] font-black leading-none tracking-tight text-slate-900 sm:text-6xl">
                PAGO DE
              </h1>
              <h2
                data-pdf-export="gradient-headline"
                className="bg-gradient-to-r from-emerald-600 via-brand-green to-teal-600 bg-clip-text text-[1.85rem] font-black leading-tight tracking-tight text-transparent sm:text-5xl"
              >
                RECIBOS Y FACTURAS
              </h2>
            </div>
            <p className="max-w-[17rem] text-base font-medium leading-snug text-slate-600 sm:max-w-[19rem] sm:text-xl">
              Fácil, rápido y 100% seguro <span aria-hidden>🔒</span>
            </p>
          </div>
          <div className="min-h-0 flex-1" aria-hidden />
        </header>

        <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col bg-gradient-to-b from-white via-slate-50/35 to-emerald-50/15 p-3 sm:p-4">
          <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,0.9fr)_minmax(0,0.85fr)_minmax(0,1.75fr)_minmax(0,0.9fr)] gap-3">
            <div className="col-span-2 grid min-h-0 h-full min-w-0 grid-cols-2 gap-3">
              <SectionShell icon="💧" iconAccent="green" title="Agua" dense denseLg fillHeight>
                <div className="flex w-full max-w-full flex-wrap content-center items-center justify-center gap-2.5 sm:gap-3">
                  <Chip tone="green" dense denseLg>
                    ANDA
                  </Chip>
                </div>
              </SectionShell>
              <SectionShell icon="⚡" iconAccent="red" title="Luz eléctrica" dense denseLg fillHeight>
                <div className="flex w-full max-w-full flex-wrap content-center items-center justify-center gap-2.5 sm:gap-3">
                  <Chip tone="red" dense denseLg>
                    CAESS
                  </Chip>
                  <Chip tone="red" dense denseLg>
                    CLESA
                  </Chip>
                  <Chip tone="red" dense denseLg>
                    DELSUR
                  </Chip>
                </div>
              </SectionShell>
            </div>

            <div className="col-span-2 grid min-h-0 h-full min-w-0">
              <SectionShell icon="📱" iconAccent="neutral" title="Telefonía y línea fija" dense denseLg fillHeight>
                <TelephonyChipStrip denseLg />
              </SectionShell>
            </div>

            <div className="col-span-2 grid min-h-0 h-full min-w-0 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
              <SectionShell icon="🛍️" iconAccent="neutral" title="Catálogos" dense denseLg fillHeight>
                <CatalogChipStrip denseLg />
              </SectionShell>
              <SectionShell icon="🎮" iconAccent="neutral" title="Recarga de juegos" dense denseLg fillHeight>
                <GameChipStrip denseLg />
              </SectionShell>
            </div>

            <div className="col-span-2 grid min-h-0 h-full min-w-0 grid-cols-2 gap-3 items-stretch">
              <PosterFeatureCard>
                <div className="mb-0.5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200/80 text-[1.65rem] shadow-md shadow-slate-900/10 ring-1 ring-inset ring-white/60 sm:mb-1 sm:h-14 sm:w-14 sm:rounded-2xl sm:text-[1.8rem]">
                  🎓
                </div>
                <h3 className="text-lg font-extrabold leading-snug tracking-tight text-slate-900 sm:text-xl">
                  Universidades
                </h3>
                <p className="text-sm font-semibold text-slate-500 sm:text-base">Mensualidades</p>
              </PosterFeatureCard>
              <PosterFeatureCard highlight>
                <div className="mb-0.5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100/90 to-emerald-200/50 text-[1.65rem] shadow-md shadow-emerald-900/10 ring-1 ring-inset ring-white/50 sm:mb-1 sm:h-14 sm:w-14 sm:rounded-2xl sm:text-[1.8rem]">
                  💳
                </div>
                <h3 className="text-lg font-extrabold leading-snug tracking-tight text-slate-900 sm:text-xl">KrediYa</h3>
                <p className="text-sm font-semibold text-slate-500 sm:text-base">Pago de cuotas</p>
              </PosterFeatureCard>
            </div>
          </div>
        </div>
      </div>

      <footer className="relative z-10 flex shrink-0 flex-col items-center justify-center gap-3 overflow-hidden bg-gradient-to-r from-zinc-950 via-slate-900 to-zinc-950 px-5 py-8 sm:flex-row sm:justify-between sm:gap-4 sm:px-8 sm:py-9">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-600/90 via-brand-green to-teal-500/90" />
        <p className="relative text-center text-2xl font-black leading-tight tracking-tight text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.4)] sm:text-left sm:text-3xl">
          <span aria-hidden className="mr-1.5 sm:mr-2">
            📲
          </span>
          ¡Pregunta por tu recibo aquí!
        </p>
        <p className="relative text-center text-base font-semibold text-emerald-300 sm:text-right sm:text-lg">
          Aceptamos efectivo y transferencias
        </p>
      </footer>
    </div>
  );
}

const DESIGN_WIDTH = { portrait: 1080, landscape: 1584 };

function measurePosterSize(poster) {
  const prev = poster.style.transform;
  poster.style.transform = "none";
  const pw = poster.offsetWidth;
  const ph = poster.offsetHeight;
  poster.style.transform = prev;
  return { pw, ph };
}

export function PostView({ landscape = false }) {
  const frameRef = useRef(null);
  const [slot, setSlot] = useState({ pw: 1080, ph: 2200, s: 0.4 });

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const poster = document.getElementById("poster");
    if (!frame || !poster) return;

    const measure = () => {
      const pad = 16;
      const fw = Math.max(0, frame.clientWidth - pad);
      const fh = Math.max(0, frame.clientHeight - pad);
      const { pw, ph } = measurePosterSize(poster);
      if (pw <= 0 || ph <= 0 || fw <= 0 || fh <= 0) return;
      const s = Math.min(fw / pw, fh / ph, 1);
      const safe = Number.isFinite(s) && s > 0 ? s : 0.25;
      setSlot({ pw, ph, s: safe });
    };

    measure();
    const roFrame = new ResizeObserver(() => measure());
    const roPoster = new ResizeObserver(() => measure());
    roFrame.observe(frame);
    roPoster.observe(poster);

    let cancelled = false;
    document.fonts?.ready?.then(() => {
      if (!cancelled) measure();
    });

    return () => {
      cancelled = true;
      roFrame.disconnect();
      roPoster.disconnect();
    };
  }, [landscape]);

  const designW = landscape ? DESIGN_WIDTH.landscape : DESIGN_WIDTH.portrait;

  return (
    <div className="relative flex min-h-screen w-full min-w-0 flex-col items-center justify-start overflow-x-hidden bg-gradient-to-b from-zinc-200 via-emerald-50/40 to-zinc-200 px-3 pt-4 pb-14 sm:px-4">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(16,185,129,0.08),transparent_50%)]"
        aria-hidden
      />
      <div
        ref={frameRef}
        aria-label={
          landscape
            ? "Vista previa del cartel, horizontal tamaño carta"
            : "Vista previa del cartel, vertical tamaño carta"
        }
        className={`relative mx-auto w-full overflow-hidden rounded-3xl border border-white/60 bg-white/70 shadow-[0_4px_6px_-2px_rgba(15,23,42,0.04),0_24px_48px_-12px_rgba(15,23,42,0.14),0_0_0_1px_rgba(16,185,129,0.06)_inset] ring-1 ring-emerald-900/5 backdrop-blur-sm dark:border-zinc-700/50 dark:bg-zinc-900/50 dark:ring-emerald-500/10 ${
          landscape
            ? "aspect-[11/8.5] max-h-[min(86vh,calc(100vw*8.5/11))] max-w-[min(96vw,56rem)]"
            : "aspect-[8.5/11] max-h-[min(90vh,calc(100vw*11/8.5))] max-w-[min(96vw,44rem)]"
        }`}
      >
        <div className="flex h-full min-h-0 w-full items-center justify-center bg-gradient-to-b from-white/40 to-transparent p-2 sm:p-3">
          <div
            className="relative shrink-0"
            style={{
              width: Math.ceil(slot.pw * slot.s),
              height: Math.ceil(slot.ph * slot.s),
            }}
          >
            <div
              id="poster"
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: designW,
                ...(landscape ? { aspectRatio: "11 / 8.5" } : { aspectRatio: "8.5 / 11" }),
                transform: `scale(${slot.s})`,
                transformOrigin: "top left",
              }}
              className="flex min-h-0 flex-col overflow-visible rounded-[2rem] border border-slate-200/60 bg-white shadow-[0_2px_4px_rgba(15,23,42,0.04),0_24px_48px_-12px_rgba(15,23,42,0.12),0_0_0_1px_rgba(255,255,255,0.8)_inset] ring-1 ring-emerald-900/[0.04]"
            >
              {landscape ? <PosterLandscape /> : <PosterPortrait />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
