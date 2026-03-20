# Monitor Deployment Guide

## Prerequisites

On `vps3`:
- Node.js 22+
- PM2 installed globally (`npm i -g pm2`)
- MongoDB running locally on port 27017
- SSH key access from vps3 to vps1 and vps2 over Tailscale
- Tailscale connected

## Build

```bash
cd apps/monitor
npm install
npm run build
```

This produces `dist/server/` (compiled server) and `dist/web/` (built React app).

## Configure

```bash
cp env.production.template .env
# Edit .env with actual values (ntfy topic, SSH hosts, etc.)
```

## Deploy with PM2

```bash
# First time
pm2 start ecosystem.config.cjs

# Subsequent deploys
npm run build
pm2 restart hitesh-monitor
```

## Verify

```bash
# Check process is running
pm2 status hitesh-monitor

# Check logs
pm2 logs hitesh-monitor --lines 50

# Health check
curl http://localhost:3100/api/health

# Dashboard (from any Tailscale-connected device)
# Open http://vps3:3100 in browser
```

## Smoke Test Checklist

- [ ] `pm2 status` shows `hitesh-monitor` as `online`
- [ ] `curl http://localhost:3100/api/health` returns `{"status":"ok"}`
- [ ] Dashboard loads at `http://<vps3-tailscale-ip>:3100`
- [ ] Overview page shows target counts
- [ ] Services page shows grouped services
- [ ] Targets page shows all 17 seed targets
- [ ] Scheduler log shows checks executing every 10s
- [ ] HTTP checks against public endpoints succeed
- [ ] SSH-based checks against vps1/vps2 succeed
- [ ] Creating a basic target via dashboard works
- [ ] Run Now triggers a manual check
- [ ] ntfy notification arrives when a target goes down (test with a known-bad URL)
- [ ] Dashboard is NOT accessible from public internet (only Tailscale)

## Tailscale-Only Access

The app binds to `0.0.0.0:3100`. Access is restricted by:
1. vps3 firewall — port 3100 should NOT be open to public
2. Tailscale network — only devices on the tailnet can reach vps3's Tailscale IP

Verify with: `curl http://<vps3-public-ip>:3100` should fail from outside.

## SSH Key Setup

For SSH-based checks (PM2, Docker, Mongo, Redis):

```bash
# On vps3, generate a dedicated key (if not already done)
ssh-keygen -t ed25519 -f ~/.ssh/monitor_ed25519 -N ""

# Copy to vps1 and vps2
ssh-copy-id -i ~/.ssh/monitor_ed25519 user@100.64.0.1
ssh-copy-id -i ~/.ssh/monitor_ed25519 user@100.64.0.2

# Add to SSH config for automatic key selection
cat >> ~/.ssh/config << 'EOF'
Host 100.64.0.1
  IdentityFile ~/.ssh/monitor_ed25519
Host 100.64.0.2
  IdentityFile ~/.ssh/monitor_ed25519
EOF
```

## Logs

```bash
pm2 logs hitesh-monitor          # live tail
pm2 logs hitesh-monitor --lines 100  # last 100 lines
```

PM2 log files are at `~/.pm2/logs/hitesh-monitor-out.log` and `hitesh-monitor-error.log`.
