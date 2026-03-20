# MongoDB Replica Set to Standalone Migration

Date: 2026-03-19

Status: completed on 2026-03-20

Review date: 2026-03-19

Implementation date: 2026-03-20

## Outcome

The migration has been completed.

- `vps2` is now the main standalone MongoDB host and retains the existing user data
- `vps3` is now a standalone MongoDB host for monitor-related local use
- `vps1` is now a standalone MongoDB host and is no longer part of `rs0`
- MongoDB is no longer running as a replica set across the three VPS nodes

## Goal

Migrate MongoDB from a 3-node replica set (`rs0`) to independent standalone instances on each node.

Target outcome:

- `vps2` retains all existing user data and becomes the main standalone MongoDB host
- `vps3` becomes an empty standalone for the monitor service
- `vps1` becomes either:
  - an empty standalone for future use, or
  - a standalone that retains its old replicated data as a cold copy

This plan assumes the preferred end state is an empty `vps1`. That requires an explicit data-directory wipe after a verified backup. Removing replica-set metadata alone does not make `vps1` empty.

## Current State

- Replica set `rs0` across all three nodes
- `vps2:27017` = PRIMARY (source of truth)
- `vps1:27017` = SECONDARY (full replica)
- `vps3:27017` = ARBITER (no user data)

## Target State

- `vps2` - standalone `mongod` with all existing user databases
- `vps3` - standalone `mongod`, empty, ready for the monitor service
- `vps1` - standalone `mongod`, empty, for future use

## Key Corrections to the Original Draft

- Verify the "no active writers" assumption before the cutover, even if no writers are expected.
- Use direct `mongodump` / `mongorestore` commands. Do not rely on `utils/mongo-scripts/mongo-backup.py`, because that helper is referenced in repo docs but is not present in this checkout.
- Do not make deleting `local.*` the primary conversion step. The primary conversion is removing `replication.replSetName` from `mongod.conf` and restarting each node as standalone.
- If `vps1` must be empty, wipe its data directory explicitly after the backup is verified. Removing `local.*` only clears replica-set metadata; it does not remove replicated user databases.
- Remove voting members one at a time and preserve quorum until `vps2` is the only member left.

## Assumptions

- `vps2` is the only node that must retain current production data.
- Any application that still needs the existing shared data after the cutover will connect to `vps2`, not to `localhost` on `vps1` or `vps3`.
- The examples below assume `storage.dbPath` is `/var/lib/mongodb`; verify the real path in `/etc/mongod.conf` on each node before deleting anything.
- Authentication, bind IPs, and other non-replication settings stay unchanged.

## Pre-Flight Checklist

- [ ] Confirm shell and `sudo` access to `vps1`, `vps2`, and `vps3`
- [ ] Confirm current replica-set roles with `rs.status()` from `vps2`
- [ ] Confirm there are no active application writers to MongoDB
- [ ] Run `pm2 list` on `vps1` and `vps2` and verify no Mongo-writing services are online
- [ ] Review any cron jobs, timers, or one-off scripts that may still write to MongoDB
- [ ] Confirm enough free disk space exists for a full `mongodump` backup
- [ ] Decide explicitly whether `vps1` should be empty or should retain its replicated data as a cold copy
- [ ] Confirm services that still need shared data will move to a direct `vps2` URI after cutover
- [ ] Confirm the monitor app on `vps3` will use a standalone URI such as `mongodb://localhost:27017/monitor`

## Approach

1. Verify there are no active writers.
2. Take a consistent backup from the PRIMARY using `mongodump --oplog`.
3. Remove `vps3` and `vps1` from the replica set one at a time until `vps2` stands alone.
4. Remove `replication.replSetName` from each node's MongoDB configuration.
5. Start `vps2` as a standalone first and verify all user databases are intact.
6. Start `vps3` as an empty standalone for the monitor service.
7. If `vps1` is meant to be empty, wipe its data directory before starting it as a standalone.

## Step-by-Step Plan

### 1. Preflight

1. Confirm the current replica set roles from `vps2`:
   ```bash
   mongosh mongodb://vps2:27017 --eval 'rs.status().members.map(m => ({name: m.name, state: m.stateStr}))'
   ```
2. On each node, confirm the configured `storage.dbPath` in `/etc/mongod.conf`.
3. On `vps1` and `vps2`, check PM2:
   ```bash
   pm2 list
   ```
4. Review any cron jobs or timers that may still write to MongoDB.
5. Make sure you have shell access to `vps1`, `vps2`, and `vps3`, plus enough free disk space for one full backup.

### 2. Stop Apps and Freeze Writes

1. Stop any PM2-managed apps that might still write to MongoDB:
   ```bash
   pm2 stop all
   ```
2. Confirm there are no remaining writers pointed at the replica set.
3. Do not restart anything that points at `rs0` until the standalone cutover is complete.

### 3. Take the Final Backup

1. From any Tailscale-connected machine, take a full backup from `vps2` after writes are frozen:
   ```bash
   mkdir -p ~/mongo-backups/2026-03-19-rs0-cutover
   mongodump \
     --uri "mongodb://vps2:27017/?directConnection=true" \
     --oplog \
     --out ~/mongo-backups/2026-03-19-rs0-cutover/dump
   ```
