# Going live — host Barkpark on your own cloud

You develop locally (the static demo, then `npm run new-project` + a local Barkpark). Going to
production means two things live: **your Barkpark** (the CMS) on infrastructure you control, and
**the Next app** (Vercel or anywhere) pointing at it.

```
 ┌─────────────┐        ┌──────────────────────┐        ┌─────────────────┐
 │  Next app   │  HTTPS │  Barkpark (your cloud)│  SQL   │  Postgres       │
 │  (Vercel)   │ ─────▶ │  Phoenix on :4000     │ ─────▶ │  barkpark_prod  │
 │  read token │        │  behind Caddy (TLS)   │        │                 │
 └─────────────┘        └──────────────────────┘        └─────────────────┘
```

## 1. Stand up Barkpark

### Option A — Docker (any VM / container host) — easiest

Barkpark publishes an image at **`ghcr.io/barkpark/api`**. A minimal production stack:

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: barkpark_prod
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      retries: 5
  api:
    image: ghcr.io/barkpark/api:latest
    ports: ["4000:4000"]
    environment:
      - DATABASE_URL=ecto://postgres:postgres@db/barkpark_prod
      - SECRET_KEY_BASE=${SECRET_KEY_BASE}     # openssl rand -base64 48
      - PHX_HOST=cms.yourdomain.com            # your public hostname
      - PHX_SCHEME=https
      - PORT=4000
    depends_on:
      db: { condition: service_healthy }
volumes:
  pgdata: {}
```

```bash
export SECRET_KEY_BASE=$(openssl rand -base64 48)
docker compose up -d        # the entrypoint migrates the DB, then serves on :4000
```

Terminate **TLS** with Caddy (it auto-issues + renews certs and reverse-proxies to :4000):

```caddy
# /etc/caddy/Caddyfile
cms.yourdomain.com {
  reverse_proxy localhost:4000
}
```

> Set `PHX_HOST` to your real hostname and `PHX_SCHEME=https`. Phoenix checks the request Origin, so
> a mismatch silently drops the live-update WebSocket (and can 403 the Studio).

### Option B — VPS (Elixir release + systemd)

Clone Barkpark, build a release, run it under systemd behind Caddy. The canonical runbooks:
[`docs/ops/PROD_OPS.md`](https://github.com/FRIKKern/barkpark/blob/main/docs/ops/PROD_OPS.md) and
[`docs/ops/adding-a-domain.md`](https://github.com/FRIKKern/barkpark/blob/main/docs/ops/adding-a-domain.md).

## 2. Create your project + load content

Point the binder at the live instance (it creates the project in the default workspace and writes
`.envrc` so `bp` here targets it):

```bash
BARKPARK_API_URL=https://cms.yourdomain.com BP_ADMIN_TOKEN=<admin> npm run new-project my-app
# then, with bp now scoped to this project:
bp schema apply -f schema.json
bp doc mutate --file content.json        # createOrReplace + publish (atomic batch)
```

## 3. Mint a read-only token (never ship admin/write to the browser)

```bash
curl -X POST "https://cms.yourdomain.com/w/default/p/my-app/v1/tokens" \
  -H "Authorization: Bearer <admin>" -H "Content-Type: application/json" \
  -d '{"label":"web-read","permissions":["public-read"],"dataset":"production"}'
```

Copy the returned token — that's `BARKPARK_READ_TOKEN` for the app. (Add `"listen"` to
`permissions` if you want `<BarkparkLive/>` live refresh.)

## 4. Deploy the Next app (Vercel)

Click **Deploy** (or `vercel --prod`). The zero-env deploy comes up as the static demo — to go live,
add these in **Vercel ▸ Project ▸ Settings ▸ Environment Variables**, then redeploy:

| Var | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://cms.yourdomain.com` |
| `BARKPARK_READ_TOKEN` | the token from step 3 |
| `BARKPARK_PROJECT` | `my-app` |

(`BARKPARK_WORKSPACE` defaults to `default`, `BARKPARK_DATASET` to `production`.) Setting the token
flips the app out of static mode into live reads of your project.

## 5. Live content updates (webhook)

So a publish busts the app's caches immediately:

```bash
bp webhook create --dataset production --url https://your-app.vercel.app/api/barkpark/webhook
```

The app's `/api/barkpark/webhook` route calls `revalidateBarkpark()` → `revalidateTag(...)`, busting
exactly the caches a publish touched. Optionally set `NEXT_PUBLIC_BARKPARK_LIVE=1` (with a
`listen`-capable token) for SSE/WS live refresh via `<BarkparkLive/>`.

---

**Checklist**

- [ ] Barkpark reachable over HTTPS (`curl https://cms.yourdomain.com/api/schemas`)
- [ ] `PHX_HOST` / `PHX_SCHEME=https` match the public URL
- [ ] Project created + content published
- [ ] Read-only token minted (not admin)
- [ ] App env set on Vercel + redeployed (static banner gone → live)
- [ ] Webhook created → publishes revalidate the app
