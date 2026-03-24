# Hermes handoff: hitesh-devops

Last updated: 2026-03-24

## Purpose of this note

This file is intended as cross-agent handoff context for future Hermes sessions working inside `hitesh-devops`.

The main topic discussed in this session was a possible future service that turns important Gmail events into notifications, with SMS as a likely later step.

## User preference for repo-local notes

The user explicitly asked that project/software thoughts and planning context be stored in a repo-local `hermes/` folder when useful, so that other Hermes agents on other computers can pick up the thread.

## Current infrastructure understanding

The user's infrastructure is documented as `hitesh-cloud`.

### Nodes

Three VPS nodes connected over Tailscale:

- `vps1` = public edge + app hosting
- `vps2` = data-heavy workloads, ingest, databases, and heavier services
- `vps3` = lightweight utility / internal operations / keep quiet and stable

### Important placement heuristics

From `docs/infra/infra.md`:
- public frontends and reverse-proxy entrypoints usually belong on `vps1`
- databases, workers, ingest, and high-I/O jobs usually belong on `vps2`
- low-noise internal operations services are a good fit for `vps3`

### Shared services observed

- Tailscale between all nodes
- Caddy on `vps1` and `vps2`
- Mongo standalone instances on all nodes
  - `vps2` is the main shared Mongo
  - `vps3` has local Mongo intended for monitor-related use
- Redis on `vps1` and `vps2`
- PM2 used for Node services on app-capable nodes
- PostgreSQL installed on `vps2`
- MariaDB installed on `vps2`

## Monitor app understanding

The repo already contains a strong pattern for internal-ops software:

- `apps/monitor` is intended for `vps3`
- local Mongo on `vps3`
- PM2 deployment
- Tailscale-only admin access
- `ntfy` used as the current notification channel

Observed deployment details:
- app binds on `0.0.0.0:3100`
- dashboard intended to be reachable only from the tailnet
- env template includes:
  - `MONGO_URI=mongodb://localhost:27017/monitor`
  - `NTFY_URL=https://ntfy.sh`
  - `NTFY_TOPIC=hitesh-monitor`

This is important because it suggests a natural home and pattern for future personal alerting software.

## Gmail + Calendar state from this session

Hermes (outside this repo) was configured during this session with:
- Gmail read/send/modify
- Gmail settings/basic (for filters)
- Calendar access

That token lives in the user's home Hermes config, not in this repo:
- `~/.hermes/google_token.json`

So the user now has working Hermes-level Gmail + Calendar access.

## Potential future project: important-email alerts

The user is considering a system where important emails trigger text alerts.

### Likely requirements

- monitor Gmail for high-value messages
- distinguish trusted/real mail from wrong-recipient inbox noise
- notify the user quickly for a narrow important subset
- probably deploy as a package/service on the user's own infrastructure

### Strong recommendation on placement

Best initial placement: `vps3`

Why:
- internal ops / personal tooling fit
- low public exposure needed
- already matches the monitor app pattern
- can keep state in local Mongo on `vps3`
- can notify outward using existing `ntfy` first, and Twilio/SMS later

### Suggested architecture

A small service on `vps3` that:

1. polls Gmail API for targeted queries or watches trusted labels/senders
2. deduplicates notifications in Mongo
3. sends notifications through:
   - `ntfy` initially
   - Twilio SMS later if desired
4. optionally exposes a Tailscale-only admin UI or config file for trusted senders and rules

### Good initial signal sources

- trusted correspondents
- specific labels (e.g. `VIP`, `Trusted`, `STARRED` if intentionally curated)
- unread mail from trusted senders
- time-sensitive transactional mail that is actually the user's

## Gmail trust context relevant to alerting

The user's Gmail address is `hitesh@gmail.com` and receives a lot of misdirected email intended for other people named Hitesh, often in India.

This is crucial for alerting design:
- do not alert on generic finance/travel/account emails by default
- alerting must be trust-first, not inbox-wide
- otherwise SMS will become noisy and useless

