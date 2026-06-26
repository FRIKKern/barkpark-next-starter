import "server-only";
import searchSnapshot from "./search.json";
import graphSnapshot from "./graph.json";

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

/**
 * Substring-filter the snapshot by the `q=` term.
 *
 * Critically, this REGENERATES the query-specific fields (`query`, `parsedQuery`)
 * from the actual query and clears the baked `highlights` — otherwise the finder,
 * which highlights `parsedQuery.terms`, would keep highlighting the snapshot's
 * original query ("barkpark") for every search.
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
  if (q.length < 2) {
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

  const ql = q.toLowerCase();
  const documents = DOCS.filter(
    (d) =>
      String(d.title ?? "")
        .toLowerCase()
        .includes(ql) || String(d._id).toLowerCase().includes(ql),
  );
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
