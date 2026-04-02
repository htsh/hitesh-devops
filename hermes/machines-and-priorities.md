# Machines and current priorities

Updated: 2026-03-24

This note records the current machine fleet, how Hermes is being used across it, and the user's stated project priorities.

## Primary working assumptions

- The 15-inch MacBook Air M3 is the primary Hermes machine.
- Cross-machine shared memory is not a current priority.
- Repo-local `hermes/` notes are preferred when useful so other Hermes agents on other machines can continue work.
- Obsidian is stored in Dropbox. Dropbox is the paid service; Obsidian itself is not paid.

## Machines

### 1) Primary Mac
- Device: MacBook Air 15" M3
- RAM: 16GB
- Storage: 256GB SSD
- Role:
  - primary Hermes machine
  - email, notes, planning, coordination
  - day-to-day admin and coding support
- Constraints:
  - relatively tight local storage compared with the rest of the fleet

### 2) Secondary Mac
- Device: MacBook Air M1
- RAM: 16GB
- Storage: 1TB
- Role:
  - also runs Hermes
  - mainly used to help with coding
  - useful Apple-side overflow machine with more local storage

### 3) babyblue
- OS: Linux, but also boots into Windows
- Access: SSH alias `babyblue`
- CPU: AMD 5800X3D
- RAM: 32GB
- GPU: RTX 3090 Ti (24GB VRAM)
- Role:
  - secondary Hermes machine
  - primary local LLM inference box (large models)
  - sometimes used for gaming via the Windows boot
  - useful when the user wants to mimic a colleague's non-macOS setup, e.g. Daniel's data-pipeline environment
  - currently running a good Qwen 3.5 27B model
- Hermes/Gmail status:
  - Hermes Gmail access is working there
  - helper wrappers exist: `gsetup`, `gapi`

### 4) debian (Razer Blade 2022)
- OS: Debian
- Description: converted Razer Blade 2022 gaming laptop used as a server
- CPU: Intel Core i7 (12th gen)
- GPU: RTX 3080 Ti Mobile (16GB VRAM)
- Storage: 8TB mirrored RAID array
- Role:
  - server / storage / heavier data home
  - secondary LLM inference box (medium-sized models)
  - good fit for durable archives, large datasets, backups, or services needing local storage

### 5) ThinkPad X1 Nano Gen 1
- OS: Fedora
- Role:
  - webdev
  - writing

## Storage / sync context

- Obsidian vault path on primary Mac:
  - `/Users/hitesh/Library/CloudStorage/Dropbox/obsidian/2025`
- Dropbox is an important cross-machine sync layer in practice.
- For project continuity, repo-local `hermes/` notes remain preferred when relevant.

## Current project priorities

Highest priority projects:
1. `consolidated-york`
2. `LMATV` (stagecouch)
3. `graph-proximity-engine`

Also active / important:
- `redwood`
  - helping a friend deploy the app
- `gmail-cleaner`
  - ongoing maintenance/workflow project

## Practical mental model for future agents

- Use the primary M3 Mac as the default place for interactive Hermes work unless there is a reason not to.
- Consider babyblue (5800X3D + 3090 Ti 24GB) for large local LLM inference, privacy-sensitive, or GPU-heavy workflows.
- Consider debian/Razer Blade (i7 + 3080 Ti Mobile 16GB) for medium-sized LLM inference, large storage, or server-style persistence.
- Consider the M1 Air when Apple/macOS access is useful but more local storage is needed than the primary M3 Mac has.
- Consider the ThinkPad as a focused Linux webdev/writing machine rather than the main coordination node.
