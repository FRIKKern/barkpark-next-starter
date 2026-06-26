import "server-only";
import searchSnapshot from "./search.json";
import graphSnapshot from "./graph.json";
import { words, matchTerm, MIN_SCORE } from "@/lib/fuzzy";

/**
 * Static demo mode.
 *
 * When no real Barkpark is configured, the app serves a bundled snapshot of the
 * public Barkpark `docs` dataset (search results + reader docs + corpus graph)
 * instead of hitting the network — so a fresh `git clone && npm run dev`, or a
 * **zero-env Vercel deploy**, shows a working finder with no backend at all.
 *
 * Active when there is NO read token AND the API URL is unset or localhost (the
 * out-of-the-box state). A configured Barkpark — a token, or a non-local
 * `NEXT_PUBLIC_API_URL` — turns it off and the app reads live. Force either way
 * with `BARKPARK_STATIC=1` / `=0`.
 */
export function staticModeActive(): boolean {
  const flag = process.env.BARKPARK_STATIC;
  if (flag === "1") return true;
  if (flag === "0") return false;
  const url = process.env.NEXT_PUBLIC_API_URL ?? "";
  const localish = url === "" || /localhost|127\.0\.0\.1|\[::1\]/.test(url);
  return !process.env.BARKPARK_READ_TOKEN && localish;
}

interface SnapDoc {
  _id: string;
  _type: string;
  slug?: string;
  title?: string;
  [k: string]: unknown;
}
const DOCS: SnapDoc[] =
  (searchSnapshot as { documents?: SnapDoc[] }).documents ?? [];

/** All bundled docs of a type — the static list fallback (posts, papers). */
export function staticDocsOfType<T = SnapDoc>(type: string): T[] {
  return DOCS.filter((d) => d._type === type) as unknown as T[];
}

/** One bundled doc by (type, id/slug) — the static reader fallback. */
export function staticDoc<T = SnapDoc>(type: string, slug: string): T | null {
  return (
    (DOCS.find(
      (d) => d._type === type && (d._id === slug || d.slug === slug),
    ) as unknown as T) ?? null
  );
}

/**
 * Map an upstream Barkpark URL to a bundled response — the static fallback for
 * the one fetch point (`bpFetchJson`): full-text search, suggestions, the corpus
 * graph, and by-id doc reads. Unknown reads / telemetry / reindex resolve to a
 * benign success so callers never throw in demo mode.
 */
export function staticFetchJson(url: string): unknown {
  if (/\/v1\/data\/search\/[^/]+\/suggestions/.test(url)) {
    return { result: { popular: [] }, syncTags: [] };
  }
  if (/\/v1\/data\/search\//.test(url)) return filterSearch(url);
  if (/\/v1\/graph/.test(url)) return graphSnapshot;
  const m = url.match(/\/v1\/data\/doc\/[^/]+\/([^/]+)\/([^/?#]+)/);
  if (m) {
    return {
      result: staticDoc(decodeURIComponent(m[1]), decodeURIComponent(m[2])),
    };
  }
  return { ok: true, result: null };
}

/** Flatten a doc's title + block text into one lowercased haystack (built once). */
function docText(d: SnapDoc): string {
  const parts: string[] = [String(d.title ?? "")];
  const blocks = (d as { blocks?: unknown }).blocks;
  if (Array.isArray(blocks)) {
    for (const b of blocks as Array<Record<string, unknown>>) {
      if (typeof b.text === "string") parts.push(b.text);
      const content = b.content;
      if (Array.isArray(content)) {
        for (const c of content as Array<Record<string, unknown>>) {
          if (typeof c.value === "string") parts.push(c.value);
        }
      }
    }
  }
  return parts.join(" ").toLowerCase();
}

/**
 * Precomputed search index over the bundle — title + body, plus tokenised word
 * lists for typo-tolerant matching via the SAME keyboard-aware fuzzy matcher the
 * live finder highlights with, so a misspelling behaves like Indx fuzzy recall.
 */
const INDEX = DOCS.map((d) => {
  const title = String(d.title ?? "").toLowerCase();
  const text = docText(d);
  return {
    doc: d,
    title,
    text,
    titleWords: words(title),
    bodyWords: Array.from(new Set(words(text))),
  };
});

type IndexEntry = (typeof INDEX)[number];

/** Best fuzzy score of a term against a word list (0 = no usable match). */
function fuzzyBest(term: string, ws: string[]): number {
  let best = 0;
  for (const w of ws) {
    const s = matchTerm(term, w).score;
    if (s > best) best = s;
    if (best >= 0.999) break;
  }
  return best;
}

/**
 * Score one query term against one doc. Exact substring wins (title > body);
 * otherwise fuzzy word matching (>= MIN_SCORE) so typos still hit. Returns 0 when
 * the term matches nowhere — the caller then drops the doc (AND semantics).
 */
function termScore(term: string, e: IndexEntry): number {
  if (e.title.includes(term)) return 3;
  if (e.text.includes(term)) return 2;
  const tf = fuzzyBest(term, e.titleWords);
  if (tf >= MIN_SCORE) return 1 + tf;
  const bf = fuzzyBest(term, e.bodyWords);
  if (bf >= MIN_SCORE) return 0.5 + bf;
  return 0;
}

/**
 * Real full-text search over the bundled snapshot — NOT a fake engine.
 *
 * Matches every query term against title + body (AND), ranks title hits above
 * body hits, and REGENERATES the query-specific fields (`query`, `parsedQuery`)
 * while clearing the baked `highlights` — otherwise the finder, which highlights
 * `parsedQuery.terms`, would keep lighting up the snapshot's capture query.
 */
function filterSearch(url: string): unknown {
  let raw = "";
  try {
    raw = new URL(url, "http://x").searchParams.get("q") ?? "";
  } catch {
    /* relative URL with no parseable query — treat as empty */
  }
  const q = raw.trim();
  const snap = searchSnapshot as Record<string, unknown>;
  const terms = q
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 2);

  // A blank/1-char q is "browse" — enumerate everything, no highlight.
  if (terms.length === 0) {
    return {
      ...snap,
      query: q,
      documents: DOCS,
      count: DOCS.length,
      parsedQuery: { prefixes: [], terms: [], phrases: [], excludes: [] },
      highlights: {},
      correctedTo: null,
    };
  }

  const scored = INDEX.map((e) => {
    let score = 0;
    for (const t of terms) {
      const s = termScore(t, e);
      if (s === 0) return null; // AND: every term must match (exact or fuzzy)
      score += s;
    }
    return { doc: e.doc, score };
  }).filter((x): x is { doc: SnapDoc; score: number } => x !== null);
  scored.sort((a, b) => b.score - a.score);

  const documents = scored.map((s) => s.doc);
  return {
    ...snap,
    query: q,
    documents,
    count: documents.length,
    parsedQuery: { prefixes: [], terms, phrases: [], excludes: [] },
    highlights: {},
    correctedTo: null,
  };
}
