// src/hooks/useSeo.ts — per-route <head> management (ticket 24).
//
// Why this exists: index.html ships one static title/og-block for the whole
// SPA. Every public SEO page needs its OWN title, description, canonical and
// Open Graph/Twitter tags. Google renders JS, so these runtime tags are what
// gets indexed; the social scrapers that don't execute JS will fall back to
// the static og-image block (accepted trade-off — build-time prerender is the
// later upgrade path).
//
// Contract:
//   * updates tags that already exist in index.html (og:title, og:image, …)
//   * creates tags that don't (description, canonical, twitter:*)
//   * on unmount restores whatever it changed, so navigating away in the SPA
//     doesn't leave the previous page's canonical behind
//
// Absolute URLs are built from window.location.origin — always the origin the
// visitor is actually on (prod domain in prod, localhost in dev).
import { useEffect } from "react";

interface SeoOptions {
  /** Full document title, e.g. "JEE Physics syllabus — chapters | Examock". */
  title: string;
  /** Meta description. Omitted → index.html's (if any) left untouched. */
  description?: string;
  /** Route path for canonical/og:url; defaults to the current pathname. */
  path?: string;
}

export function useSeo({ title, description, path }: SeoOptions): void {
  useEffect(() => {
    const restores: Array<() => void> = [];

    const prevTitle = document.title;
    restores.push(() => {
      document.title = prevTitle;
    });

    const setMeta = (
      key: string,
      attr: "name" | "property",
      value: string | undefined,
    ) => {
      if (value === undefined) return;
      const selector = `meta[${attr}="${key}"]`;
      const existing = document.head.querySelector<HTMLMetaElement>(selector);
      if (existing) {
        const prev = existing.getAttribute("content");
        restores.push(() => existing.setAttribute("content", prev ?? ""));
        existing.setAttribute("content", value);
      } else {
        const el = document.createElement("meta");
        el.setAttribute(attr, key);
        el.setAttribute("content", value);
        document.head.appendChild(el);
        restores.push(() => el.remove());
      }
    };

    const setCanonical = (href: string) => {
      const existing = document.head.querySelector<HTMLLinkElement>(
        'link[rel="canonical"]',
      );
      if (existing) {
        const prev = existing.getAttribute("href") ?? "";
        restores.push(() => existing.setAttribute("href", prev));
        existing.setAttribute("href", href);
      } else {
        const el = document.createElement("link");
        el.setAttribute("rel", "canonical");
        el.setAttribute("href", href);
        document.head.appendChild(el);
        restores.push(() => el.remove());
      }
    };

    const origin = window.location.origin;
    const url = new URL(path ?? window.location.pathname, origin).toString();
    const image = new URL("/og-image.png", origin).toString();

    document.title = title;
    setMeta("description", "name", description);
    setCanonical(url);

    setMeta("og:title", "property", title);
    setMeta("og:description", "property", description);
    setMeta("og:url", "property", url);
    setMeta("og:image", "property", image);
    setMeta("og:type", "property", "website");
    setMeta("og:site_name", "property", "Examock");

    setMeta("twitter:card", "name", "summary_large_image");
    setMeta("twitter:title", "name", title);
    setMeta("twitter:description", "name", description);
    setMeta("twitter:image", "name", image);

    return () => {
      restores.forEach((restore) => restore());
    };
  }, [title, description, path]);
}
