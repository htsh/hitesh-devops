# OpenViking Instance Access

Last updated: 2026-04-03

## Current local instance

OpenViking is running on the Debian machine in:
- `~/projects/openviking`

Runtime details:
- OpenViking HTTP API: port `1933`
- Secondary service also exposed by container: port `8020`
- llama.cpp model servers run on the host, not inside Compose
- Embedding endpoint: `http://host.docker.internal:8081/v1`
- VLM endpoint: `http://host.docker.internal:8082/v1`

## Connection info from another machine

Use:
- `http://YOUR-DEBIAN-IP:1933` on local network, or preferably
- `http://YOUR_TAILSCALE_IP:1933` over Tailscale

Do not use `127.0.0.1` from another machine; that only works on the Debian host itself.

## Authentication

The API key is stored locally on the Debian machine in:
- `~/projects/openviking/ov.conf`

JSON field:
- `server.root_api_key`

Example request:

```bash
curl -H "X-API-Key: YOUR_KEY" http://YOUR_HOST:1933/health
```

Expected response:

```json
{"status":"ok","healthy":true,"version":"v0.3.3"}
```

## How to discover the right host address on the Debian machine

```bash
hostname -I
tailscale ip -4
```

Recommended default for cross-machine usage:
- Tailscale IP + port 1933

Example:

```bash
curl -H "X-API-Key: YOUR_KEY" http://100.x.y.z:1933/health
```

## Typical client env vars

Many local scripts/agent environments can be wired with:

```bash
export OPENVIKING_URL="http://YOUR_HOST:1933"
export OPENVIKING_API_KEY="YOUR_KEY"
```

If a client expects a different variable name, keep the same values:
- base URL = OpenViking host + `:1933`
- API key = `server.root_api_key`

## Mac / Claude Code note

For a Claude Code environment on macOS, the important pieces are the same:
- base URL: `http://YOUR_HOST:1933`
- header/API key: `X-API-Key: YOUR_KEY`

Prefer private connectivity over Tailscale instead of opening the service publicly.

## Operational notes

- Current container health check succeeds on `http://127.0.0.1:1933/health` from the Debian host.
- The service is currently bound externally through Docker on `0.0.0.0:1933`.
- If external access is broader than intended, tighten firewall rules or restrict use to Tailscale.
- If rotating credentials, update `server.root_api_key` in `~/projects/openviking/ov.conf` and restart with:

```bash
cd ~/projects/openviking
docker compose restart
```
