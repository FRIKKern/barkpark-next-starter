# Barkpark + Next.js starter

A practical starter for building a **Next.js** app on **[Barkpark](https://github.com/FRIKKern/barkpark)**,
a headless CMS. It's the Barkpark **content finder** — full-text search, a reader, and a corpus
graph. It runs **zero-config on bundled content**, then connects to a real Barkpark (local or your
own cloud) for live, editable data.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/FRIKKern/barkpark-next-starter&project-name=barkpark-next-app&repository-name=barkpark-next-app)

> **One click, no env vars.** The deploy ships with a bundled snapshot of the public Barkpark docs
> dataset, so it comes up as a **working static demo** — search, reader, and graph all live, with no
> backend. Connect *your* Barkpark afterwards (below) to go live.

> 🤖 **Agent-ready.** [`CLAUDE.md`](CLAUDE.md) / [`AGENTS.md`](AGENTS.md) make any AI coding agent a
> Barkpark power user *inside this repo* — efficient `bp` CLI use, the task queue, content
> modelling, and the Next ↔ Barkpark wiring.

---

## Quick start

```bash
git clone https://github.com/FRIKKern/barkpark-next-starter my-app && cd my-app
npm install
npm run dev                    # → http://localhost:3000  (static demo, no Barkpark needed)
```

That's it — the finder works immediately on the bundled snapshot. When you're ready for live,
editable content, bind the folder to a Barkpark project:

```bash
npm run new-project my-app     # creates the project + wires the app to it → live
```

### Three ways it runs

| Mode | Content source | Setup |
|---|---|---|
| **Static demo** (default) | bundled snapshot in `lib/static/` | nothing — `npm run dev` |
| **Local Barkpark** | a Barkpark on `localhost:4000` | `npm run new-project <name>` |
| **Your cloud Barkpark** | your hosted instance | [docs/GOING-LIVE.md](docs/GOING-LIVE.md) |

The app picks **static mode** automatically when no Barkpark is configured (no token + a
local/unset URL). A token or a non-local `NEXT_PUBLIC_API_URL` switches it to live. Force either way
with `BARKPARK_STATIC=1` / `=0`.

## `npm run new-project <name>` — bind a project

Against a local Barkpark by default (`http://localhost:4000`, dev token), it:

1. creates a project **`<name>`** in the **default workspace** (`bp workspace project-create`),
2. writes **`.envrc`** so every `bp` command in this folder auto-targets `default/<name>/production`,
3. writes **`.env.local`** so the Next app reads that same project.

> No local Barkpark yet? Install the CLI + run the stack from
> [FRIKKern/barkpark](https://github.com/FRIKKern/barkpark) (`docs/setup`) — or skip straight to a
> cloud one with [docs/GOING-LIVE.md](docs/GOING-LIVE.md).

### Per-folder `bp` scoping

`bp` honours `BARKPARK_WORKSPACE` / `BARKPARK_PROJECT` / `BARKPARK_DATASET`. The generated `.envrc`
sets them, so with **[direnv](https://direnv.net)** every `bp` command in this folder targets your
project — no `-w` / `-p` flags, ever:

```bash
bp doc ls paper                # → default/my-app/production
bp schema apply -f schema.json
bp doc mutate --file seed.json
```

No direnv? `set -a; . ./.envrc; set +a` scopes the current shell.

## Going live on your own cloud

You host Barkpark yourself (Docker or a VPS), point this app at it, and deploy. The full
walkthrough — stand up Barkpark, mint a read-only token, deploy the Next app, wire webhooks for
live cache busting — is in **[docs/GOING-LIVE.md](docs/GOING-LIVE.md)**.

The app reads its project from these (the token is **server-side only** — never `NEXT_PUBLIC_*`):

| Var | Purpose | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | your Barkpark base URL | `http://localhost:4000` |
| `BARKPARK_READ_TOKEN` | server-side read token | — (unset → static demo) |
| `BARKPARK_PROJECT` | the project the app reads | — (unset → flat/static) |
| `BARKPARK_WORKSPACE` | workspace | `default` |
| `BARKPARK_DATASET` | dataset | `production` |

Set them in **Vercel ▸ Project ▸ Settings ▸ Environment Variables** (the zero-env deploy adds none
for you — add these when you go live), or locally via `npm run new-project`.

## What's inside

- **Next.js 16 App Router** + the official **`@barkpark/nextjs`** + **`@barkpark/core`** SDK.
- The **finder**: search (`/find`), reader (`/d/[type]/[slug]`), `/papers`, and an interactive
  corpus-graph landing.
- **Static fallback** — `lib/static/` (a bundled snapshot) + `lib/static/index.ts`; the read paths
  (`bp-fetch`, the reader, the list queries) serve it when no Barkpark is configured.
- `lib/barkpark-client.ts` — scoped client. `lib/bp-fetch.ts` — resilient, `SCOPE`-aware fetch.
  `scripts/new-project.sh` — the project binder.
