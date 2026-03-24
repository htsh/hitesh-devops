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

### Updated status on the larger-storage Mac (follow-up session)

A later Hermes session confirmed the user is now on the Mac with the larger SSD, and this is the machine they want to use as the long-term local Messages archive machine.

The user explicitly wants this Mac to keep Messages data locally rather than relying on cloud-only/offloaded attachment state.

### Read-only findings from the larger-storage Mac

Local storage snapshot during the follow-up session:
- `~/Library/Messages` size: about `2.7 GB`
- `~/Library/Messages/Attachments` size: about `1.6 GB`
- `~/Library/Messages/chat.db` size: about `395 MB`

Chat lookup on this Mac found:
- `chat_id = 658` → `Dogs of 222 East 111`
- `chat_id = 506` → `East Harlem Social Club`

Important difference from the earlier machine: chat ids are not identical across Macs, so do not assume the prior ids (`583`, `595`) are stable.

### Current thread status on this Mac

#### `Dogs of 222 East 111`

Read-only DB scan on this Mac found:
- about `1,608` image attachments referenced in the database
- initially only `5` image files present locally
- after the user manually clicked a few download links in Messages, local present count increased to `8`
- total locally present size after that small manual test: about `11.05 MB`

This is an important confirmation:
- the thread history is present
- many attachments are still cloud-backed / not hydrated locally
- manual interaction in Messages can cause real JPEG files to materialize in `~/Library/Messages/Attachments/`
- therefore this Mac is a viable machine for the project, but hydration/download is the bottleneck

Examples of real JPEG files that became present locally after manual download:
- `IMG_0166.jpeg`
- `IMG_6564.jpeg`
- `70430369031__A6875A89-7C3D-40C9-824E-EFF9236B667D.jpeg`

The user also reported that, when scrolling back in this thread, many old images appear as generic thumbnails with download links. That is consistent with attachment metadata existing locally while the payload files remain offloaded.

#### `East Harlem Social Club`

On this Mac, a chat row named `East Harlem Social Club` exists in `chat`, but a direct join check found:
- `message_count = 0`
- no recent messages
- no matching image attachments from the current query

So on this Mac it currently appears only as a stub/shell chat record, not a populated local thread.

### Current conclusion for the next Hermes agent

This larger-storage Mac is now the correct machine to continue with.

However, do not assume the old dog photos are already downloaded locally just because the history is visible in Messages. The current state is:
- message history / attachment metadata exist
- many actual attachment payloads are still not present in `~/Library/Messages/Attachments/`
- manual clicking of download links does work, but is not scalable for ~1,600 images

### Next recommended direction

Before attempting a full export, the next agent should focus on bulk hydration / download strategy for `Dogs of 222 East 111`.

Recommended sequence:
1. Confirm Messages settings on this Mac:
   - Keep Messages = `Forever`
   - Messages in iCloud enabled
   - use `Sync Now`
2. Leave Messages open on the target thread and observe whether passive hydration increases local file count.
3. Investigate UI automation for bulk-triggering downloads of placeholder attachments.
4. Re-scan local attachment presence after any download attempt.
5. Only once local presence reaches a useful level, perform export to Dropbox with JSON/CSV manifests.

### UI automation blocker discovered

A first attempt to automate Messages UI from Hermes via `osascript` hit the macOS Accessibility permission wall.

Observed result:
- basic app activation works
- full UI scripting failed with:
  - `osascript is not allowed assistive access`

The user has since enabled the required Accessibility permission for `iTerm2` on this Mac.

So the prerequisite is now satisfied, and another Hermes agent can retry UI inspection / automation to see whether repetitive download clicks can be semi-automated.

### Recommended continuation plan on this Mac

1. Verify/keep Messages settings for long-term retention on this Mac.
2. Re-open `Dogs of 222 East 111` in Messages.
3. Verify Hermes/UI automation can now inspect the Messages UI.
4. Try either:
   - passive sync/hydration, or
   - Hermes-driven UI automation for repeated download triggering
5. Re-run a read-only scan against:
   - `~/Library/Messages/chat.db`
   - `~/Library/Messages/Attachments/`
6. Once a meaningful number of real image files are present locally, export image attachments into Dropbox under a `DOGS` folder.
7. Write a manifest of copied files with:
   - thread name
   - chat id
   - attachment id
   - message id / guid
   - message date
   - source path
   - destination path
   - byte size
   - hash if practical
   - status (`copied`, `missing_source`, etc.)
8. Verify counts and exported size before any deletion.
9. Only after successful verification, consider thread deletion or cleanup.

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
