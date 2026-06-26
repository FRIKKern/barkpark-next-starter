# Barkpark + Next.js — agent guide

You're in a **Next.js app backed by [Barkpark](https://github.com/FRIKKern/barkpark)** (a headless
CMS). This folder is **bound to one Barkpark project**. Be a Barkpark power user: discover the API
instead of guessing, batch your writes, let the folder scope your `bp` commands, and drive work
through the task queue.

---

## This folder is project-scoped — don't fight it

`new-project` wrote a `.envrc` that exports `BARKPARK_API_URL` / `BARKPARK_API_TOKEN` /
`BARKPARK_WORKSPACE` / `BARKPARK_PROJECT` / `BARKPARK_DATASET`. With **direnv** active, **every `bp`
command you run here already targets `default/<project>/production`** — so:

- **Never** pass `-w` / `-p` / `-d` for routine work. Confirm the scope once: `bp whoami`.
- If direnv isn't active in your shell: `set -a; . ./.envrc; set +a`.
- The Next app reads the *same* project (`lib/barkpark-client.ts`, `lib/bp-fetch.ts` → `SCOPE`).
- Bind a different project: `npm run new-project <name>`.

---

## Use the `bp` CLI efficiently

This is the whole game — do these, not the slow equivalents:

- **Learn the API in ONE call, never guess an endpoint:** `bp capabilities -o json`. It returns
  every command (noun/verb), its HTTP method + path, auth tier, and flags.
- **Machine output:** add `--json` (or `-o json`); use `-q` for a minimal write receipt (just
  `rev` + ids); `-v` for diagnostics on stderr.
- **Preview before writing:** `--dry-run` prints the exact request and sends nothing.
- **Batch everything.** `bp doc mutate` carries an *atomic array* of mutations — apply 500 docs in
  one call, never loop `mutate` per document:
  ```bash
  bp doc mutate --file batch.json     # batch.json: {"mutations":[ {"createOrReplace":{…}}, {"publish":{"id","type"}}, … ]}
  ```
- **Pagination:** reads cap at **1000 docs/page** — use `--all`, or `--limit` / `--offset`.
- **Filtered reads (GROQ-lite), server-side:** `bp doc query <type> …` — filter on the server, don't
  fetch-all-and-filter in code. `bp doc get <type> <id>` for one; `bp doc ls <type>` to list.
- **Full-text search:** `bp search query <q>`.
- `--manifest <path>` runs offline against a saved capability manifest; `--yes` skips the prod-write
  confirmation (cloud writes).

---

## Content: schemas + documents

- **Define a type** (upsert): `bp schema apply -f schema.json`. v2 field types:
  `composite` (nested objects, recursive), `arrayOf` (homogeneous arrays), `codelist`
  (`<plugin>:<name>` controlled vocab), `localizedText` (multi-language + fallback chain) — plus the
  scalar `string` / `text` / `number` / `boolean`, and per-field `validations`.
- **Write documents** — the model is **draft → publish**. Every mutation batch:
  ```json
  {"mutations":[
    {"createOrReplace":{"_id":"post-hello","_type":"post","title":"Hello","slug":"hello","body":"…"}},
    {"publish":{"id":"post-hello","type":"post"}}
  ]}
  ```
  `createOrReplace` writes/replaces the draft; `publish` promotes it to the published perspective the
  app reads. Documents always carry `_id` + `_type`. The whole batch is atomic.
- **Relations / graph:** reference other docs by id; inspect with `bp graph show <id>`,
  `bp graph dangling` (broken refs), `bp graph orphans` (unconnected docs).
- **After bulk writes**, rebuild the search index so the finder sees new docs — the app exposes
  `POST /api/admin/reindex`, which calls `…/v1/data/search/<dataset>/reindex`.

---

## Tasks — the agent work queue (use it, not ad-hoc TODOs)

Tasks are first-class Barkpark documents. For any multi-step work in this repo, drive the queue:

- **`bp task prime`** — one-call rehydration: your in-progress claims + the ready head + recent
  events + lifecycle counts. **Run this first** when you start or resume.
- `bp task ready` — unblocked work. `bp task next <worker>` — *atomically* claim the next ready task
  (priority order). `bp task get <id>` — details.
- `bp task close <id> <worker> <epoch>` — complete (CAS on the claim epoch, so two workers can't both
  close). `bp task claim <id>` — claim a specific one.

---

## The Next ↔ Barkpark wiring (in this repo)

- **Server-side client** — `lib/barkpark-client.ts` builds a `@barkpark/core` client scoped to
  `BARKPARK_WORKSPACE`/`BARKPARK_PROJECT`. `BARKPARK_READ_TOKEN` is **server-only** (never
  `NEXT_PUBLIC_*` → never bundled to the browser).
- **Resilient fetch** — `lib/bp-fetch.ts`: keep-alive pool, timeout, retry over the restart window,
  and the `SCOPE` prefix (`/w/<ws>/p/<project>`) used by search.
- **Caching + revalidation** — reads are tagged (`lib/bp-tags.ts`: `bpType("post")`, `bpAll()`); a
  Barkpark **webhook** → `app/api/barkpark/webhook` → `revalidateBarkpark()` busts exactly the caches
  a publish touched. Wire one: `bp webhook create` pointing at `<deploy-url>/api/barkpark/webhook`.
- **Live updates** — `<BarkparkLive/>` (`@barkpark/nextjs`) auto-refreshes the page on content
  changes over SSE/WS (needs a `listen`-capable token; flag `NEXT_PUBLIC_BARKPARK_LIVE=1`).
- **Mutations from React** — `@barkpark/nextjs` `defineActions` + `useOptimisticDocument`.
- **Preview/draft mode** — `createDraftModeRoutes` + `signDraftModeToken`.
- `@barkpark/nextjs` entry points: `./server` `./client` `./actions` `./webhook` `./draft-mode`
  `./revalidate` `./preload`. `@barkpark/core` is the runtime-agnostic HTTP client.

---

## Best practices (the genius checklist)

1. **Discover, don't guess** — `bp capabilities -o json` before reaching for an endpoint.
2. **Batch + scope** — one atomic `bp doc mutate`; rely on `.envrc` scoping; `--json` for parsing.
3. **Token hygiene** — read token server-side only; scope reads to the project; never ship
   write/admin tokens to the browser.
4. **Model explicitly** — typed documents, explicit `publish`, references for relations.
5. **Keep caches honest** — let the webhook drive `revalidateTag`; reindex search after bulk writes.
6. **Track work in tasks** — `bp task prime` → `next` → `close`, not scratch TODOs.

## Recipe: add a content type and see it in the app

```bash
bp schema apply -f schema.json          # define the type (scoped to this project automatically)
bp doc mutate --file seed.json          # createOrReplace + publish a batch
bp doc query post --limit 5 --json      # verify
curl -X POST http://localhost:3000/api/admin/reindex   # (re)index for the finder
npm run dev                             # the finder + reader now surface it
```
