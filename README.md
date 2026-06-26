# Barkpark + Next.js starter

A practical starter for building a **Next.js** app on **[Barkpark](https://github.com/FRIKKern/barkpark)**,
a headless CMS. It's the Barkpark **content finder** — full-text search, a reader, and a corpus
graph — wired to one Barkpark **project**. Clone it, bind it to a project (in the default
workspace), and go.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/FRIKKern/barkpark-next-starter&env=NEXT_PUBLIC_API_URL,BARKPARK_READ_TOKEN,BARKPARK_WORKSPACE,BARKPARK_PROJECT,BARKPARK_DATASET&envDescription=Point%20at%20your%20Barkpark%20instance%20(see%20the%20README)&project-name=barkpark-next-app&repository-name=barkpark-next-app)

> 🤖 **Agent-ready.** [`CLAUDE.md`](CLAUDE.md) / [`AGENTS.md`](AGENTS.md) make any AI coding agent a
> Barkpark power user *inside this repo* — efficient `bp` CLI use (discover the API, batch atomic
> mutations, folder-scoped commands), the task queue, content modelling, and the Next ↔ Barkpark
> wiring (scoped client, webhook revalidation, live updates).

---

## Quick start (local)

```bash
git clone https://github.com/FRIKKern/barkpark-next-starter my-app && cd my-app
npm install
npm run new-project my-app     # creates Barkpark project "my-app" + binds this folder to it
npm run dev                    # → http://localhost:3000
```

`new-project` (against a local Barkpark by default — `http://localhost:4000`, dev token):

1. creates a project **`my-app`** in the **default workspace** (`bp workspace project-create`),
2. writes **`.envrc`** so every `bp` command in this folder auto-targets `default/my-app/production`,
3. writes **`.env.local`** so the Next app reads that same project.

> Need a local Barkpark first? Install the CLI and run the stack from
> [FRIKKern/barkpark](https://github.com/FRIKKern/barkpark) (`docs/setup`). Or point this at a
> cloud Barkpark — see **Connect Barkpark** below.

## Per-folder `bp` scoping

`bp` honours the `BARKPARK_WORKSPACE` / `BARKPARK_PROJECT` / `BARKPARK_DATASET` env vars. The
generated `.envrc` sets them, so with **[direnv](https://direnv.net)** every `bp` command you run
in this folder automatically targets your project — no `-w` / `-p` flags, ever:

```bash
bp doc ls post                 # → default/my-app/production
bp schema apply -f schema.json # applied to this project
bp doc mutate --file seed.json
```

No direnv? Either `brew install direnv` (and hook your shell), or `set -a; . ./.envrc; set +a` to
scope the current shell.

## Connect Barkpark

Point `new-project` at a **cloud** Barkpark instead of local:

```bash
BARKPARK_API_URL=https://api.barkpark.cloud BP_ADMIN_TOKEN=<admin-token> npm run new-project my-app
```

The app reads its project from these (written to `.env.local`; the token is **server-side only**):

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Barkpark base URL |
| `BARKPARK_READ_TOKEN` | server-side read token (Bearer on every SSR fetch) |
| `BARKPARK_WORKSPACE` · `BARKPARK_PROJECT` | the workspace/project the app reads (`default` / your name) |
| `BARKPARK_DATASET` | dataset (`production`) |

`lib/barkpark-client.ts` (the reader) and `lib/bp-fetch.ts` (search / `SCOPE`) both read these and
scope every request to `/w/<workspace>/p/<project>/…`.

## Deploy (Vercel)

Click **Deploy** above (or `vercel --prod`) and set the env vars to your **cloud** Barkpark.
This starter reads content **live** from Barkpark — there's no bundled content — so a deployment
needs a reachable Barkpark + a read token. *(For the Deploy button to work for others, this repo
must be public.)*

## What's inside

- **Next.js 16 App Router** + the official **`@barkpark/nextjs`** + **`@barkpark/core`** SDK.
- The **finder**: search (`/find`), reader (`/d/[type]/[slug]`), `/papers`, and an interactive
  corpus-graph landing.
- `lib/barkpark-client.ts` — per-request scoped client. `lib/bp-fetch.ts` — resilient, `SCOPE`-aware
  upstream fetch. `scripts/new-project.sh` — the project binder.
