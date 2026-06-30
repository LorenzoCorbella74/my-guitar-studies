# AGENTS.md

Guida operativa per coding agent che lavorano su My Guitar Studies.
Obiettivo: velocizzare refactor e nuove feature riducendo regressioni funzionali.

## Project Snapshot

- Framework: Angular 21 standalone + Signals
- Backend: Firebase Auth + Firestore (multi-tenant by user)
- Styling: Tailwind CSS v4 + DaisyUI
- Audio/music: Tonal.js, smplr, WebAudio
- Build/deploy: Vite + Netlify

## Local Commands

- npm start: avvia dev server
- npm run build: build produzione
- npm run test: unit test (vitest)

## Active Routes

- /sessions: lista sessioni
- /sessions/new: creazione sessione
- /sessions/:id: editor sessione
- /study-plans: lista piani studio
- /study-plans/new: creazione piano
- /study-plans/:id: editor piano
- /settings: impostazioni utente

Nota: l accesso è protetto da auth guard e la login page viene mostrata quando non autenticato.

## Feature Inventory

### Authentication

- Login email/password
- Signup email/password
- Reset password
- Logout
- Stato auth reattivo con signal

### Sessions Domain

- CRUD sessioni
- Toggle preferito sessione
- Tagging sessioni con suggerimenti e creazione tag on-the-fly
- Filtri: tags multi-select, preferiti
- Ordinamenti: data e titolo
- Modalità vista lista/card

### Session Groups

- CRUD gruppi sessioni
- Preferiti anche a livello gruppo
- Assegnazione sessioni a gruppi con drag and drop
- Rimozione sessioni dal gruppo
- Riordino sessioni nel gruppo

### Session Editor

- Titolo, tag, salvataggio sessione
- DnD per riordinare elementi sessione
- Eliminazione elemento con conferma
- Clonazione per alcuni elementi
- Supporto ai tipi elemento:
  - section
  - scale
  - arpeggio
  - chord
  - comparison
  - chordprogression
  - keyprogression
  - timeline
  - modalinterchange
  - fretboard
  - tab

### Music and Visualization Features

- Visualizzazione scale/arpeggi/accordi su tastiera
- Comparison table tra elementi armonici
- Chord progression editor
- Key progression explorer
- Modal interchange tool
- Free fretboard editor
- Tab editor
- Timeline visualization con layer armonici

### Study Plans Domain

- CRUD piani di studio
- Toggle preferito piano
- Filtri piani per tag e preferiti
- Ordinamenti per nome, data e progresso
- Milestone management:
  - fino a 10 milestone per piano
  - CRUD milestone
  - riordino milestone
- Sessioni dentro milestone:
  - selezione sessioni da catalogo
  - riordino sessioni
  - tracking completion percentuale
  - stato completed e completedAt
- Calcolo progresso piano e milestone

### User Settings Domain

- Tema light/dark
- Selezione stile tastiera (indice preset)
- Persistenza settings per utente
- Audio settings persistiti (strumento, volume, reverb, detune, sustain, metronome)

### Audio and Metronome

- AudioContext centralizzato
- Caricamento strumento via smplr
- Riproduzione accordi con inversioni
- Scheduling temporale per playback sincronizzato
- Reverb/volume aggiornabili runtime
- Metronomo con click accentato e volume regolabile

### Cross-Cutting UX

- Loading overlay globale
- Toast notifications
- Confirm dialog centralizzato
- Animazioni UI in src/app/animations.ts

## Code Ownership Map

- Routing: src/app/app.routes.ts
- Shell app + auth gate: src/app/app.ts
- Session list page: src/app/pages/sessions/sessions.ts
- Session editor page: src/app/pages/session-editor/session-editor.ts
- Study plan list page: src/app/pages/study-plans/study-plans.ts
- Study plan editor page: src/app/pages/study-plan-editor/study-plan-editor.ts
- Settings page: src/app/pages/settings/settings.ts
- Session data service: src/app/services/session.service.ts
- Study plan data service: src/app/services/study-plan.service.ts
- Auth service: src/app/services/auth.service.ts
- Tag service: src/app/services/tag.service.ts
- User settings service: src/app/services/user-settings.service.ts
- Audio service: src/app/services/audio.service.ts
- Metronome service: src/app/services/metronome.service.ts
- Domain models: src/app/models/

## Firestore Collections In Use

- users/{userId}/sessions/{sessionId}
- users/{userId}/sessionGroups/{groupId}
- users/{userId}/studyPlans/{planId}
- users/{userId}/tags/{tagId}
- users/{userId}/settings/{userId}

## Architectural Rules For Agents

- Usa Signals per stato locale e derivato.
- Mantieni OnPush nei componenti.
- Evita any; preferisci tipi dei modelli in src/app/models.
- Non introdurre RxJS subject se non strettamente necessario.
- Mantieni consistenza dei type literals per SessionItem.type.
- Quando cambi shape dati Firestore, gestisci retrocompatibilita in lettura.
- Usa ConfirmService per azioni distruttive.

## Refactor Playbook

Quando refattorizzi, segui sempre questo ordine:

1. Definisci impatto funzionale e dominio coinvolto.
2. Aggiorna prima i model types in src/app/models.
3. Aggiorna service layer (CRUD + mapping Firestore).
4. Aggiorna pagine/componenti che consumano quei dati.
5. Verifica routing e navigazione tra pagine.
6. Esegui npm run test.
7. Esegui npm run build.
8. Verifica manualmente i flussi critici.

## Critical Flows To Re-Test After Refactor

- Login, logout, refresh pagina autenticata
- Lista sessioni con filtri e ordinamenti
- Creazione sessione, aggiunta elementi, save, reload editor
- DnD elementi sessione e persistenza ordine
- Operazioni gruppi: create/edit/delete e drag sessioni nel gruppo
- Lista piani e ordinamenti per progresso
- Editor piano: milestone + sessioni + completion
- Settings: cambio tema e stile tastiera con persistenza
- Playback audio e metronomo

## Known Risks During Refactor

- Regressioni su mapping Date/Timestamp Firestore
- Inconsistenza tra ordine visuale e campo order salvato
- Divergenza tra schema item lato model e rendering componenti
- Modifiche settings che sovrascrivono campi audio esistenti
- Breaking changes su route /sessions/:id e /study-plans/:id

## Deployment Note

Per SPA routing su Netlify deve esistere fallback su index.html in netlify.toml.