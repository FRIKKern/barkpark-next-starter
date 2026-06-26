# Barkpark + Next.js starter

A practical starter for building a **Next.js** app on **[Barkpark](https://github.com/FRIKKern/barkpark)**,
a headless CMS. It's the Barkpark **content finder** — full-text search, a reader, and a corpus
graph — wired to one Barkpark **project**. Clone it, bind it to a project (in the default
workspace), and go.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/FRIKKern/barkpark-next-starter&env=BARKPARK_PROJECT,BARKPARK_READ_TOKEN&envDescription=Your%20Barkpark%20project%20slug%20%2B%20a%20read%20token.%20URL%20defaults%20to%20api.barkpark.cloud%2C%20workspace%3Ddefault%2C%20dataset%3Dproduction.&envLink=https://github.com/FRIKKern/barkpark-next-starter%23deploy-vercel&project-name=barkpark-next-app&repository-name=barkpark-next-app)

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
| Var | Purpose | Default |
|---|---|---|
| `BARKPARK_PROJECT` | the project the app reads | — (**required**) |
| `BARKPARK_READ_TOKEN` | server-side read token (Bearer on every SSR fetch) | — (required for scoped reads) |
| `NEXT_PUBLIC_API_URL` | Barkpark base URL | `https://api.barkpark.cloud` on Vercel, `http://localhost:4000` locally |
| `BARKPARK_WORKSPACE` | workspace | `default` |
| `BARKPARK_DATASET` | dataset | `production` |

`lib/barkpark-client.ts` (the reader) and `lib/bp-fetch.ts` (search / `SCOPE`) read these and scope
every request to `/w/<workspace>/p/<project>/…`.

## Deploy (Vercel)

Click **Deploy** above (or `vercel --prod`). Because the non-secret vars have built-in defaults
(`api.barkpark.cloud` · `default` · `production`), the deploy form asks for only the **two that are
genuinely yours** — `BARKPARK_PROJECT` and `BARKPARK_READ_TOKEN`.

> Vercel's deploy form can't be pre-populated with default *values* (the deploy URL only controls
> *which* vars it prompts for) — so two fields is the floor. Self-hosting Barkpark? Set
> `NEXT_PUBLIC_API_URL` in **Project ▸ Settings ▸ Environment Variables** after deploy.

This starter reads content **live** from Barkpark (no bundled content), so a deployment needs a
reachable Barkpark + a read token. *(For the Deploy button to work for others, this repo is public.)*

## What's inside

- **Next.js 16 App Router** + the official **`@barkpark/nextjs`** + **`@barkpark/core`** SDK.
- The **finder**: search (`/find`), reader (`/d/[type]/[slug]`), `/papers`, and an interactive
  corpus-graph landing.
- `lib/barkpark-client.ts` — per-request scoped client. `lib/bp-fetch.ts` — resilient, `SCOPE`-aware
  upstream fetch. `scripts/new-project.sh` — the project binder.
