#!/usr/bin/env node
/**
 * prd-lock.mjs — PRD dependency, conflict and lock validator.
 *
 * Source of truth: prd/registry.json  (metadata only; the .md files stay prose)
 * Generated:       the `prd:lock:start/end` banner inside each PRD markdown.
 *
 *   node scripts/prd-lock.mjs            same as --check
 *   node scripts/prd-lock.mjs --board    human-readable board (exit 0 unless errors)
 *   node scripts/prd-lock.mjs --sync     rewrite the banners, then --check
 *   node scripts/prd-lock.mjs --json     machine-readable, for CI annotations
 *
 * Exit codes:  0 = clean (warnings allowed)   1 = lock violation / invalid registry
 *
 * WHY THIS EXISTS
 * Two PRDs open at once silently corrupt each other: Prisma migration folders
 * share one timestamp namespace, `index.js` middleware order is global, and
 * `auth.middlewares.js` can only have one definition of "is this person an
 * admin". Those are not path overlaps you can eyeball in review, so they are
 * modelled as exclusive RESOURCE TOKENS and enforced here.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PRD_DIR = join(ROOT, "prd");
const REGISTRY = join(PRD_DIR, "registry.json");

const START = "<!-- prd:lock:start -->";
const END = "<!-- prd:lock:end -->";

/* ------------------------------------------------------------------ *
 * Resource tokens — the exclusivity namespace.
 * Two non-resolved tickets holding the same token is a hard lock when the
 * token is `exclusive`; a warning when it is merely `additive`.
 *
 * Deliberately coarse: file-glob overlap produces constant false positives
 * on shared boilerplate (index.js, schema.prisma), tokens do not.
 *   exclusive — genuinely cannot be edited by two branches at once
 *   additive  — both may edit, but must be serialised or merge-reviewed
 * ------------------------------------------------------------------ */
const TOKENS = {
  "db:schema":          { severity: "exclusive", desc: "prisma/schema.prisma model definitions" },
  "db:migrations":      { severity: "exclusive", desc: "prisma/migrations/** — one sequential timestamp namespace" },
  "db:users":           { severity: "exclusive", desc: "users table semantics and user-scoped queries" },
  "db:tenants":         { severity: "exclusive", desc: "tenants table semantics" },
  "db:content":         { severity: "exclusive", desc: "subjects / topics / questions / mock_tests" },
  "db:commerce":        { severity: "exclusive", desc: "payments / subscriptions / usage_events" },
  "db:platform":        { severity: "exclusive", desc: "platform_staff / audit logs / erasure requests" },
  "auth:token":         { severity: "exclusive", desc: "jwt issuing + verification, refresh rotation" },
  "auth:middleware":    { severity: "exclusive", desc: "auth.middlewares.js + tenant.middlewares.js" },
  "auth:google":        { severity: "exclusive", desc: "Google OAuth client resolution" },
  "api:mounts":         { severity: "exclusive", desc: "index.js router mounting and app-level middleware order" },
  "rag:qdrant":         { severity: "exclusive", desc: "vector store filters and collections" },
  "rag:pipeline":       { severity: "exclusive", desc: "ingestion pipeline and workers" },
  "storage:cloudinary": { severity: "exclusive", desc: "upload paths and signed URLs" },
  "mail:delivery":      { severity: "exclusive", desc: "email.js / mailer.js — sender identity + transport" },
  "pm2:ecosystem":      { severity: "exclusive", desc: "ecosystem.config.cjs process definitions" },
  "infra:tls":          { severity: "exclusive", desc: "certificates, nginx server_name, DNS records" },
  "config:app":         { severity: "additive",  desc: "src/config/config.js env keys" },
  "pkg:scripts":        { severity: "additive",  desc: "package.json scripts + test harness" },
  "frontend:brand":     { severity: "exclusive", desc: "branding bootstrap and CSS tokens" },
  "frontend:auth":      { severity: "exclusive", desc: "login / onboarding flow" },
  "frontend:admin":     { severity: "exclusive", desc: "admin panel surfaces" },
  "deploy:script":      { severity: "additive",  desc: "remote-deploy.sh" },
};

const sev = (tok) => TOKENS[tok]?.severity ?? "exclusive";
const desc = (tok) => TOKENS[tok]?.desc ?? tok;

const STATUSES = ["draft", "blocked", "ready", "in_progress", "resolved", "superseded"];
// Phases use a smaller vocabulary: a ticket-level `blocked` is meaningless per phase,
// and `superseded` collapses into `skipped` here.
const PHASE_STATUSES = ["pending", "in_progress", "resolved", "skipped"];
const PHASE_DONE = new Set(["resolved", "skipped"]);

