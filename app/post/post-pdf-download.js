"use client";

import { useCallback, useState } from "react";
import html2canvas from "html2canvas";
import { PDFDocument } from "pdf-lib";

const POSTER_ID = "poster";

/** Puntos: A4 vertical (tamaño habitual al imprimir / previsualizar). */
const A4_W_PT = 595.28;
const A4_H_PT = 841.89;
/** Carta US en puntos (72 dpi): 8.5" × 11". */
const LETTER_W_PT = 612;
const LETTER_H_PT = 792;
const PDF_MARGIN_PT = 28;

const hasModernColorFn = (val) =>
  typeof val === "string" && /oklab|oklch/i.test(val);

const stripExternalStylesheets = (clonedDoc) => {
  clonedDoc.querySelectorAll('link[rel="stylesheet"]').forEach((n) => n.remove());
  clonedDoc.querySelectorAll("style").forEach((n) => n.remove());
};

/**
 * Solo propiedades necesarias para layout/tipo/colores; evita conflictos y
 * valores erróneos al copiar todo el computed (p. ej. fondo blanco en chips).
 */
const PDF_STYLE_PROPS = [
  "display",
  "position",
  "top",
  "left",
  "right",
  "bottom",
  "z-index",
  "flex-direction",
  "flex-wrap",
  "justify-content",
  "align-items",
  "align-content",
  "align-self",
  "flex",
  "flex-grow",
  "flex-shrink",
  "flex-basis",
  "gap",
  "row-gap",
  "column-gap",
  "width",
  "height",
  "min-width",
  "max-width",
  "min-height",
  "max-height",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
  "border-top-style",
  "border-right-style",
  "border-bottom-style",
  "border-left-style",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "border-radius",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-bottom-right-radius",
  "border-bottom-left-radius",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "line-height",
  "letter-spacing",
  "text-align",
  "text-transform",
  "vertical-align",
  "white-space",
  "color",
  "background-color",
  "background-image",
  "background-size",
  "background-repeat",
  "background-position",
  "box-shadow",
  "opacity",
  "visibility",
  "overflow",
  "overflow-x",
  "overflow-y",
  "box-sizing",
];

const resolveComputedValue = (propName, value) => {
  if (value == null || value === "") return "";
  const v = String(value).trim();
  if (!hasModernColorFn(v)) return v;

  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;left:-99999px;top:0;visibility:hidden;pointer-events:none;";
  try {
    probe.style.setProperty(propName, v);
  } catch {
    return "";
  }
  document.body.appendChild(probe);
  const resolved = window.getComputedStyle(probe).getPropertyValue(propName);
  document.body.removeChild(probe);
  const t = resolved?.trim() ?? "";
  if (t && !hasModernColorFn(t)) return t;

  if (propName.includes("background-image")) return "none";
  if (propName.includes("box-shadow")) return "none";
  if (propName.includes("filter")) return "none";
  if (propName.includes("border") && propName.includes("color")) return "rgb(226, 232, 240)";
  if (propName === "color" || propName.endsWith("-color")) return "rgb(15, 23, 42)";
  if (propName.includes("background-color")) return "transparent";
  return "";
};

const copyComputedStylesOntoClone = (origRoot, cloneRoot) => {
  const origList = [origRoot, ...origRoot.querySelectorAll("*")];
  const cloneList = [cloneRoot, ...cloneRoot.querySelectorAll("*")];
  if (origList.length !== cloneList.length) return;

  for (let i = 0; i < origList.length; i += 1) {
    const orig = origList[i];
    const clone = cloneList[i];
    if (orig.nodeType !== 1 || clone.nodeType !== 1) continue;

    clone.removeAttribute("class");
    const cs = window.getComputedStyle(orig);

    for (const name of PDF_STYLE_PROPS) {
      const raw = cs.getPropertyValue(name);
      if (raw === "" || raw == null) continue;
      let out = resolveComputedValue(name, raw);
      if (out === "" && raw && !hasModernColorFn(raw)) out = raw;
      if (out === "") continue;
      try {
        clone.style.setProperty(name, out);
      } catch {
        // ignore
      }
    }
  }

  cloneRoot.style.setProperty("width", "1080px", "important");
  cloneRoot.style.setProperty("max-width", "1080px", "important");
  cloneRoot.style.setProperty("min-width", "1080px", "important");
  cloneRoot.style.setProperty("box-sizing", "border-box", "important");
  cloneRoot.style.setProperty("margin-left", "auto", "important");
  cloneRoot.style.setProperty("margin-right", "auto", "important");

  const headline = cloneRoot.querySelector("[data-pdf-export='gradient-headline']");
  if (headline) {
    headline.style.setProperty("color", "#00bc7d", "important");
    headline.style.setProperty("background-image", "none", "important");
    headline.style.setProperty("-webkit-text-fill-color", "#00bc7d", "important");
    headline.style.setProperty("background-clip", "border-box", "important");
  }
};

