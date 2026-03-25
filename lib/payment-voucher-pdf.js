import { readFileSync, existsSync } from "fs";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/**
 * @param {string} hex
 * @returns {{ r: number; g: number; b: number }}
 */
function hexToRgb(hex) {
  const normalized = (hex ?? "").replace("#", "").trim();
  if (normalized.length !== 6) return { r: 0, g: 0, b: 0 };
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return {
    r: Number.isNaN(r) ? 0 : r / 255,
    g: Number.isNaN(g) ? 0 : g / 255,
    b: Number.isNaN(b) ? 0 : b / 255,
  };
}

/**
 * @param {string} hex
 * @returns {import("pdf-lib").RGB}
 */
function rgbFromHex(hex) {
  const { r, g, b } = hexToRgb(hex);
  return rgb(r, g, b);
}

/**
 * Commission by total_amount: $0.50 → $0.25; $1 → $0.50; >$1 and <$50 → $1; etc.
 * @param {number} totalAmount
 * @returns {number}
 */
function computeServiceFee(totalAmount) {
  const n = Number(totalAmount);
  if (Number.isNaN(n) || n < 0) return 0;
  if (n === 0) return 0;
  if (n === 0.5) return 0.25;
  if (n === 1) return 0.5;
  if (n < 50) return 1;
  return Math.floor(n / 50) + 1;
}

const MONTHS_ES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

/**
 * @param {string | null | undefined} isoString
 * @returns {string}
 */
function formatDateEs(isoString) {
  if (!isoString) return "—";
  const d = new Date(isoString);
  const day = d.getDate();
  const month = MONTHS_ES[d.getMonth()];
  const year = d.getFullYear();
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "p." : "a.";
  h = h % 12 || 12;
  const min = m < 10 ? `0${m}` : String(m);
  return `${day} ${month} ${year}, ${h}:${min} ${ampm} m.`;
}

/**
 * Header-friendly date: dd/mm/aaaa - hh:mm (24h)
 * @param {string | null | undefined} isoString
 * @returns {string}
 */