Trusted correspondents explicitly identified so far:
- Daniel Schley `<dan@yorkrun.com>`
- Dilip Aidasani `<dilips@gmail.com>` (user's brother)
- Laura Drago `<laurad@corcoranss.com>` (realtor)

## Twilio discussion status

Twilio was discussed conceptually only.

No Twilio credentials were configured in this session.
The user said: not yet.

The likely future direction is:
- start with `ntfy`
- later add Twilio SMS for a narrow, high-priority subset of notifications

## Potential next tasks for another agent

1. Write a short design note for a `gmail-alerts` service under this repo
2. Decide whether it should live as:
   - a standalone service in `apps/`
   - an extension of `apps/monitor`
   - or a lightweight worker with no UI initially
3. Define a trusted-sender rules file or collection schema
4. Start with `ntfy` notifications before SMS
5. Add Twilio only after the trust/noise logic is proven

## iMessage attachment export project handoff

A new cross-machine project was started to reduce Messages storage usage while preserving old dog photos.

### User goal

The user has many old iMessage threads with lots of pictures. They want to:
- keep the pictures
- export them into Dropbox
- later delete/archive the old threads to free local disk space

The user specifically wants to prioritize dog photos.

### Threads identified as the primary targets

Two old dog-related threads were identified from the Messages database scan on this Mac:

1. `Dogs of 222 East 111`
   - `chat_id = 583`
   - last message seen in DB scan: `2023-10-12`
   - image count in DB: about `1,591`
   - estimated logical image volume from DB/file metadata: about `4.0 GB`

2. `East Harlem Social Club`
   - `chat_id = 595`
   - last message seen in DB scan: `2023-04-03`
   - image count in DB: about `140`
   - estimated logical image volume from DB/file metadata: about `330.3 MB`

These estimates were useful for prioritization, but they should not be treated as exact reclaimed disk space.

### What was found on this Mac

This Mac had:
- `~/Library/Messages/chat.db` present
- `~/Library/Messages/Attachments/` present
- total `~/Library/Messages` size around `3.6 GB`
- total `~/Library/Messages/Attachments` size around `1.8 GB`

However, when the export was attempted from the local Messages attachment store, almost all source attachment files referenced by the database were missing locally.

This strongly suggests one of:
- Messages/iCloud has offloaded older attachments on this machine
- the DB still references historical attachments that are no longer present locally
- only lightweight/sticker assets remain local for many of those historical messages

### Export attempt performed on this Mac

A real export attempt was run for the two dog-related threads into Dropbox.

Destination created:
- `/Users/hitesh/Library/CloudStorage/Dropbox/DOGS`

Created subfolders:
- `/Users/hitesh/Library/CloudStorage/Dropbox/DOGS/Dogs of 222 East 111`
- `/Users/hitesh/Library/CloudStorage/Dropbox/DOGS/East Harlem Social Club`

Manifest files created:
- `/Users/hitesh/Library/CloudStorage/Dropbox/DOGS/manifest.json`
- `/Users/hitesh/Library/CloudStorage/Dropbox/DOGS/manifest.csv`

Result of that export attempt on this machine:
- copied successfully: `5` files
- missing source files: `1,726`
- total copied size: about `524 KB`

Per thread:
- `Dogs of 222 East 111`: `5` copied, `1,586` missing
- `East Harlem Social Club`: `0` copied, `140` missing

Important detail: the copied files were effectively sticker / emoji-style PNG assets, not the main dog photo archive the user actually wants.

### Critical conclusion for the next Hermes agent

Do not assume this Mac has the real attachment payloads.

The user explicitly said they have another Mac with a much larger SSD and with the messages downloaded there. That other Mac is the correct machine to continue this project.

The next Hermes agent should continue from that other Mac and treat this Mac only as a reconnaissance / planning pass.

### Recommended continuation plan on the other Mac

1. Confirm that the other Mac has the old dog photos actually downloaded locally in Messages.
2. Re-run a read-only scan against:
   - `~/Library/Messages/chat.db`
   - `~/Library/Messages/Attachments/`
3. Re-check the same two chat targets first:
   - `chat_id 583` = `Dogs of 222 East 111`
   - `chat_id 595` = `East Harlem Social Club`
4. Export image attachments into Dropbox under a `DOGS` folder.
5. Write a manifest of copied files with:
   - thread name
   - chat id
   - attachment id
   - message id / guid
   - message date
   - source path
   - destination path
   - byte size
   - hash if practical
6. Verify counts and exported size before any deletion.
7. Only after successful verification, consider thread deletion or cleanup.

### Operational cautions

- No message/thread deletion was performed in this session.
- No destructive cleanup was performed.
- Deleting a thread may sync across devices if Messages in iCloud is enabled.
- Deleting a thread does not always immediately reclaim the expected amount of local disk space.
- The safe order is still:
  1. export
  2. verify
  3. only then delete

### Useful paths from this session

- Messages DB on macOS:
  - `~/Library/Messages/chat.db`
- local attachment store:
  - `~/Library/Messages/Attachments/`
- Dropbox export folder created on this machine:
  - `/Users/hitesh/Library/CloudStorage/Dropbox/DOGS`
- export manifests from this machine:
  - `/Users/hitesh/Library/CloudStorage/Dropbox/DOGS/manifest.json`
  - `/Users/hitesh/Library/CloudStorage/Dropbox/DOGS/manifest.csv`

### SQL / workflow hints for the next agent

The useful joins for this task were:
- `chat`
- `chat_message_join`
- `message`
- `message_attachment_join`
- `attachment`
- `chat_handle_join`
- `handle`

A practical filter for images was based on any of:
- `attachment.mime_type LIKE 'image/%'`
- `attachment.uti LIKE 'public.image%'`
- filename / transfer-name suffix checks for `jpg`, `jpeg`, `png`, `heic`, `gif`, `webp`, `tiff`

A practical export strategy was:
- query distinct image attachments for a target chat id
- expand `~/` paths to absolute paths
- skip missing source files, but record them in the manifest
- copy to Dropbox with filenames prefixed by message date and attachment id
- keep a JSON and CSV manifest

### Minor documentation note to verify later

There appears to be a docs inconsistency around `hitesh.cc` mapping:
- one file indicated `hitesh.cc -> vps3`
- another indicated `hitesh.cc -> vps1`

This should be reconciled before depending on that domain placement in future plans.
