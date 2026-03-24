# Prompt for the next Hermes agent

You are continuing an existing cross-machine iMessage attachment export project for the user.

Read first:
- `hermes/handoff.md`
- `hermes/README.md`

## Goal

Export old dog-related image attachments from Messages into Dropbox so the user can later clean up old threads and reduce storage usage.

## Important context

A prior Hermes agent already investigated the project on a different Mac and found that machine did not have most of the historical attachment payloads available locally.

A later follow-up session then confirmed the user is now on the larger-storage Mac they want to use as the long-term local Messages archive machine.

Current known state on this larger-storage Mac:
- `~/Library/Messages` was about `2.7 GB`
- `~/Library/Messages/Attachments` was about `1.6 GB`
- `~/Library/Messages/chat.db` was about `395 MB`
- `Dogs of 222 East 111` exists on this Mac as `chat_id = 658`
- `East Harlem Social Club` appears as `chat_id = 506`, but only as a stub chat record with `0` locally joined messages in the follow-up check

Important: do not assume this Mac already has the old dog photos downloaded locally. The follow-up read-only scan found that `Dogs of 222 East 111` had about `1,608` image attachments referenced in the DB, but only a handful were physically present in `~/Library/Messages/Attachments/`.

After the user manually clicked a few download links in Messages, local presence increased from `5` to `8`, including some real JPEGs. So this Mac is viable, but hydration/download is still the bottleneck.

The user has also since granted `iTerm2` macOS Accessibility permission, so UI automation attempts against Messages are now unblocked in principle.

## Priority threads

Start with these two threads, but verify ids first on the current Mac:

1. `Dogs of 222 East 111`
   - current known chat id on the larger-storage Mac: `658`
   - roughly `1,608` image attachments in DB scan on that Mac
   - this is the primary active target

2. `East Harlem Social Club`
   - current known chat id on the larger-storage Mac: `506`
   - currently appears as a stub chat record with no local message rows from the follow-up check
   - treat as secondary until a fuller local history is confirmed

Do not assume chat IDs are identical across Macs without verifying.

## Required approach

1. Do a read-only scan first.
2. Confirm local availability of attachment files before promising export success.
3. Export images into Dropbox under a `DOGS` folder.
4. Create a manifest of exported files.
5. Verify counts and sizes.
6. Do not delete any messages or threads unless the user explicitly asks again after verification.

## Suggested technical workflow

Check:
- `~/Library/Messages/chat.db`
- `~/Library/Messages/Attachments/`
- `/Users/hitesh/Library/CloudStorage/Dropbox`

Useful tables / joins:
- `chat`
- `chat_message_join`
- `message`
- `message_attachment_join`
- `attachment`
- `chat_handle_join`
- `handle`

Useful image filters:
- `attachment.mime_type LIKE 'image/%'`
- `attachment.uti LIKE 'public.image%'`
- filename / transfer-name suffix checks for `jpg`, `jpeg`, `png`, `heic`, `gif`, `webp`, `tiff`

Export conventions suggested by the prior agent:
- one folder per target thread under `Dropbox/DOGS/`
- destination filenames prefixed with message date and attachment id
- write both JSON and CSV manifests with:
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

## Important caution

Deleting a thread may sync across Apple devices if Messages in iCloud is enabled.
Deleting a thread also may not immediately reclaim the exact amount of local disk space expected.

Safe sequence:
1. export
2. verify
3. only then discuss deletion

## Deliverable expected from you

Produce:
- a concise report of available dog-photo threads and their estimated export sizes
- the Dropbox export location
- manifest files
- a recommendation on whether the user can safely proceed to deletion review
