# AGENTS.md

## Commands
- `npm start` - Dev server (alias: `ng serve`)
- `npm run build` - Production build
- `npm run test` - Unit tests via vitest

## Architecture

### Tech Stack
- **Angular 21** with standalone components (default in v20+, do NOT set `standalone: true`)
- **Firebase** (Auth + Firestore): `users/{userId}/sessions/{sessionId}`, `users/{userId}/tags`, `users/{userId}/settings`
- **Tailwind CSS v4** + DaisyUI (configured in `.postcssrc.json`)
- **Lucide Angular** for icons

### Key Patterns
- Use **signals** for state management (not RxJS subjects)
- Use **`input()`/`output()` functions** instead of decorators
- Use **`inject()`** instead of constructor injection
- Place host bindings in `host` object, NOT `@HostBinding`/`@HostListener` decorators
- Use native control flow (`@if`, `@for`, `@switch`) NOT `*ngIf`, `*ngFor`
- `changeDetection: ChangeDetectionStrategy.OnPush` on components

### Project Structure
- `src/app/` - Angular app (components, services, routes)
- `public/` - Static assets
- Desktop-first, responsive up to 1024px landscape

## Firestore Data Model
```
users/{userId}/
  sessions/{sessionId}/
    title, tags, isFavorite, items[], createdAt, updatedAt
  tags/{tagId}/
    name, color, createdAt
  settings/{userId}/
    defaultWoodTheme, defaultMode, defaultTuning, metronomeBpm, playbackVolume
```