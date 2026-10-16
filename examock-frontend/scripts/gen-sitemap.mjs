#!/usr/bin/env node
// scripts/gen-sitemap.mjs — build-time crawler artifacts (ticket 24).
//
// Runs as the LAST step of `npm run build` (after `vite build` has emptied and
// populated dist/), and writes into dist/:
//
//   dist/sitemap.xml — every public URL, fetched live from the taxonomy API
//                      (/, /exams, /exams/:exam, .../:subject, .../:topic,
//                      /free-questions)
//   dist/robots.txt  — public/robots.txt rules + the absolute `Sitemap:` line
//
// Writing into dist/ (git-ignored) rather than public/ keeps generated files
// out of the working tree — see the ticket 24 notes.
//
// Degradation contract: if the API is unreachable (fresh clone with no dev
// server, CI without a DB, deploy box), we emit a static sitemap of the
// always-known URLs and still exit 0 — builds never break. Only a failure to
// WRITE the artifacts themselves is fatal.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url)); // examock-frontend/scripts
const FRONTEND = dirname(ROOT); // examock-frontend
const DIST = join(FRONTEND, "dist");

// ── Config ─────────────────────────────────────────────────────
// process.env wins; otherwise parse examock-frontend/.env by hand — a plain
// `node script` doesn't load .env the way vite does, and hand-rolling the
// 5-line parse avoids pinning a Node flag version (--env-file) in the build.
function readDotEnv() {
  try {
    const out = {};
    for (const line of readFileSync(join(FRONTEND, ".env"), "utf8").split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match) out[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
    return out;
  } catch {
    return {};
  }
}
const dotenv = readDotEnv();
const SITE_URL = (process.env.VITE_SITE_URL || dotenv.VITE_SITE_URL || "http://localhost:5173").replace(/\/+$/, "");
const API_URL = (process.env.VITE_API_URL || dotenv.VITE_API_URL || "http://localhost:3000/api").replace(/\/+$/, "");

// Always-known URLs — the degraded (API-down) sitemap, and the fixed pages
// that get bundled with the live taxonomy fetch.
const STATIC_URLS = [
  { loc: "/", priority: "1.0" },
  { loc: "/exams", priority: "0.9" },
  { loc: "/free-questions", priority: "0.7" },
];

// ── Taxonomy fetch ─────────────────────────────────────────────
async function fetchJson(path) {
  const res = await fetch(`${API_URL}${path}`, {
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
  return res.json();
}

async function collectUrls() {
  const exams = await fetchJson("/public/exam-types");
  const urls = [...STATIC_URLS]; // /, /exams, /free-questions
  for (const exam of exams) {
    urls.push({ loc: `/exams/${exam.slug}`, priority: "0.8" });
    const syllabus = await fetchJson(`/public/exam-types/${exam.slug}`);
    for (const subject of syllabus.subjects) {
      urls.push({ loc: `/exams/${exam.slug}/${subject.slug}`, priority: "0.6" });
      for (const topic of subject.topics) {
        urls.push({
          loc: `/exams/${exam.slug}/${subject.slug}/${topic.slug}`,
          priority: "0.5",
        });
      }
    }
  }
  return urls;
}

// ── XML ────────────────────────────────────────────────────────
const xmlEscape = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function renderSitemap(urls) {
  const body = urls
    .map(
      (u) =>
        `  <url>\n    <loc>${xmlEscape(SITE_URL + u.loc)}</loc>\n    <priority>${u.priority}</priority>\n  </url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

function renderRobots() {
  // Rules live in public/robots.txt (single source of truth, also served in
  // dev); the build appends the absolute Sitemap line this static file can't
  // know at authoring time. Strip any prior Sitemap lines for idempotency.
  const rules = readFileSync(join(FRONTEND, "public", "robots.txt"), "utf8")
    .split("\n")
    .filter((line) => !/^\s*Sitemap:/i.test(line))
    .join("\n")
    .replace(/\s+$/, "");
  return `${rules}\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
}

// ── Main ───────────────────────────────────────────────────────
let urls;
let live = true;
try {
  urls = await collectUrls();
} catch (err) {
  live = false;
  console.warn(`[gen-sitemap] taxonomy API unreachable (${err.message})`);
  console.warn("[gen-sitemap] falling back to the static URL set");
  urls = STATIC_URLS;
}

mkdirSync(DIST, { recursive: true });
writeFileSync(join(DIST, "sitemap.xml"), renderSitemap(urls));
writeFileSync(join(DIST, "robots.txt"), renderRobots());

console.log(
  `[gen-sitemap] wrote dist/sitemap.xml (${urls.length} URLs, ${live ? "live" : "STATIC FALLBACK"}) and dist/robots.txt — site: ${SITE_URL}`,
);