2. Archive the dump:
   ```bash
   tar -C ~/mongo-backups/2026-03-19-rs0-cutover \
     -czf ~/mongo-backups/2026-03-19-rs0-cutover.tgz dump
   ```
3. Copy the archive to a second location before changing the servers.
4. Verify the dump contents:
   ```bash
   find ~/mongo-backups/2026-03-19-rs0-cutover/dump -maxdepth 2 -type f | sort | head -n 50
   ```

### 4. Reduce the Replica Set to `vps2` Only

1. Stop `mongod` on `vps3` first:
   ```bash
   sudo systemctl stop mongod
   ```
2. From `vps2`, remove `vps3` from the replica set:
   ```bash
   mongosh mongodb://localhost:27017
   ```
   ```js
   rs.remove("vps3:27017")
   rs.status()
   ```
3. Wait for the reconfiguration to settle and confirm the set now contains only `vps2` and `vps1`.
4. From `vps2`, remove `vps1` from the replica set while `vps1` is still available, so quorum is preserved during the reconfiguration:
   ```js
   rs.remove("vps1:27017")
   rs.status()
   ```
5. After `rs.status()` shows `vps2` as the only remaining member, stop `mongod` on `vps1`:
   ```bash
   sudo systemctl stop mongod
   ```
6. Stop `mongod` on `vps2`:
   ```bash
   sudo systemctl stop mongod
   ```

### 5. Convert the Nodes to Standalone

1. Edit `/etc/mongod.conf` on each node and remove or comment out the replication block:
   ```yaml
   # replication:
   #   replSetName: rs0
   ```
2. On `vps2`, leave the existing data directory untouched.
3. Do not delete `local.*` as part of the default path.
4. Start `mongod` on `vps2` first:
   ```bash
   sudo systemctl start mongod
   ```
5. Verify `vps2` is now running as a standalone:
   ```bash
   mongosh mongodb://localhost:27017 --eval "rs.status()"
   ```
   Expected result: an error indicating the server is not running with `--replSet`.
6. Start `mongod` on `vps3`:
   ```bash
   sudo systemctl start mongod
   ```
7. If `vps1` is intended to be empty, wipe its configured `dbPath` completely while `mongod` is stopped:
   ```bash
   sudo rm -rf /var/lib/mongodb/*
   sudo chown -R mongodb:mongodb /var/lib/mongodb
   sudo systemctl start mongod
   ```
   If your deployment uses a different `dbPath`, replace `/var/lib/mongodb` with that path.
8. If `vps1` should keep its existing replicated data as a cold copy instead, skip the wipe and simply start `mongod` after the config change.

### 6. Verify Data Placement and Restore if Needed

1. On `vps2`, confirm user databases are intact:
   ```bash
   mongosh mongodb://localhost:27017 --eval "show dbs"
   ```
2. Confirm `vps3` is effectively empty apart from system databases.
3. Confirm `vps1` matches the chosen path:
   - empty standalone if the data directory was wiped
   - cold-copy standalone if the existing data was retained
4. If `vps2` data is present and correct, no restore is needed.
5. If `vps2` data is missing or corrupt, restore the final backup to `vps2`:
   ```bash
   mongorestore \
     --uri "mongodb://localhost:27017/?directConnection=true" \
     --oplogReplay \
     ~/mongo-backups/2026-03-19-rs0-cutover/dump
   ```

### 7. Restart Apps and Validate

1. Update application connection strings before restarting PM2.
2. Any service that needs the existing shared data should move from the replica set URI to a direct `vps2` URI, for example `mongodb://vps2:27017/<db>`.
3. Only use `mongodb://localhost:27017` on `vps1` or `vps3` for services that are meant to use those local standalone instances.
4. For the monitor app on `vps3`, use a standalone local URI such as:
   ```bash
   MONGO_URI=mongodb://localhost:27017/monitor
   ```
5. Restart PM2 apps only after the standalone nodes are verified healthy:
   ```bash
   pm2 start all
   ```
6. Smoke test the applications that depend on MongoDB.
7. Keep the backup archive for at least a few weeks.

## Recovery Notes

This plan is intended for the MongoDB cutover only. It is not a full rollback plan back to the original replica set topology.

- Before you clear the data directory on `vps1`, you can still abort by restoring the original replication config and starting the nodes again as replica set members.
- After `vps1` is wiped, treat the change as one-way. Recovery means restoring the data-bearing standalone on `vps2` and rebuilding any additional nodes from there.
- If a node fails to start as a standalone after the config change, preserve its data directory first and investigate before deleting anything beyond the chosen wipe step for `vps1`.

## References

- [MongoDB Docs: `mongodump`](https://www.mongodb.com/docs/manual/reference/mongodump/)
- [MongoDB Docs: `mongorestore` examples](https://www.mongodb.com/docs/database-tools/mongorestore/mongorestore-examples/)
- [MongoDB Docs: Remove a Replica Set Member](https://www.mongodb.com/docs/current/tutorial/remove-replica-set-member/)
- [MongoDB Docs: `rs.remove()`](https://www.mongodb.com/docs/current/reference/method/rs.remove/)
- [MongoDB Docs: Maintain Replica Set Members as Standalone for Maintenance](https://www.mongodb.com/docs/v8.0/tutorial/perform-maintence-on-replica-set-members/)

## Tools Used

- `mongosh`
- `mongodump`
- `mongorestore`