const fixPdfCloneStyles = (clonedDoc) => {
  stripExternalStylesheets(clonedDoc);

  const origPoster = document.getElementById(POSTER_ID);
  const clonedPoster = clonedDoc.getElementById(POSTER_ID);
  if (!origPoster || !clonedPoster) return;

  copyComputedStylesOntoClone(origPoster, clonedPoster);

  let node = clonedPoster.parentElement;
  while (node && node !== clonedDoc.body) {
    node.style.transform = "none";
    node.style.transformOrigin = "top center";
    node = node.parentElement;
  }
};

const canvasToPngBytes = async (canvas) => {
  const fromBlob = () =>
    new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error("toBlob devolvió null (canvas no exportable)"));
        },
        "image/png",
        1
      );
    });

  try {
    const blob = await fromBlob();
    return new Uint8Array(await blob.arrayBuffer());
  } catch {
    const dataUrl = canvas.toDataURL("image/png");
    if (!dataUrl || dataUrl === "data:,") {
      throw new Error("No se pudo leer el canvas como imagen");
    }
    const base64 = dataUrl.split(",")[1];
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
};

const capturePosterToCanvas = async (poster, scale) => {
  await document.fonts.ready.catch(() => {});

  return html2canvas(poster, {
    scale,
    useCORS: true,
    allowTaint: false,
    logging: false,
    backgroundColor: "#ffffff",
    onclone: fixPdfCloneStyles,
  });
};

/** Encaja la imagen en la página con márgenes; evita página “enorme” y bordes raros en el visor. */
const buildPdfWithImageFitPage = async (pngBytes, pageWidthPt, pageHeightPt) => {
  const pdfDoc = await PDFDocument.create();
  const image = await pdfDoc.embedPng(pngBytes);
  const iw = image.width;
  const ih = image.height;

  const maxW = pageWidthPt - 2 * PDF_MARGIN_PT;
  const maxH = pageHeightPt - 2 * PDF_MARGIN_PT;
  const fit = Math.min(maxW / iw, maxH / ih, 1);
  const dw = iw * fit;
  const dh = ih * fit;
  const x = (pageWidthPt - dw) / 2;
  const y = (pageHeightPt - dh) / 2;

  const page = pdfDoc.addPage([pageWidthPt, pageHeightPt]);
  page.drawImage(image, {
    x,
    y,
    width: dw,
    height: dh,
  });

  return pdfDoc.save();
};

export function PostPdfDownload({
  downloadFileName = "Cartel-DAIEGO.pdf",
  /** Si true, solo el botón (sin contenedor sticky); útil en barras de herramientas. */
  embedded = false,
  /** "a4" por defecto; "letter" para carta US (p. ej. vista Post). */
  pageFormat = "a4",
  /** Con pageFormat "letter": true = apaisado 11"×8.5". */
  letterLandscape = false,
}) {
  const [isExporting, setIsExporting] = useState(false);

  const handleDownloadPdf = useCallback(async () => {
    const poster = document.getElementById(POSTER_ID);
    if (!poster) {
      alert("No se encontró el cartel para exportar.");
      return;
    }

    setIsExporting(true);
    try {
      let canvas;
      let lastErr;

      for (const scale of [1.5, 1.25, 1]) {
        try {
          canvas = await capturePosterToCanvas(poster, scale);
          if (canvas.width > 0 && canvas.height > 0) break;
          lastErr = new Error("Canvas con tamaño 0");
        } catch (e) {
          lastErr = e;
        }
      }

      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw lastErr ?? new Error("No se pudo capturar el cartel");
      }

      const pngBytes = await canvasToPngBytes(canvas);
      let pageW = A4_W_PT;
      let pageH = A4_H_PT;
      if (pageFormat === "letter") {
        pageW = letterLandscape ? LETTER_H_PT : LETTER_W_PT;
        pageH = letterLandscape ? LETTER_W_PT : LETTER_H_PT;
      }
      const pdfBytes = await buildPdfWithImageFitPage(pngBytes, pageW, pageH);

      const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = downloadFileName;
      link.rel = "noopener";
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export PDF:", err);
      const msg = err instanceof Error ? err.message : String(err);
      alert(
        `No se pudo generar el PDF. ${msg ? `Detalle: ${msg}` : ""} Prueba de nuevo o recarga la página.`
      );
    } finally {
      setIsExporting(false);
    }
  }, [downloadFileName, pageFormat, letterLandscape]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (!isExporting) handleDownloadPdf();
      }
    },
    [handleDownloadPdf, isExporting]
  );

  const button = (
    <button
      type="button"
      onClick={handleDownloadPdf}
      onKeyDown={handleKeyDown}
      disabled={isExporting}
      aria-busy={isExporting}
      aria-label={
        isExporting ? "Generando PDF del cartel" : "Descargar cartel como PDF"
      }
      className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-zinc-800 to-zinc-950 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-zinc-900/30 ring-1 ring-white/10 transition hover:from-zinc-700 hover:to-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-offset-zinc-950"
    >
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
          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      {isExporting ? "Generando PDF…" : "Descargar PDF"}
    </button>
  );

  if (embedded) {
    return button;
  }

  return (
    <div className="sticky top-0 z-50 flex w-full justify-center px-4 pb-3 pt-2">
      {button}
    </div>
  );
}
