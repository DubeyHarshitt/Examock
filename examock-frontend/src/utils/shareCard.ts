// src/utils/shareCard.ts
//
// Ticket 20: generate a shareable score-card PNG client-side.
//
// Deliberately dependency-free (no html-to-image / canvas libs) so the share
// path adds nothing to the bundle and renders deterministically. Sizes to
// 1080×1080 — square, which is what WhatsApp / Telegram / Instagram expect.

export interface ShareCardData {
  testTitle?: string;
  score: number;
  totalMarks: number;
  percentile: number;
  correct: number;
  incorrect: number;
  unattempted: number;
}

const SIZE = 1080;

const BRAND_600 = "#5656e8";
const BRAND_700 = "#4538d6";
const SLATE_900 = "#0f172a";
const SLATE_500 = "#64748b";
const SLATE_200 = "#e2e8f0";
const EMERALD = "#059669";
const AMBER = "#d97706";
const RED = "#dc2626";

/** Marketing/attribution URL appended to every share (ticket 27 reads utm_*). */
export function shareUrl(attemptId?: string): string {
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://examock.app";
  const params = new URLSearchParams({
    utm_source: "share",
    utm_medium: "result_card",
    utm_campaign: "result_share",
  });
  if (attemptId) params.set("ref", attemptId);
  return `${origin}/?${params.toString()}`;
}

export function shareCardFileName(): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `examock-result-${stamp}.png`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return `${cut}…`;
}

/**
 * Render the score card to a PNG blob. Callers can pass it to the Web Share
 * API (as a File) or download it.
 */
export async function renderShareCard(data: ShareCardData): Promise<Blob> {
  // Make sure webfonts are ready so the canvas uses the real typeface when the
  // browser supports it (harmless no-op where `document.fonts` is absent).
  try {
    await (document as Document & { fonts?: FontFaceSet }).fonts?.ready;
  } catch {
    /* ignore — fall back to system fonts */
  }

  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser");

  const pct = data.totalMarks > 0 ? (data.score / data.totalMarks) * 100 : 0;
  const scoreColor = pct >= 60 ? EMERALD : pct >= 40 ? AMBER : BRAND_700;

  // ── Background ──────────────────────────────────────────────
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, SIZE, SIZE);

  // ── Card ────────────────────────────────────────────────────
  const pad = 64;
  const cardX = pad;
  const cardY = pad;
  const cardW = SIZE - pad * 2;
  const cardH = SIZE - pad * 2;

  ctx.save();
  ctx.shadowColor = "rgba(15, 23, 42, 0.12)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 16;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, cardX, cardY, cardW, cardH, 48);
  ctx.fill();
  ctx.restore();

  // Brand accent bar across the top of the card.
  ctx.save();
  roundRect(ctx, cardX, cardY, cardW, 16, 48);
  ctx.clip();
  const grad = ctx.createLinearGradient(cardX, 0, cardX + cardW, 0);
  grad.addColorStop(0, BRAND_600);
  grad.addColorStop(1, "#818cf8");
  ctx.fillStyle = grad;
  ctx.fillRect(cardX, cardY, cardW, 16);
  ctx.restore();

  const innerX = cardX + 72;
  const centerX = SIZE / 2;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  // ── Header: logo mark + wordmark ────────────────────────────
  const headerY = cardY + 96;
  ctx.fillStyle = BRAND_600;
  roundRect(ctx, innerX, headerY, 72, 72, 20);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = '800 44px "Plus Jakarta Sans", Inter, system-ui, sans-serif';
  ctx.textAlign = "center";
  ctx.fillText("E", innerX + 36, headerY + 52);

  ctx.textAlign = "left";
  ctx.fillStyle = SLATE_900;
  ctx.font = '800 52px "Plus Jakarta Sans", Inter, system-ui, sans-serif';
  ctx.fillText("Examock", innerX + 96, headerY + 38);
  ctx.fillStyle = SLATE_500;
  ctx.font = '500 28px Inter, system-ui, sans-serif';
  ctx.fillText("Prepare smarter for your exam", innerX + 96, headerY + 74);

  // ── Test title (optional) ───────────────────────────────────
  if (data.testTitle) {
    ctx.fillStyle = SLATE_500;
    ctx.font = '600 32px Inter, system-ui, sans-serif';
    ctx.textAlign = "center";
    ctx.fillText(
      fitText(ctx, data.testTitle, cardW - 200),
      centerX,
      headerY + 170,
    );
  }

  // ── Score ───────────────────────────────────────────────────
  ctx.textAlign = "center";
  ctx.fillStyle = scoreColor;
  ctx.font = '800 240px "Plus Jakarta Sans", Inter, system-ui, sans-serif';
  ctx.fillText(String(Math.round(data.score)), centerX, cardY + 470);

  ctx.fillStyle = SLATE_500;
  ctx.font = '600 40px Inter, system-ui, sans-serif';
  ctx.fillText(`out of ${data.totalMarks} marks`, centerX, cardY + 525);

  // ── Percentile pill ─────────────────────────────────────────
  const pillText = `Top ${Math.max(1, Math.round(100 - data.percentile))}%`;
  ctx.font = '700 34px Inter, system-ui, sans-serif';
  const pillW = ctx.measureText(pillText).width + 72;
  const pillH = 68;
  const pillX = centerX - pillW / 2;
  const pillY = cardY + 580;
  ctx.fillStyle = "#eef2ff";
  roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.fillStyle = BRAND_700;
  ctx.fillText(pillText, centerX, pillY + 45);

  // ── Stat row: correct / incorrect / unattempted ─────────────
  const stats = [
    { label: "Correct", value: data.correct, color: EMERALD },
    { label: "Incorrect", value: data.incorrect, color: RED },
    { label: "Skipped", value: data.unattempted, color: SLATE_500 },
  ];
  const rowY = cardY + 720;
  const colW = cardW / 3;
  stats.forEach((stat, i) => {
    const cx = cardX + colW * i + colW / 2;
    ctx.fillStyle = stat.color;
    ctx.font = '800 80px "Plus Jakarta Sans", Inter, system-ui, sans-serif';
    ctx.fillText(String(stat.value), cx, rowY);
    ctx.fillStyle = SLATE_500;
    ctx.font = '600 30px Inter, system-ui, sans-serif';
    ctx.fillText(stat.label, cx, rowY + 46);
  });

  // ── Footer ──────────────────────────────────────────────────
  ctx.fillStyle = SLATE_200;
  ctx.fillRect(innerX, cardY + cardH - 150, cardW - 144, 2);

  ctx.fillStyle = BRAND_600;
  ctx.font = '700 34px Inter, system-ui, sans-serif';
  const host =
    typeof window !== "undefined" && window.location?.host
      ? window.location.host
      : "examock.app";
  ctx.fillText(`Try a free mock test · ${host}`, centerX, cardY + cardH - 84);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to render image"))),
      "image/png",
      0.95,
    );
  });
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick so the download has a chance to start.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function whatsappShareUrl(text: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
}

export function telegramShareUrl(text: string, url: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}