const CLOSED = new Set(["resolved", "superseded"]);
const ACTIVE = new Set(["in_progress"]);

const args = new Set(process.argv.slice(2));
const MODE = args.has("--sync") ? "sync" : args.has("--board") ? "board" : args.has("--json") ? "json" : "check";

const errors = [];
const warnings = [];
const err = (t, m) => errors.push({ ticket: t, message: m });
const warn = (t, m) => warnings.push({ ticket: t, message: m });

/* ------------------------------------------------------------------ */
/* Load                                                                */
/* ------------------------------------------------------------------ */
if (!existsSync(REGISTRY)) {
  console.error(`registry not found: ${REGISTRY}`);
  process.exit(1);
}

let reg;
try {
  reg = JSON.parse(readFileSync(REGISTRY, "utf8"));
} catch (e) {
  console.error(`registry.json is not valid JSON: ${e.message}`);
  process.exit(1);
}

const tickets = reg.tickets ?? [];
if (!Array.isArray(tickets) || tickets.length === 0) {
  console.error("registry.json has no `tickets` array");
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* R5 — shape + file existence                                         */
/* ------------------------------------------------------------------ */
const byId = new Map();

for (const t of tickets) {
  const id = t.id;

  if (byId.has(id)) err(id, `duplicate ticket id ${id}`);
  byId.set(id, t);

  if (!/^\d{4}$/.test(id)) err(id, `id must be 4 digits, got "${id}"`);

  if (!STATUSES.includes(t.status)) {
    err(id, `invalid status "${t.status}" (expected one of ${STATUSES.join(", ")})`);
  }
  if (!t.file) {
    err(id, "missing `file`");
  } else if (!existsSync(join(PRD_DIR, t.file))) {
    err(id, `markdown file prd/${t.file} does not exist`);
  }
  if (!t.title) err(id, "missing `title`");

  for (const tok of t.resources ?? []) {
    if (!TOKENS[tok]) {
      err(id, `unknown resource token "${tok}" — add it to TOKENS in scripts/prd-lock.mjs or fix the spelling`);
    }
  }
  for (const ph of t.phases ?? []) {
    if (!ph.id) err(id, `phase "${ph.title ?? "?"}" has no id`);
    if (ph.status && !PHASE_STATUSES.includes(ph.status)) {
      err(id, `phase ${ph.id} has invalid status "${ph.status}" (expected one of ${PHASE_STATUSES.join(", ")})`);
    }
  }
}

/* ------------------------------------------------------------------ */
/* R5b — every markdown in prd/ must be claimed by the registry, so a   */
/* new PRD cannot be written without declaring its locks.                */
/* ------------------------------------------------------------------ */
const known = new Set([
  ...tickets.map((t) => t.file).filter(Boolean),
  ...(reg.docs ?? []).map((d) => (typeof d === "string" ? d : d.file)).filter(Boolean),
]);
for (const f of readdirSync(PRD_DIR)) {
  if (!f.endsWith(".md") || f === "README.md") continue;
  if (!known.has(f)) {
    err("(registry)", `prd/${f} is not registered — add it to \`tickets\` (if it is a ticket) or to \`docs\` (if it is a plan/notes file)`);
  }
}
for (const d of reg.docs ?? []) {
  const f = typeof d === "string" ? d : d.file;
  if (f && !existsSync(join(PRD_DIR, f))) err("(registry)", `docs entry "${f}" does not exist`);
}

/* ------------------------------------------------------------------ */
/* Phase-level dependencies — a ticket may unlock before it is fully   */
/* finished. 0003 needs 0001#1B + #2 to build, but 0001#3..#7 can ship */
/* independently; conversely 0003's analytics phase needs 0001#6.      */
/* ------------------------------------------------------------------ */
const phaseDepBlocked = (ref) => {
  const [pid, phaseId] = ref.split("#");
  const parent = byId.get(pid);
  if (!parent) return `unknown ticket ${pid}`;
  const ph = (parent.phases ?? []).find((p) => String(p.id) === phaseId);
  if (!ph) return `${pid} has no phase ${phaseId}`;
  return PHASE_DONE.has(ph.status) ? null : `${pid}#${phaseId} (${ph.status ?? "pending"})`;
};

for (const t of tickets) {
  for (const ph of t.phases ?? []) {
    const blocked = [];
    for (const ref of ph.depends_on ?? []) {
      const why = phaseDepBlocked(ref);
      if (why) blocked.push(ref);
      if (!byId.has(ref.split("#")[0])) err(t.id, `phase ${ph.id} depends_on "${ref}" references an unknown ticket`);
    }
    ph.__blockers = blocked;
    // A phase cannot be claimed as done while its own deps are unmet.
    if (PHASE_DONE.has(ph.status) && blocked.length) {
      err(t.id, `phase ${ph.id} is marked "${ph.status}" but is blocked by: ${blocked.join(", ")}`);
    }
  }
}

/* ------------------------------------------------------------------ */
/* R6 — dependency references point at real tickets / phases           */
/* ------------------------------------------------------------------ */
const ticketResolved = (id) => {
  const t = byId.get(id);
  if (!t) return false;
  if (t.status === "resolved") return true;
  if (t.status === "superseded") {
    // a superseded ticket only unblocks its dependents if replaced by something resolved
    return t.superseded_by ? ticketResolved(t.superseded_by) : false;
  }
  return false;
};

const phaseResolved = (ref) => {
  // ref forms: "0001" (whole ticket) or "0001#2" / "0001#phase-id"
  const [id, phaseId] = ref.split("#");
  const t = byId.get(id);
  if (!t) return { ok: false, why: `depends on unknown ticket ${id}` };

  if (!phaseId) return { ok: ticketResolved(id), why: `ticket ${id} is ${t.status}` };

  const ph = (t.phases ?? []).find((p) => String(p.id) === phaseId);
  if (!ph) return { ok: false, why: `ticket ${id} has no phase ${phaseId}` };

  // A phase with no status is treated as not started.
  const done = PHASE_DONE.has(ph.status);
  return { ok: done, why: `${id}#${phaseId} is ${ph.status ?? "pending"}` };
};

/* ------------------------------------------------------------------ */
/* R1 — a locked ticket may not be implemented                         */
/* R3 — declared status must match the computed lock                   */
/* ------------------------------------------------------------------ */
for (const t of tickets) {
  const blockers = [];

  for (const ref of t.depends_on ?? []) {
    const r = phaseResolved(ref);
    if (!r.ok) blockers.push(ref);
    if (!byId.has(ref.split("#")[0])) err(t.id, `depends_on "${ref}" references an unknown ticket`);
  }

  for (const ref of t.conflicts_with ?? []) {
    const other = byId.get(ref.split("#")[0]);
    if (!other) {
      err(t.id, `conflicts_with "${ref}" references an unknown ticket`);
      continue;
    }
    // A conflict only bites while BOTH sides are still open.
    if (!CLOSED.has(t.status) && !CLOSED.has(other.status)) blockers.push(`${ref} (conflicts_with)`);
  }

  t.__blockers = blockers;
  t.__computed = blockers.length ? "blocked" : "ready";

  if (ACTIVE.has(t.status) && blockers.length) {
    err(t.id, `LOCKED — status is "in_progress" but blocked by: ${blockers.join(", ")}`);
  }
  if (t.status === "blocked" && blockers.length === 0) {
    err(t.id, `STALE — status is "blocked" but all blockers are resolved; promote to "ready"`);
  }
  if (t.status === "ready" && blockers.length) {
    err(t.id, `STALE — status is "ready" but blocked by: ${blockers.join(", ")}; set status "blocked"`);
  }
  if (t.status === "draft" && blockers.length) {
    warn(t.id, `draft is blocked by: ${blockers.join(", ")} — may be authored, must not be implemented`);
  }
  if (t.status === "superseded" && !t.superseded_by) {
    err(t.id, `status "superseded" requires \`superseded_by\` naming the replacement ticket`);
  }
}

/* ------------------------------------------------------------------ */
/* R2 — exclusive resources among concurrently-active tickets          */
/* R4 — migrations are single-writer and must run lowest-ticket-first   */
/* ------------------------------------------------------------------ */
const active = tickets.filter((t) => ACTIVE.has(t.status));
const ready = tickets.filter((t) => t.status === "ready" || t.status === "blocked");

for (let i = 0; i < active.length; i++) {
  for (let j = i + 1; j < active.length; j++) {
    const [a, b] = [active[i], active[j]];
    const shared = (a.resources ?? []).filter((r) => (b.resources ?? []).includes(r));
    for (const tok of shared) {
      const msg = `"${tok}" (${desc(tok)}) is held by both ${a.id} and ${b.id}`;
      if (sev(tok) === "exclusive") {
        err(a.id, `RESOURCE CONTENTION — ${msg}; only one may be in_progress`);
      } else {
        warn(a.id, `additive overlap — ${msg}; serialise or merge-review`);
      }
    }
  }
}

const migHolders = active.filter((t) => (t.resources ?? []).includes("db:migrations"));
if (migHolders.length > 1) {
  const sorted = [...migHolders].sort((x, y) => x.id.localeCompare(y.id));
  err(sorted[1].id, `RESOURCE CONTENTION — "db:migrations" is also held by ${sorted[0].id}. Prisma migration folders share one timestamp namespace; interleave them only if ${sorted[0].id} is finished first.`);
}
for (const t of migHolders) {
  const lower = active.filter((o) => o.id !== t.id && Number(o.id) < Number(t.id));
  if (lower.length) {
    warn(t.id, `holds "db:migrations" while lower-numbered ${lower.map((o) => o.id).join(", ")} is also in_progress — confirm ${t.id} ships second`);
  }
}

// A ticket holding a hot resource but sitting in `ready` is not an error,
// it is a scheduling fact the board should surface.
for (const t of ready) {
  const hot = active.flatMap((a) =>
    (a.resources ?? []).filter((r) => (t.resources ?? []).includes(r)).map((r) => `${r} (${a.id})`)
  );
  t.__hotResources = hot;
  if (hot.length) warn(t.id, `blocked-until-free — resource(s) currently held by an in_progress ticket: ${hot.join(", ")}`);
}

/* ------------------------------------------------------------------ */
/* Overlap map — which OPEN tickets would contend if both were started.  */
/* Not an error while both are merely `ready`; it is the plan for who     */
/* goes first. Rendered in --board and in each ticket's banner.          */
/* ------------------------------------------------------------------ */
const open = tickets.filter((t) => !CLOSED.has(t.status));
for (const t of tickets) t.__overlaps = [];

for (let i = 0; i < open.length; i++) {
  for (let j = i + 1; j < open.length; j++) {
    const [a, b] = [open[i], open[j]];
    const shared = (a.resources ?? []).filter((r) => (b.resources ?? []).includes(r));
    if (!shared.length) continue;
    const excl = shared.filter((r) => sev(r) === "exclusive");
    const add = shared.filter((r) => sev(r) === "additive");
    if (excl.length) {
      a.__overlaps.push({ with: b.id, tokens: excl, severity: "exclusive" });
      b.__overlaps.push({ with: a.id, tokens: excl, severity: "exclusive" });
    }
    if (add.length) {
      a.__overlaps.push({ with: b.id, tokens: add, severity: "additive" });
      b.__overlaps.push({ with: a.id, tokens: add, severity: "additive" });
    }
  }
}

/* ------------------------------------------------------------------ */
/* R8 — banners must exist and be current                              */
/* ------------------------------------------------------------------ */
const bannerFor = (t) => {
  const L = [];
  L.push(START);
  L.push("| | |");
  L.push("|---|---|");
  L.push(`| **Ticket** | \`${t.id}\` — ${t.title} |`);
  L.push(`| **Status** | \`${t.status}\` |`);
  L.push(`| **Computed** | \`${t.__computed}\`${t.__computed !== t.status ? " **← stale, run `npm run prd:sync`**" : ""} |`);
  if (t.__blockers.length) L.push(`| **Locked by** | ${t.__blockers.join(", ")} |`);
  else L.push("| **Locked by** | — |");
  if (t.__hotResources?.length) L.push(`| **Resource contention** | ${t.__hotResources.join(", ")} |`);
  L.push(`| **Depends on** | ${(t.depends_on ?? []).map((d) => `\`${d}\``).join(", ") || "—"} |`);
  L.push(`| **Resources held** | ${(t.resources ?? []).map((r) => `\`${r}\``).join(", ") || "—"} |`);
  const gatedPhases = (t.phases ?? []).filter((p) => p.__blockers?.length);
  if (gatedPhases.length) {
    L.push(`| **Phase gates** | ${gatedPhases.map((p) => `\`${p.id}\` waits on ${p.__blockers.join(", ")}`).join("<br>")} |`);
  }
  const excl = (t.__overlaps ?? []).filter((o) => o.severity === "exclusive");
  const add = (t.__overlaps ?? []).filter((o) => o.severity === "additive");
  if (excl.length) {
    L.push(`| ⚠️ Exclusive overlap | ${excl.map((o) => `**${o.with}** — ${o.tokens.join(", ")}`).join("<br>")} |`);
  }
  if (add.length) {
    L.push(`| Additive overlap | ${add.map((o) => `${o.with} — ${o.tokens.join(", ")}`).join("<br>")} |`);
  }
  if (t.sequencing) L.push(`| **Sequencing** | ${t.sequencing} |`);
  L.push(`| **Supersedes / by** | ${t.supersedes ?? "—"} / ${t.superseded_by ?? "—"} |`);
  L.push(`| **Phase status** | ${(t.phases ?? []).map((p) => `${p.id}:${p.status ?? "pending"}`).join(" · ") || "—"} |`);
  L.push(END);
  return L.join("\n");
};

for (const t of tickets) {
  if (!t.file) continue;
  const p = join(PRD_DIR, t.file);
  if (!existsSync(p)) continue;

  const md = readFileSync(p, "utf8");
  const si = md.indexOf(START);
  const ei = md.indexOf(END);

  if (si === -1 || ei === -1) {
    err(t.id, `prd/${t.file} is missing the ${START} / ${END} banner markers — add them so lock state renders in the doc`);
    continue;
  }

  const current = md.slice(si, ei + END.length);
  const next = bannerFor(t);

  if (MODE === "sync" && current !== next) {
    writeFileSync(p, md.slice(0, si) + next + md.slice(ei + END.length), "utf8");
    console.error(`synced  ${t.id}  ${t.file}`);
  } else if (current !== next) {
    err(t.id, `prd/${t.file} has a stale lock banner — run \`npm run prd:sync\``);
  }
}

