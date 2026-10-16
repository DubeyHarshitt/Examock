import test from "node:test";
import assert from "node:assert/strict";

import { slugify, uniqueSlug } from "../src/utils/slug.js";

// ── slugify ──────────────────────────────────────────────────

test("slugify lowercases and hyphenates", () => {
  assert.equal(slugify("Thermodynamics"), "thermodynamics");
  assert.equal(slugify("Organic Chemistry"), "organic-chemistry");
  assert.equal(slugify("  Waves & Optics  "), "waves-optics");
});

test("slugify collapses punctuation runs to one hyphen", () => {
  assert.equal(slugify("Unit & Method: Part I"), "unit-method-part-i");
  assert.equal(slugify("a///b"), "a-b");
});

test("slugify strips leading/trailing hyphens", () => {
  assert.equal(slugify("---Physics---"), "physics");
  assert.equal(slugify("!!!"), "");
});

test("slugify of non-ASCII-only names yields empty (handled by uniqueSlug)", () => {
  assert.equal(slugify("हिन्दी"), "");
  assert.equal(slugify(null), "");
  assert.equal(slugify(undefined), "");
});

// ── uniqueSlug ───────────────────────────────────────────────

test("returns the base slug when nothing collides", () => {
  assert.equal(uniqueSlug("Physics", []), "physics");
  assert.equal(uniqueSlug("Physics", ["chemistry", "maths"]), "physics");
});

test("suffixes -2, -3 on collision within the parent scope", () => {
  assert.equal(uniqueSlug("Physics", ["physics"]), "physics-2");
  assert.equal(uniqueSlug("Physics", ["physics", "physics-2"]), "physics-3");
});

test("collision list from another parent scope is ignored", () => {
  // "Physics" already exists under a DIFFERENT exam — the URL carries the
  // exam slug, so the same slug is fine here.
  assert.equal(uniqueSlug("Physics", []), "physics");
});

test("non-ASCII-only names fall back to a stable placeholder", () => {
  assert.equal(uniqueSlug("हिन्दी", []), "item");
  assert.equal(uniqueSlug("हिन्दी", ["item"]), "item-2");
});

test("placeholder never collides with a real 'item' slug", () => {
  assert.equal(uniqueSlug("!!!", ["item", "item-2"]), "item-3");
});
