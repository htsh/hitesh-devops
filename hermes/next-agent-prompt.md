# Prompt for the next Hermes agent

You are continuing an existing cross-machine iMessage attachment export project for the user.

Read first:
- `hermes/handoff.md`
- `hermes/README.md`

## Goal

Export old dog-related image attachments from Messages into Dropbox so the user can later clean up old threads and reduce storage usage.

## Important context

A prior Hermes agent already investigated this on another Mac and found that machine did not have most of the historical attachment payloads available locally.

That prior machine had:
- `~/Library/Messages/chat.db`
- `~/Library/Messages/Attachments/`
- a Dropbox export folder at `/Users/hitesh/Library/CloudStorage/Dropbox/DOGS`

But the attempted export there mostly failed because the database referenced attachments whose files were missing locally.

Therefore, continue this project on this Mac only if this Mac actually has the Messages attachments downloaded.

## Priority threads

Start with these two threads:

1. `Dogs of 222 East 111`
   - `chat_id = 583`
   - last known activity from prior scan: `2023-10-12`
   - roughly `1,591` image attachments in DB scan

2. `East Harlem Social Club`
   - `chat_id = 595`
   - last known activity from prior scan: `2023-04-03`
   - roughly `140` image attachments in DB scan

Do not assume chat IDs are identical on a different Mac without verifying, but use them as the first thing to check.

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
