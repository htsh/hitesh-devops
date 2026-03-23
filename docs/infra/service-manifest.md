# Service Manifest

Snapshot date: 2026-03-19

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

- Source note: documented from `htsh/LMATV` deploy files on 2026-03-19, plus user confirmation that the product is `Stagecouch`, the domain currently points to `vps1`, the service is not currently running, and the Caddy block below is the current server config

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

## vps2

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