function formatDateForHeader(isoString) {
  if (!isoString) return "—";
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, "0");
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${day}/${month}/${year} - ${hh}:${mm}`;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function formatMoney(value) {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("es-SV", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

/**
 * @param {{
 *   paymentId: string;
 *   createdAt: string | null;
 *   totalAmount: number;
 *   commission: number | null;
 *   statusLabel: string;
 *   paymentMethodName: string;
 *   clientName: string;
 *   serviceName: string;
 *   accountReceiptNumber: string;
 * }} data
 * @returns {Promise<Uint8Array>}
 */
export async function buildPaymentVoucherPdfBytes(data) {
  const invoiceAmount = Number(data.totalAmount) || 0;
  let serviceFee =
    data.commission == null ? computeServiceFee(invoiceAmount) : Number(data.commission);
  if (Number.isNaN(serviceFee)) serviceFee = computeServiceFee(invoiceAmount);
  const total = invoiceAmount + serviceFee;
  const paymentIdFull = String(data.paymentId ?? "");
  const paymentIdShort =
    paymentIdFull.length > 10 ? paymentIdFull.slice(-8) : paymentIdFull;

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  const margin = 48;
  const cardPadding = 18;
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const textColor = rgb(0.12, 0.12, 0.14);
  const mutedColor = rgb(0.42, 0.42, 0.46);
  const borderColor = rgb(0.88, 0.9, 0.92);
  const surfaceColor = rgb(0.98, 0.985, 0.99);
  const white = rgb(1, 1, 1);
  const brandGreen = rgbFromHex("#00BC7D");
  const brandGreenDark = rgbFromHex("#0a7a57");

  // Header
  const headerH = 120;
  page.drawRectangle({
    x: 0,
    y: height - headerH,
    width,
    height: headerH,
    color: brandGreen,
  });

  const headerTop = height - 26;
  const headerLeft = margin;

  // Logo (no white plate)
  const logoPath = path.join(process.cwd(), "public", "DAIEGO.png");
  if (existsSync(logoPath)) {
    try {
      const logoBytes = readFileSync(logoPath);
      const logoImage = await pdfDoc.embedPng(logoBytes);
      const maxLogoW = 150;
      const maxLogoH = 72;
      const scale = Math.min(maxLogoW / logoImage.width, maxLogoH / logoImage.height, 1);
      const lw = logoImage.width * scale;
      const lh = logoImage.height * scale;
      page.drawImage(logoImage, {
        x: headerLeft,
        y: height - headerH + (headerH - lh) / 2,
        width: lw,
        height: lh,
      });
    } catch {
      // ignore logo failures
    }
  }

  // Title + meta on header
  const title = "Comprobante de Pago";
  page.drawText(title, {
    x: headerLeft + 170,
    y: headerTop - 28,
    size: 20,
    font: fontBold,
    color: white,
  });

  const metaRightX = width - margin;
  const metaTopY = headerTop - 8;
  const metaLines = [
    ["Fecha", formatDateForHeader(data.createdAt)],
  ];

  let metaY = metaTopY;
  for (const [label, value] of metaLines) {
    const labelText = String(label);
    const valueText = String(value);
    const labelW = fontBold.widthOfTextAtSize(labelText, 9);
    const valueW = font.widthOfTextAtSize(valueText, 10);

    page.drawText(labelText, {
      x: metaRightX - Math.max(labelW, valueW),
      y: metaY,
      size: 9,
      font: fontBold,
      color: rgb(0.92, 1, 0.97),
    });
    metaY -= 14;
    page.drawText(valueText, {
      x: metaRightX - Math.max(labelW, valueW),
      y: metaY,
      size: 10,
      font,
      color: white,
    });
    metaY -= 16;
  }

  // Body
  let cursorY = height - headerH - 22;

  // Status badge
  const isPaid = (data.statusLabel ?? "").toLowerCase().includes("pag");
  const badgeBg = isPaid ? rgbFromHex("#e7fff6") : rgbFromHex("#fff7e6");
  const badgeBorder = isPaid ? rgbFromHex("#9ff0d6") : rgbFromHex("#ffd59a");
  const badgeText = isPaid ? brandGreenDark : rgbFromHex("#9a6200");
  const badgeLabel = String(data.statusLabel ?? "—");
  const badgePadX = 10;
  const badgePadY = 6;
  const badgeFontSize = 10;
  const badgeTextW = fontBold.widthOfTextAtSize(badgeLabel, badgeFontSize);
  const badgeW = badgeTextW + badgePadX * 2;
  const badgeH = badgeFontSize + badgePadY * 2;
  const badgeX = margin;
  const badgeY = cursorY - badgeH;
  page.drawRectangle({
    x: badgeX,
    y: badgeY,
    width: badgeW,
    height: badgeH,
    color: badgeBg,
    borderColor: badgeBorder,
    borderWidth: 1,
  });
  page.drawText(badgeLabel, {
    x: badgeX + badgePadX,
    y: badgeY + badgePadY + 1,
    size: badgeFontSize,
    font: fontBold,
    color: badgeText,
  });
  cursorY = badgeY - 18;

  // Info card
  const cardW = width - margin * 2;
  const infoCardH = 184;
  const infoX = margin;
  const infoY = cursorY - infoCardH;
  page.drawRectangle({
    x: infoX,
    y: infoY,
    width: cardW,
    height: infoCardH,
    color: surfaceColor,
    borderColor,
    borderWidth: 1,
  });

  const infoTitle = "Detalle del comprobante";
  page.drawText(infoTitle, {
    x: infoX + cardPadding,
    y: infoY + infoCardH - cardPadding - 6,
    size: 12,
    font: fontBold,
    color: textColor,
  });

  const leftColX = infoX + cardPadding;
  const rightColX = infoX + cardW / 2 + 10;
  const rowTopY = infoY + infoCardH - cardPadding - 30;
  const rowLabelSize = 9;
  const rowValueSize = 12;
  const rowBlockGap = 40;

  const leftBlocks = [
    ["Cliente", data.clientName],
    ["Servicio", data.serviceName],
  ];
  const rightBlocks = [
    ["Cuenta / recibo", data.accountReceiptNumber || "—"],
    ["Metodo de pago", data.paymentMethodName],
  ];

  let leftY = rowTopY;
  for (const [label, value] of leftBlocks) {
    page.drawText(String(label).toUpperCase(), {
      x: leftColX,
      y: leftY,
      size: rowLabelSize,
      font: fontBold,
      color: mutedColor,
    });
    page.drawText(String(value ?? "—"), {
      x: leftColX,
      y: leftY - 18,
      size: rowValueSize,
      font,
      color: textColor,
    });
    leftY -= rowBlockGap;
  }

  let rightY = rowTopY;
  for (const [label, value] of rightBlocks) {
    page.drawText(String(label).toUpperCase(), {
      x: rightColX,
      y: rightY,
      size: rowLabelSize,
      font: fontBold,
      color: mutedColor,
    });
    page.drawText(String(value ?? "—"), {
      x: rightColX,
      y: rightY - 18,
      size: rowValueSize,
      font,
      color: textColor,
    });
    rightY -= rowBlockGap;
  }

  // Full id row (small, muted) under the columns
  const idLabel = "No. Comprobante";
  const idValue = paymentIdFull || "—";
  const idY = infoY + 18;
  page.drawText(idLabel, {
    x: infoX + cardPadding,
    y: idY + 14,
    size: 8.5,
    font: fontBold,
    color: mutedColor,
  });
  page.drawText(idValue, {
    x: infoX + cardPadding,
    y: idY,
    size: 9.5,
    font,
    color: mutedColor,
  });

  cursorY = infoY - 18;

  // Amounts card
  const amountsH = 170;
  const amountsY = cursorY - amountsH;
  page.drawRectangle({
    x: margin,
    y: amountsY,
    width: cardW,
    height: amountsH,
    color: white,
    borderColor,
    borderWidth: 1,
  });

  page.drawText("Resumen de pago", {
    x: margin + cardPadding,
    y: amountsY + amountsH - cardPadding - 6,
    size: 12,
    font: fontBold,
    color: textColor,
  });

  const tableX = margin + cardPadding;
  const tableW = cardW - cardPadding * 2;
  const tableRightX = tableX + tableW;
  const rowY0 = amountsY + amountsH - cardPadding - 34;
  const rowH = 26;

  const moneyRows = [
    ["Monto factura", formatMoney(invoiceAmount)],
    ["Costo por servicio", formatMoney(serviceFee)],
  ];

  let tY = rowY0;
  for (const [label, value] of moneyRows) {
    page.drawText(String(label), {
      x: tableX,
      y: tY,
      size: 11,
      font,
      color: textColor,
    });
    const valueText = String(value);
    const valueW = fontBold.widthOfTextAtSize(valueText, 11);
    page.drawText(valueText, {
      x: tableRightX - valueW,
      y: tY,
      size: 11,
      font: fontBold,
      color: textColor,
    });
    // divider
    page.drawLine({
      start: { x: tableX, y: tY - 10 },
      end: { x: tableRightX, y: tY - 10 },
      thickness: 1,
      color: borderColor,
    });
    tY -= rowH;
  }

  // Total highlight row
  const totalRowY = tY - 16;
  const totalRowH = 36;
  page.drawRectangle({
    x: tableX,
    y: totalRowY - 6,
    width: tableW,
    height: totalRowH,
    color: rgbFromHex("#e7fff6"),
    borderColor: rgbFromHex("#9ff0d6"),
    borderWidth: 1,
  });

  page.drawText("Total", {
    x: tableX + 12,
    y: totalRowY + 8,
    size: 13,
    font: fontBold,
    color: brandGreenDark,
  });
  const totalText = formatMoney(total);
  const totalW = fontBold.widthOfTextAtSize(totalText, 15);
  page.drawText(totalText, {
    x: tableRightX - totalW - 12,
    y: totalRowY + 6,
    size: 15,
    font: fontBold,
    color: brandGreenDark,
  });

  cursorY = amountsY - 24;

  const footer = "Documento generado electronicamente — DAIEGO";
  const footerW = font.widthOfTextAtSize(footer, 9);
  page.drawText(footer, {
    x: (width - footerW) / 2,
    y: margin - 20,
    size: 9,
    font,
    color: mutedColor,
  });

  return pdfDoc.save();
}
