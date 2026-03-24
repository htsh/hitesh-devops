# Service Manifest

Snapshot date: 2026-03-21

Purpose: record the current known service footprint by node, public hostname, runtime, and key dependencies.

## vps1

### stagecouch-api

- Status: active
- Product: `Stagecouch`
- Public hostname: `api.stagecouch.net`
- Node: `vps1`
- Repo: `htsh/LMATV`
- Deploy path from deploy runbook: `/home/hitesh/LMATV`
- Backend path from PM2 config: `/home/hitesh/LMATV/lma-admin/backend`
- App runtime: FastAPI served by `uv run uvicorn`
- Process manager: PM2 app `lmatv-api`
- Restart behavior: PM2-managed and configured to restart automatically
- Upstream target: `127.0.0.1:8000`
- Frontend/domain relationship: backend for `stagecouch.net`, with `FRONTEND_ORIGIN=https://stagecouch.net`
- Data dependencies: MongoDB (`lma` database; deploy runbook targets `vps2` as primary in the current replica-set URI), API key protected endpoints
- Public exposure: only Caddy should be public; the backend stays on loopback at `127.0.0.1:8000`
- Verification commands when brought back online:

```sh
pm2 status lmatv-api
pm2 logs lmatv-api --lines 200
curl -sS http://127.0.0.1:8000/api/health -H "X-API-Key: <API_KEY>"
curl -sS https://api.stagecouch.net/api/health -H "X-API-Key: <API_KEY>"
```

- Source note: documented from `htsh/LMATV` deploy files on 2026-03-19, plus user confirmation on 2026-03-20 that the product is `Stagecouch`, the domain points to `vps1`, the service is live, and PM2 is configured to restart it automatically

```caddy
api.stagecouch.net {
	encode zstd gzip

	log {
		output file /var/log/caddy/api.stagecouch.net.log
	}

	handle /api/* {
		reverse_proxy 127.0.0.1:8000
	}

	handle {
		respond "Not Found" 404
	}
}
```

### character-playground

- Status: active
- Product: `Character Playground`
- Public hostname: `characters.stagecouch.net`
- Node: `vps1`
- Repo: `htsh/character-playground`
- Deploy path from deploy runbook: `/home/hitesh/character-playground`
- Backend path from PM2 config: `/home/hitesh/character-playground/backend`
- Frontend path from PM2 config: `/home/hitesh/character-playground/playground-web`
- App runtime: FastAPI backend served by `uv run uvicorn` plus SvelteKit frontend served by `node build`
- Process manager: PM2 apps `character-playground-api` and `character-playground-web`
- Restart behavior: PM2-managed and configured for automatic restart
- Upstream targets:
  - backend: `127.0.0.1:8010`
  - frontend: `127.0.0.1:3000`
- Frontend/domain relationship: single-hostname deployment on `characters.stagecouch.net`; Caddy routes `/v1/*` and `/health` to the backend and all other paths to the frontend
- Data dependencies: MongoDB on `vps2:27017`, database `character_playground`; OpenRouter for LLM-backed features
- Public exposure: only Caddy should be public; both backend and frontend stay on loopback
- Verification commands:

```sh
pm2 status character-playground-api
pm2 status character-playground-web
pm2 logs character-playground-api --lines 200
pm2 logs character-playground-web --lines 200
curl -sS http://127.0.0.1:8010/health
curl -I http://127.0.0.1:3000
curl -sS https://characters.stagecouch.net/health
curl -I https://characters.stagecouch.net/
curl -sS https://characters.stagecouch.net/v1/characters | head
```

- Source note: documented from `htsh/character-playground` deploy files and runbook review on 2026-03-20, plus live deployment confirmation on 2026-03-21 that the service is running on `vps1` with MongoDB on `vps2`

```caddy
characters.stagecouch.net {
	encode zstd gzip

	@api path /v1/* /health
	handle @api {
		reverse_proxy 127.0.0.1:8010
	}

	handle {
		reverse_proxy 127.0.0.1:3000
	}
}
```

### vps1 Port Notes

- `lmatv-api` (`Stagecouch` backend) uses `127.0.0.1:8000`
- `character-playground-api` uses `127.0.0.1:8010`
- `character-playground-web` uses `127.0.0.1:3000`
- Do not place new `vps1` app backends on `127.0.0.1:8000` without explicitly moving `Stagecouch`

## vps2

### postgresql

- Status: installed
- Node: `vps2`
- Service type: relational database
- Current confirmed consumer: none documented yet
- Intended bind target: `127.0.0.1` plus the `vps2` Tailscale IPv4 on `tailscale0`
- Exposure assumption: internal use only over Tailscale; no public ingress should point directly to PostgreSQL
- Authentication note: prefer `scram-sha-256` with explicit `pg_hba.conf` allow rules for known tailnet peers
- Verification commands:

```sh
pg_lsclusters
sudo -u postgres psql -c "show listen_addresses;"
sudo ss -ltnp | grep 5432
```

- Source note: documented from user confirmation on 2026-03-21 that `postgresql` and `postgresql-client` were installed on `vps2`

### mariadb

- Status: active
- Node: `vps2`
- Service type: relational database
- Current confirmed consumer: `bible-api`
- Current confirmed database: `bible_api`
- Exposure assumption: app-local or internal use only; no public ingress should point directly to MariaDB
- Source note: documented from `htsh/bible_api/deploy.md` review on 2026-03-19 and user confirmation that MariaDB is now running on `vps2`

### bible-api

- Status: active
- Public hostname: `bible.hitesh.nyc`
- Node: `vps2`
- Repo: private repo `htsh/bible_api`
- Upstream repo: `seven1m/bible_api`
- Deploy path from deploy guide: `~/apps/bible_api`
- Reverse proxy: Caddy site block for `bible.hitesh.nyc`
- Upstream target: `127.0.0.1:5000`
- App runtime: Sinatra app served by Puma
- Process manager: PM2 app `bible-api`
- Runtime version: Ruby `3.3.9`
- Data dependencies: MariaDB database `bible_api`, Redis, imported Bible data from the `bibles/` submodule
- Public exposure: only `:80` and `:443` should be public; `:5000` stays bound to loopback
- Verification commands:

```sh
curl http://127.0.0.1:5000/John+3:16
curl https://bible.hitesh.nyc/John+3:16
curl -I https://bible.hitesh.nyc/
pm2 status
pm2 logs bible-api --lines 100
```

- Source note: documented from review of `deploy.md` and `ecosystem.config.js` in `htsh/bible_api` on 2026-03-19, plus user confirmation that the Caddy block below is live on `vps2`

```caddy
bible.hitesh.nyc {
    encode gzip zstd
    reverse_proxy 127.0.0.1:5000
}
```
