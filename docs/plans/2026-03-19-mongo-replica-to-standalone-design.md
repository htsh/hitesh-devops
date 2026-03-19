# MongoDB Replica Set to Standalone Migration

Date: 2026-03-19

Status: approved for implementation

## Goal

Migrate MongoDB from a 3-node replica set (`rs0`) to independent standalone instances on each node. `vps2` retains all existing data, `vps3` gets an empty standalone for the upcoming monitor service, and `vps1` gets an empty standalone for future use.

## Current State

- Replica set `rs0` across all three nodes
- `vps2:27017` = PRIMARY (source of truth)
- `vps1:27017` = SECONDARY (full replica)
- `vps3:27017` = ARBITER (no data)

## Target State

- `vps2` — standalone `mongod` with all existing databases
- `vps3` — standalone `mongod`, empty, ready for monitor service
- `vps1` — standalone `mongod`, empty, for future use

## Approach

mongodump/mongorestore via the existing `mongo-backup.py` tool in `utils/mongo-scripts`. Back up from the PRIMARY, tear down the replica set, reconfigure as standalones, and restore only if needed (data should survive on `vps2` since only the `local` database is removed).

## Step-by-Step Plan

### 1. Pre-Migration Backup

1. Run `mongo-backup.py` against the PRIMARY from any Tailscale-connected machine:
   ```bash
   cd utils/mongo-scripts
   uv run mongo-backup.py --url mongodb://vps2:27017 --zip
   ```
2. Select all user databases in the interactive UI.
3. Copy the zip archive to a second location (local machine or another node).
4. Verify the zip contents — confirm each database has BSON files.

### 2. Stop Apps and Freeze Writes

1. On `vps1` and `vps2`, stop PM2-managed apps:
   ```bash
   pm2 stop all
   ```

### 3. Tear Down the Replica Set

1. Connect to the PRIMARY:
   ```bash
   mongosh mongodb://vps2:27017
   ```
2. Remove members:
   ```js
   rs.remove("vps3:27017")
   rs.remove("vps1:27017")
   ```
3. Stop `mongod` on all three nodes:
   ```bash
   sudo systemctl stop mongod
   ```
4. Edit `/etc/mongod.conf` on each node — remove or comment out the replication block:
   ```yaml
   # replication:
   #   replSetName: rs0
   ```
5. On all three nodes, remove the `local` database files to clear replica set metadata:
   ```bash
   sudo rm -rf /var/lib/mongodb/local.*
   ```
   On `vps2`, this only removes oplog/replica set config — user data is untouched.
6. Start `mongod` on all three nodes:
   ```bash
   sudo systemctl start mongod
   ```
7. Verify each is standalone:
   ```bash
   mongosh mongodb://localhost:27017 --eval "rs.status()"
   ```
   Should return an error like "not running with --replSet".

### 4. Verify and Restore

1. On `vps2`, confirm user databases are intact:
   ```bash
   mongosh mongodb://localhost:27017 --eval "show dbs"
   ```
2. If data is present and correct — no restore needed.
3. If data is missing or corrupt, restore from backup:
   ```bash
   unzip backups/march_19_2026_*.zip -d /tmp/mongo-restore
   mongorestore --uri mongodb://localhost:27017 /tmp/mongo-restore/
   rm -rf /tmp/mongo-restore
   ```
4. On `vps1` and `vps3`, confirm only system databases exist.

### 5. Restart Apps and Validate

1. On `vps1` and `vps2`, restart PM2 apps:
   ```bash
   pm2 start all
   ```
2. Update any app connection strings from replica set format (`mongodb://vps1,vps2,vps3/?replicaSet=rs0`) to standalone (`mongodb://localhost:27017`).
3. Keep the backup zip archived for at least a few weeks.

### 6. Update Infrastructure Docs

- `docs/infra/infra.md` — change MongoDB section from replica set to standalone instances
- `CLAUDE.md` — update shared services line
- `AGENTS.md` — update replica set references
- `docs/plans/2026-03-19-monitor-design.md` — note added about topology change

## Rollback

If anything goes wrong after teardown, the backup zip contains a full `mongodump` of all user databases. Restore to any standalone node with `mongorestore`.

## Tools Used

- `utils/mongo-scripts/mongo-backup.py` — interactive backup with mongodump + zip
