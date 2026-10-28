# Shared demo deploy

One Docker Compose stack classmates can use: **signup → Content Pipeline template → Test run**, with per-user workflow isolation and shared platform API keys.

## What you get

| Service | Role |
|---------|------|
| `web` | SPA on port **8080** (nginx; proxies `/api` → api) |
| `api` | Fastify + in-process schedule runner (always-on) |
| `postgres` | Prisma data |

Auth: register / login / refresh / logout. Quotas default to **20 runs/user/day**. Facebook/Slack publish is **off** (`DEMO_PUBLISH_ENABLED=false`) unless you turn it on.

## 1. Env checklist

Copy [`.env.example`](../.env.example) to `.env.prod` and set at least:

```bash
JWT_ACCESS_SECRET=…          # ≥32 random chars
JWT_REFRESH_SECRET=…         # different ≥32 chars
WEB_ORIGIN=https://your.domain   # or http://YOUR_VPS_IP:8080 for smoke
POSTGRES_PASSWORD=…          # strong password
DEMO_MODE=true
DEMO_PUBLISH_ENABLED=false
DEMO_USER_PASSWORD=…         # optional supervisor account password
GEMINI_API_KEY=…
TAVILY_API_KEY=…
UNSPLASH_ACCESS_KEY=…
# Optional live publish later:
# DEMO_PUBLISH_ENABLED=true
# FACEBOOK_PAGE_TOKEN=…
# FACEBOOK_PAGE_ID=…
# SLACK_WEBHOOK_URL=…
```

Prefer Spreadsheet ID `content-calendar` (Postgres stand-in) on the public demo so you do not expose a real Google Sheet.

## 2. Bring up locally (smoke)

From the repo root (Docker Desktop running):

```bash
docker compose -p flowforge-demo -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

(`name: flowforge-demo` in the compose file keeps this stack off the local `docker-compose.yml` Postgres.)

Open **http://localhost:8080**.

- Health: `http://localhost:8080/health`
- Seeded walkthrough user: `demo@flowforge.local` / `DEMO_USER_PASSWORD` (default `demo-flowforge`) when `RUN_SEED=true`

Logs:

```bash
docker compose -p flowforge-demo -f docker-compose.prod.yml logs -f api
```

Tear down:

```bash
docker compose -p flowforge-demo -f docker-compose.prod.yml down
```

## 3. Public URL (VPS or Railway/Render)

**VPS:** install Docker, clone the repo, place `.env.prod`, run the same compose command, open firewall for `8080` (or put Caddy/nginx TLS in front and set `WEB_ORIGIN` to `https://…`).

**Railway / Render:** create a Postgres plugin plus two services from the Dockerfiles (`apps/api/Dockerfile` with monorepo root context; `frontend/Dockerfile` with `frontend/` context). Set the same env vars; point `WEB_ORIGIN` at the web URL; set web build `VITE_API_URL` empty and configure the platform to route `/api` to the API, **or** set `VITE_API_URL` to the public API URL and lock CORS to `WEB_ORIGIN`.

Keep the **API process always running** so hosted schedules fire.

## 4. Invite classmates

1. Share the public URL.
2. They **Sign up** with email + password (5 registrations / hour / IP).
3. Empty dashboard → **Create Content Pipeline**.
4. Open Settings to see remaining daily runs.
5. Supervisor can use `demo@flowforge.local` for the viva script.

## 5. Abuse controls (defaults)

| Control | Default |
|---------|---------|
| Register | 5 / hour / IP |
| Login | 20 / 15 min / IP |
| Runs | 20 / user / day |
| Concurrent runs | 1 |
| Workflows | 15 / user |
| ACTIVE schedules | 2 / user |
| Schedule gap | ≥ 15 minutes |

Override with `DEMO_MAX_*` env vars.