/* ------------------------------------------------------------------ */
/* Report                                                              */
/* ------------------------------------------------------------------ */
const pad = (s, n) => String(s ?? "").padEnd(n);

if (MODE === "json") {
  console.log(JSON.stringify({ errors, warnings, tickets: tickets.map(({ __blockers, __computed, __hotResources, ...rest }) => rest) }, null, 2));
  process.exit(errors.length ? 1 : 0);
}

if (MODE === "board") {
  const w = Math.max(...tickets.map((t) => t.id.length), 4);
  console.log(`\nPRD BOARD — ${tickets.length} ticket(s), ${errors.length} error(s), ${warnings.length} warning(s)\n`);
  for (const t of [...tickets].sort((a, b) => a.id.localeCompare(b.id))) {
    const flag = errors.some((e) => e.ticket === t.id) ? "!" : " ";
    console.log(`${flag} ${pad(t.id, w)}  ${pad(t.status, 12)} ${pad(t.__computed, 8)} ${t.title}`);
    if (t.__blockers.length) console.log(`  ${" ".repeat(w + 2)}   locked by: ${t.__blockers.join(", ")}`);
    for (const o of t.__overlaps ?? []) {
      if (o.severity !== "exclusive") continue;
      console.log(`  ${" ".repeat(w + 2)}   ! exclusive overlap with ${o.with}: ${o.tokens.join(", ")}`);
    }
  }

  // Overlap matrix across everything still open
  const exclusives = new Map();
  for (const t of open) {
    for (const o of t.__overlaps ?? []) {
      if (o.severity !== "exclusive") continue;
      const key = [t.id, o.with].sort().join(" x ");
      if (!exclusives.has(key)) exclusives.set(key, new Set());
      for (const tok of o.tokens) exclusives.get(key).add(tok);
    }
  }
  if (exclusives.size) {
    console.log(`\nEXCLUSIVE OVERLAPS between open tickets (serialise these)`);
    for (const [pair, toks] of [...exclusives].sort()) {
      console.log(`  ${pair}\n    ${[...toks].join(", ")}`);
    }
  }
  if (warnings.length) {
    console.log(`\nWARNINGS`);
    for (const m of warnings) console.log(`  ~ ${m.ticket}: ${m.message}`);
  }
  if (errors.length) {
    console.log(`\nERRORS`);
    for (const e of errors) console.log(`  x ${e.ticket}: ${e.message}`);
  }
  console.log("");
  process.exit(errors.length ? 1 : 0);
}

for (const m of warnings) console.error(`warn  ${m.ticket}: ${m.message}`);
for (const e of errors) console.error(`ERROR ${e.ticket}: ${e.message}`);

if (errors.length) {
  console.error(`\nprd-lock: ${errors.length} lock violation(s).\n` +
    `Resolve or close the blocking ticket before starting this one.\n` +
    `See the "Locked by" banner in the PRD for the exact blockers.`);
  process.exit(1);
}

console.error(`prd-lock: clean (${tickets.length} ticket(s), ${warnings.length} warning(s))`);
process.exit(0);
