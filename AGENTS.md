# Repository Guidelines

## Project Structure & Module Organization
This repository is documentation-first. Keep repo-level files at the root, especially [README.md](/home/hitesh/hitesh-devops/README.md), [AGENTS.md](/home/hitesh/hitesh-devops/AGENTS.md), and `.gitignore`. Store infrastructure references in [docs/infra/infra.md](/home/hitesh/hitesh-devops/docs/infra/infra.md) and adjacent files under `docs/infra/`. Store dated design or planning notes under `docs/plans/` using `YYYY-MM-DD-topic-design.md`.

## Build, Test, and Development Commands
There is no project-local build system or automated test runner yet. Use lightweight validation commands before submitting changes:

- `rg --files` lists the current document set quickly.
- `find docs -maxdepth 2 -type f | sort` gives a quick view of organized documentation.
- `git status --short` confirms what changed.
- `git diff --stat` gives a compact review of edit scope.
- `markdownlint "*.md"` is recommended if you have Markdownlint installed locally.

## Coding Style & Naming Conventions
Write in Markdown with short sections, explicit headings, and direct operational language. Prefer `-` bullets, fenced code blocks for commands, and inline code for hosts, domains, ports, and filenames. Keep titles descriptive and keep filenames lowercase with hyphens, for example `external-monitors.md`. When a document is based on a point-in-time review, include an explicit date such as `Snapshot date: 2026-03-19`.

## Testing Guidelines
Testing is manual for now. Re-read rendered Markdown before opening a PR, verify that links resolve, and check that hostnames, node roles, and alerting details still match the latest known infrastructure. For research or pricing notes, include the review date and source links in the edited file.

## Commit & Pull Request Guidelines
The current history uses short, imperative commit subjects such as `first commit`. Continue with concise subjects like `add monitor contributor guide` or `update external monitor notes`. Pull requests should state the purpose, list the files changed, call out any updated dates or infrastructure facts, and include links to supporting source material when the change depends on external information.

## Security & Configuration Tips
Do not commit secrets, API keys, private SSH material, or Tailscale credentials. Document systems by stable hostnames like `vps1` and `vps3`, and avoid embedding sensitive access details that do not belong in a shared operational reference.
