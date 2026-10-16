// src/utils/slug.js — URL slugs for public SEO pages (ticket 24).
//
// Subjects and topics previously had only `name`, so there was no stable,
// keyword-bearing URL to index them under. The rule here:
//
//   slug  = lowercased, ASCII-safe, hyphen-separated name
//   scope = uniqueness is per parent (a subject slug repeats across exams,
//           a topic slug repeats across subjects) — the parent in the URL
//           (/exams/:examSlug/:subjectSlug/...) disambiguates.
//
// Mirrors the exam-type form's regex (examTypeForm.tsx:39) so slugs look the
// same whether they are typed by an admin or generated here.

const NON_ALNUM = /[^a-z0-9]+/g;

export const slugify = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(NON_ALNUM, "-")
    .replace(/(^-|-$)/g, "");

/**
 * Pick a slug for `name` that is not already taken inside its parent scope.
 * Base slug first, then `-2`, `-3`, … deterministic and collision-safe, so
 * two subjects named "Physics" under different exams each keep a clean URL
 * while two under the SAME exam suffix cleanly.
 *
 * Pure by design — unit-testable without a database (events/admin pattern).
 */
export const uniqueSlug = (name, takenSlugs = []) => {
  const base = slugify(name);
  // A name with no ASCII at all ("हिन्दी") would slug to "" — never ship an
  // empty segment in a URL; fall back to a stable placeholder.
  const stem = base || "item";
  const taken = new Set(takenSlugs);
  if (!taken.has(stem)) return stem;
  let n = 2;
  while (taken.has(`${stem}-${n}`)) n += 1;
  return `${stem}-${n}`;
};
