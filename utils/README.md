# Utils

Standalone utilities for MongoDB operations.

## mongo-scripts

Python CLI tool for backing up MongoDB databases. Provides an interactive ncurses checkbox UI for selecting which databases to dump, or a non-interactive mode for cron jobs. Uses `mongodump` under the hood and outputs timestamped backup directories with optional zip archiving.

- Runtime: Python 3.8+, managed with `uv`
- Run: `uv run mongo-backup.py --url mongodb://host:27017`

## mongo-utils

Node.js tool for one-way syncing databases between two MongoDB instances. Uses additive upserts (source wins, orphaned target documents are reported but left in place). Provides an interactive prompt for selecting databases to sync.

- Runtime: Node.js, dependencies via `npm install`
- Run: `npm run sync` (reads `SOURCE_URI` and `TARGET_URI` from `.env`)
