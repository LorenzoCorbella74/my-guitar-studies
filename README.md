# My Guitar Studies

A desktop application for organizing and visualizing guitar study sessions with interactive fretboard diagrams, music theory tools, and rich note-taking capabilities.

## Overview

**My Guitar Studies** is an Angular-based app designed to help guitarists document and analyze their practice sessions. It combines interactive SVG fretboard visualizations with flexible note-taking, enabling users to create comprehensive study materials that include scales, arpeggios, chord diagrams, comparison tables, and rich text annotations.

The app runs as a local-first desktop application (via [Electrobun](https://electrobun.dev)) backed by a local [Hono](https://hono.dev) API and a SQLite database — no account, no cloud backend required.

## Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | Angular 21 (Standalone Components) |
| **Desktop Shell** | Electrobun (Bun runtime + system webview) |
| **Backend API** | Hono, running in-process inside the desktop shell |
| **Database** | SQLite (`bun:sqlite`) |
| **Music Theory** | Tonal.js v6 |
| **Audio** | smplr (soundfonts) |
| **Rich Text Editor** | ngx-editor |
| **Icons** | Lucide Angular |
| **Modals** | Angular CDK Overlay |
| **Styling** | Tailwind CSS v4 + DaisyUI |
| **State Management** | Angular Signals |

## Project Layout

- `src/` — Angular application
- `backend/` — Hono API + SQLite schema, shared by dev and desktop builds
- `desktop/` — Electrobun desktop shell (wraps the Angular build + the backend)
- `scripts/migrate-firestore-to-sqlite.ts` — one-off migration script from the legacy Firebase backend

## Getting Started

### Prerequisites

- Node.js 18+ and npm 10+
- [Bun](https://bun.sh) (required to run the backend and the desktop shell)

### Installation

```bash
git clone <repository-url>
cd my-guitar-studies
npm install
```

### Run in the browser (Angular dev server only)

Useful for UI work; you still need the backend running separately (see below) for data to load.

```bash
npm start
```

The app will be available at `http://localhost:4200`.

### Run the backend API standalone

Starts the Hono + SQLite API on `http://localhost:5175`, storing data in `backend/data/app.db`.

```bash
npm run backend:dev
```

### Run the full desktop app locally

Builds the Angular app and launches the Electrobun desktop shell (Angular UI + backend running in-process, SQLite stored in the OS user-data directory).

```bash
npm run desktop:dev
```

### Build a distributable desktop app

Builds the Angular app and packages the Electrobun desktop installer for the **current OS**.

```bash
npm run desktop:build
```

The installer is created under `desktop/build/canary-<platform>/` (e.g. `my-guitar-studies-Setup-canary.exe` on Windows, a `.app`/`.dmg`-style bundle on macOS). Electrobun builds for the OS/architecture it runs on — to produce both **Windows** and **macOS** installers you need to run `npm run desktop:build` once on a Windows machine and once on a macOS machine.

### Available npm Scripts

- `npm start` — Angular dev server only (`http://localhost:4200`)
- `npm run build` — Angular production build (used by the desktop scripts below)
- `npm test` — Run unit tests
- `npm run backend:dev` — Run the Hono + SQLite backend standalone (`http://localhost:5175`)
- `npm run desktop:dev` — Build Angular + launch the Electrobun desktop shell in dev mode
- `npm run desktop:build` — Build Angular + package the desktop installer for the current OS
- `npm run migrate:firestore` — One-off migration of data from the legacy Firebase backend (see below)

## Migrating data from the legacy Firebase backend

If you have existing data in the old Firebase/Firestore backend, migrate it into the local SQLite database with `scripts/migrate-firestore-to-sqlite.ts`.

1. Download a service account key from the Firebase Console: **Project Settings > Service Accounts > Generate new private key**, and save it locally (e.g. `scripts/serviceAccountKey.json` — already excluded from git).
2. Find your Firestore `userId` (the UID of the account you used in the old web app).
3. Run the migration:

```powershell
# PowerShell
$env:FIREBASE_SERVICE_ACCOUNT="./scripts/serviceAccountKey.json"; $env:FIRESTORE_USER_ID="<your-uid>"; npm run migrate:firestore
```

```bash
# bash / macOS / Linux
FIREBASE_SERVICE_ACCOUNT=./scripts/serviceAccountKey.json FIRESTORE_USER_ID=<your-uid> npm run migrate:firestore
```

The script prints a count of migrated records per collection (sessions, session groups, study plans, tags, settings) for a quick sanity check. Document IDs are preserved so cross-references (session ↔ group, milestone ↔ session) stay intact.

## Architecture

Built with Angular 21's latest features:
- **Standalone Components** (default, no `standalone: true` needed)
- **Signal-based State Management** using `signal()`, `computed()`, and `effect()`
- **`input()` / `output()` Functions** instead of decorators
- **`inject()` Function** for dependency injection
- **OnPush Change Detection** for optimal performance
- **Native Control Flow** (`@if`, `@for`, `@switch`)

See [REFACTOR_DESKTOP.md](REFACTOR_DESKTOP.md) for the detailed migration plan from the original Firebase web app to this local desktop architecture.

## Resources

- [Electrobun Documentation](https://docs.electrobunny.ai/electrobun/)
- [Hono Documentation](https://hono.dev)
- [Lucide Icons](https://lucide.dev/icons/)
- [Lucide Angular Guide](https://lucide.dev/guide/angular/getting-started)
- [Tonal.js Documentation](https://github.com/tonaljs/tonal)

## License

Private project for personal use.