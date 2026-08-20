# Plan: Da Web App Firebase a Desktop App (SQLite + Hono)

## Contesto raccolto
- Firebase usato in 5 punti: `auth.service.ts` (Firebase Auth), `session.service.ts`, `study-plan.service.ts`, `tag.service.ts`, `user-settings.service.ts` (tutti Firestore, path `users/{userId}/...`).
- Nessun test unitario esistente sui service (nessun `.spec.ts` trovato) -> basso rischio di rotture di test, ma nessuna rete di sicurezza automatica: serve test manuale sui flussi critici.
- Routing gated da `authGuard` in `app.routes.ts`; `app.ts` mostra `LoginPage` se non autenticato.
- Config Firebase generata da `scripts/generate-firebase-config.ts` -> `src/firebase.ts`, letta da env `VITE_FIREBASE_*`.

## Decisioni utente
- Priorità: **stesso runtime ovunque** (non dimensione binario, non maturità a tutti i costi).
- OS target: **Windows + macOS**.
- Auth: **rimossa del tutto**, app single-user locale (no login/signup/reset).
- Migrazione dati: **serve export/import da Firestore verso SQLite** (dati reali esistenti).
- Distribuzione: **manuale**, no auto-update necessario per ora.

## Raccomandazione framework
Dato "stesso runtime ovunque", classifica:
1. **Electrobun (Bun)** — shell + backend Hono + `bun:sqlite` tutto su Bun, webview di sistema (binari piccoli). Rischio: progetto giovane, packaging win+mac e menu nativi meno collaudati.
2. **Electron (Node)** — shell + backend Hono (`@hono/node-server`) + `node:sqlite`/`better-sqlite3` tutto su Node. Stesso runtime ovunque (Node), ma Chromium bundled (binari più pesanti). Ecosistema maturissimo, `electron-builder` collaudato su win+mac.
3. **Deno "puro"** — scartato: Deno non ha un toolkit desktop nativo maturo; richiederebbe comunque un secondo runtime/shell (es. Tauri/Rust), il che contraddice l'obiettivo "un solo runtime".

**Proposta**: spike di validazione veloce su Electrobun (Fase 0) con criteri di uscita chiari; se fallisce, fallback su Electron+Node senza ripensare l'architettura backend (Hono + SQLite restano identici, cambia solo lo shell/runtime del processo main).

## Steps

### Fase 0 — Spike di fattibilità (Electrobun)
1. Creare un mini progetto Electrobun con Bun: finestra che carica una pagina statica, backend Hono in-process su porta locale, `bun:sqlite` con una tabella di prova.
2. Validare: build/packaging per Windows e macOS, menu nativi base, dev reload, dimensione binario finale.
3. Decisione go/no-go: se packaging cross-OS o feature critiche mancano -> passare a Electron+Node (stessa architettura Hono/SQLite, cambia solo il "guscio").

### Fase 1 — Backend Hono + SQLite (*dipende da esito Fase 0*)
4. Nuova cartella `backend/` (o `desktop/backend/`) con Hono, avviato dal processo main dello shell scelto.
5. Schema SQLite senza prefisso `userId` (single-user): tabelle `sessions`, `session_groups`, `study_plans`, `tags`, `settings` (riga singola). Decidere raw SQL migrations vs `drizzle-orm` (vedi Further Considerations).
6. Endpoint REST che replicano le operazioni CRUD attuali di `session.service.ts`, `study-plan.service.ts`, `tag.service.ts`, `user-settings.service.ts` (list/get/create/update/delete + operazioni custom come riordino gruppi/milestone).

### Fase 2 — Refactor service layer Angular (*dipende da Fase 1*, parallelizzabile tra i 4 service)
7. `session.service.ts`, `study-plan.service.ts`, `tag.service.ts`: sostituire chiamate Firestore con `HttpClient` verso `http://localhost:<port>`; sostituire `serverTimestamp()`/`Timestamp.toDate()` con date ISO gestite da SQLite/Hono.
8. `user-settings.service.ts`: stesso trattamento, endpoint singolo per get/set settings.
9. Rimuovere ogni riferimento a `userId` nei path (single-user locale).

### Fase 3 — Rimozione auth (*parallelo a Fase 2*)
10. Eliminare `auth.service.ts` (Firebase Auth), `auth.guard.ts`, route/pagina Login, riferimenti in `app.routes.ts` e `app.ts` (rimuovere gating `isAuthenticated()`/`app-login`).
11. Aggiornare `AppRoutes` enum rimuovendo le voci di login.

### Fase 4 — Shell desktop (*dipende da Fase 0 + Fase 1*)
12. Cartella `desktop/` con bootstrap del processo main: avvio Hono su porta fissa locale, creazione finestra che carica il build Angular (`dist/`) in produzione o proxy a `ng serve` in dev.
13. Script di packaging manuale per Windows e macOS (electrobun build o `electron-builder`, in base a esito Fase 0).
14. Percorso file SQLite in directory dati utente OS-specifica (`app.getPath('userData')` o equivalente Electrobun).

### Fase 5 — Migrazione dati Firestore -> SQLite (*dipende da Fase 1*, indipendente da Fase 2-4)
15. Script one-off (Node/Bun) che usa le credenziali Firebase esistenti per esportare le collection (`sessions`, `sessionGroups`, `studyPlans`, `tags`, `settings`) di un singolo `userId` in JSON.
16. Script di import in SQLite tramite lo stesso schema di Fase 1, con conversione `Timestamp` -> data e rimozione prefisso `userId`.
17. Verifica conteggio record e spot-check contenuti tra Firestore ed SQLite.

### Fase 6 — Cleanup e documentazione
18. Rimuovere `firebase` da `package.json`, `src/firebase.ts`, `scripts/generate-firebase-config.ts`, `firestore.rules`, `firebase.json`, env `VITE_FIREBASE_*`, script `prestart`/`prebuild`.
19. Aggiornare `AGENTS.md` (architettura, comandi locali, collections Firestore -> tabelle SQLite, rimuovere feature auth dall'inventario).
20. Decidere destino di `netlify.toml`/`NETLIFY.md` (vedi Further Considerations: mantenere anche versione web?).

## File rilevanti
- `src/app/services/session.service.ts`, `study-plan.service.ts`, `tag.service.ts`, `user-settings.service.ts` — refactor da Firestore SDK a HTTP client verso backend Hono.
- `src/app/services/auth.service.ts`, `src/app/guards/auth.guard.ts` — da rimuovere.
- `src/app/app.routes.ts`, `src/app/app.ts`, `src/app/enums/routes.enum.ts` — rimozione gating auth e route login.
- `src/firebase.ts`, `scripts/generate-firebase-config.ts`, `firestore.rules`, `firebase.json`, `package.json` — rimozione dipendenze Firebase.
- Nuovo: `backend/` (Hono + SQLite schema/queries), `desktop/` (shell Electrobun/Electron), script migrazione dati.

## Verifica
1. `npm run build` e `npm run test` dopo Fase 2-3.
2. Test manuale flussi critici da `AGENTS.md` (sessioni, gruppi, piani di studio, milestone, DnD, settings, audio/metronomo) — esclusi flussi di login/logout.
3. Build/packaging shell desktop su Windows e macOS reale (o VM), avvio app, verifica file SQLite creato in directory dati utente corretta.
4. Dry-run script di migrazione contro un export reale di Firestore, confronto conteggio documenti per collection.

## Further Considerations
1. **ORM/migrations SQLite**: raw SQL migrations (più semplice, coerente con lo stack minimale) vs `drizzle-orm` (type-safety, più vicino allo stile TypeScript del progetto). Raccomando raw SQL per partire, dato che lo schema è piccolo (5 tabelle) — passare a drizzle solo se lo schema cresce.
2. **Fallback Electron**: se lo spike Electrobun (Fase 0) fallisce su packaging/menu nativi, passare a Electron+Node senza toccare l'architettura Hono/SQLite (solo lo shell cambia). Raccomando di fissare questo come go/no-go esplicito prima di investire nella Fase 4 completa.
3. **Versione web**: la migrazione elimina Firebase, quindi la web app su Netlify smetterebbe di funzionare (nessun backend Hono raggiungibile da browser pubblico). Confermare se si vuole ritirare completamente la versione web o mantenerla in parallelo con un backend hostato (fuori scope se non richiesto esplicitamente).

## Esito Fase 0 (spike Electrobun, validato su Windows)
- Template ufficiale `angular` (via `bunx electrobun init`) genera un progetto Bun + Vite + Angular 19 (build via `@analogjs/vite-plugin-angular`, non Angular CLI) in `spikes/electrobun-poc/`.
- Integrato `Hono` + `bun:sqlite` **in-process** nel main process Bun (`src/bun/index.ts`): server su porta locale dedicata, CRUD funzionante (`GET`/`POST /api/notes`) verificato con richieste HTTP reali mentre l'app era in esecuzione.
- `bun run start` (`vite build && electrobun dev`) lancia la finestra con **WebView2 nativo** su Windows (nessun Chromium bundlato); log confermano `Angular app started!` e caricamento corretto della view.
- `bunx electrobun build --env=canary` produce un installer Windows **self-extracting funzionante** (~32 MB totali, setup .exe + archivio .tar.zst compresso con zstd) senza configurazione aggiuntiva.
- Attrito riscontrato (non bloccante): `bun install` blocca di default gli script postinstall di pacchetti nativi (`esbuild`, ecc.) — richiede `bun pm trust --all` una tantum; da tenere a mente nel workflow CI/dev.
- Non testato in questa sessione: build/packaging su macOS (nessuna macchina disponibile) — da validare separatamente prima di considerare la Fase 4 completa per quel target.

**Decisione go/no-go**: GO su Electrobun. Il criterio "stesso runtime ovunque" è pienamente soddisfatto (Bun per shell, backend Hono e DB) e il packaging Windows è già superiore alle aspettative (dimensioni minime, nessuna dipendenza da Chromium). Si procede con Electrobun come shell scelta; il fallback Electron resta documentato ma non necessario allo stato attuale.

Progetto spike rimosso dal repository dopo aver validato la Fase 0 (aveva esaurito il suo scopo una volta creata la shell reale in `desktop/`).

## Esito Fase 1 (backend Hono + SQLite, implementato e validato)
- Cartella `backend/` alla radice del progetto (eseguita da Bun, condivide `package.json` root; nessun workspace separato).
- `backend/db.ts`: apre `bun:sqlite` (WAL mode), crea schema con `CREATE TABLE IF NOT EXISTS` per `sessions`, `session_groups`, `study_plans`, `tags`, `settings` (nessun prefisso `userId`, single-user locale). Percorso DB configurabile via `DB_PATH` env (default `backend/data/app.db`), pronto per essere ripuntato alla user-data dir dalla shell desktop in Fase 4.
- Campi array/oggetto complessi (`tags`, `items` delle sessioni, `milestones` dei piani) salvati come colonne TEXT con JSON serializzato — stessa strategia "blob" già usata implicitamente da Firestore, evita uno schema relazionale sovradimensionato per strutture fortemente polimorfe (i vari `SessionItem` type).
- `backend/lib/row-mappers.ts`: conversioni riga SQLite -> JSON (bool 0/1 -> true/false, parse JSON array, valori opzionali `undefined` invece di `null`).
- Endpoint REST Hono creati 1:1 con i metodi dei service Angular attuali:
  - `backend/routes/sessions.ts`: GET list, GET by id, POST, PATCH, DELETE.
  - `backend/routes/session-groups.ts`: GET list, POST, PATCH, DELETE (cascata: rimuove `groupId` dalle sessioni del gruppo in una transazione), `POST /reorder-sessions` (bulk update `groupOrder`, sostituisce i `writeBatch` Firestore).
  - `backend/routes/study-plans.ts`: GET list, GET by id, POST, PATCH (milestones aggiornate come blob unico, stessa logica del service attuale), DELETE.
  - `backend/routes/tags.ts`: GET list, POST (con vincolo UNIQUE su `name`, verificato).
  - `backend/routes/settings.ts`: GET (crea default se assente), PUT (upsert/merge parziale).
- `backend/app.ts` monta tutte le route sotto `/api/*`; `backend/index.ts` è l'entry point standalone per dev/test (`npm run backend:dev` -> `bun run --watch backend/index.ts`, porta 5175). La shell desktop (Fase 4) importerà `app` direttamente invece di usare `Bun.serve` separato.
- Validato con richieste HTTP reali: creazione/lettura/aggiornamento sessione, creazione tag con vincolo di unicità, creazione piano di studio, lettura impostazioni con creazione automatica dei default.
- Dipendenza `hono` e `@types/bun` aggiunte al `package.json` root (via npm, nessun conflitto di lockfile).
- `backend/data/` (file SQLite locale) escluso da git.

## Esito Fase 2-3 (refactor service Angular + rimozione auth, implementato e validato)
- `session.service.ts`, `study-plan.service.ts`, `tag.service.ts`, `user-settings.service.ts` riscritti da zero: nessuna dipendenza Firestore/Firebase residua, tutte le chiamate passano da `HttpClient` verso `http://localhost:5175/api/*` (costante centralizzata in `src/app/services/api-config.ts`).
- Le date arrivano dal backend come stringhe ISO e vengono convertite in `Date` lato client (stessa interfaccia pubblica dei service verso i componenti, nessuna modifica richiesta ai consumer).
- `reorderGroupSessions` e la cancellazione di un gruppo usano i nuovi endpoint dedicati (`POST /session-groups/reorder-sessions`, cascata lato server) al posto dei `writeBatch` Firestore.
- `user-settings.service.ts` carica le impostazioni nel costruttore (nessun gating su stato auth, single-user locale) invece che tramite `effect()` su `AuthService.currentUser()`.
- Rimossi completamente: `auth.service.ts`, `guards/auth.guard.ts`, `pages/login/`, gating `canActivate`/`@if isAuthenticated()` in `app.routes.ts` e `app.ts`. `page-header.component.ts` non mostra più email utente/voce "Esci".
- Cleanup Firebase anticipato dalla Fase 6 (necessario per build pulita): rimossi pacchetto `firebase`, `src/firebase.ts`, `scripts/generate-firebase-config.ts`, `firestore.rules`, `firebase.json`, script `prestart`/`prebuild`, dipendenze `dotenv`/`tsx` (non più usate da nessun altro script), tipi `VITE_FIREBASE_*` da `vite-env.d.ts`.
- Validato: `npm run build` completa senza errori TypeScript (solo warning preesistenti su bundle budget e CommonJS di `vextab`, non legati al refactor). `npm run test` conferma l'assenza di suite di test nel progetto (comportamento preesistente, non una regressione).
- Non ancora eseguito in questa sessione: smoke test manuale dell'app in esecuzione nel browser con backend avviato in parallelo (richiede `npm run backend:dev` + `npm start` contemporaneamente) — consigliato prima di considerare chiusa la migrazione.

## Esito Fase 4 (shell desktop Electrobun, implementata e validata su Windows)
- Nuova cartella `desktop/` (progetto Electrobun separato dallo spike iniziale, rimosso dal repository una volta completata la validazione).
- `desktop/electrobun.config.ts`: copia l'output di build Angular reale (`../dist/my-guitar-studies/browser`, prodotto da `npm run build` alla radice) dentro `views/mainview`. Nessuna dipendenza da Vite: l'output Angular CLI è già una SPA statica flat, copiata così com'è.
- `desktop/src/bun/paths.ts`: calcola la directory dati utente OS-specifica (`%APPDATA%\MyGuitarStudies` su Windows, `~/Library/Application Support/MyGuitarStudies` su macOS, `~/.local/share/MyGuitarStudies` su Linux).
- `desktop/src/bun/index.ts`: imposta `process.env.DB_PATH` sulla directory utente **prima** di importare dinamicamente `backend/app.ts` (necessario perché `backend/db.ts` apre il file SQLite al caricamento del modulo), avvia il backend Hono in-process su `http://localhost:5175` via `Bun.serve`, poi crea la `BrowserWindow` che carica la view compilata (fallback al dev server Angular su `localhost:4200` se il canale è `dev` e il server risulta raggiungibile).
- Validato end-to-end con `bunx electrobun dev` dalla cartella `desktop/`: finestra WebView2 avviata con l'app Angular reale (index.html, main.js, polyfills, styles, immagini caricati correttamente dai log), backend raggiungibile su `http://localhost:5175/api/*` con risposte corrette (`GET /api/sessions`, `GET /api/settings` con creazione default), file SQLite creato correttamente in `%APPDATA%\MyGuitarStudies\app.db`.
- Validata la build di produzione (`bunx electrobun build --env=canary`): installer Windows funzionante da **~34 MB totali** (`my-guitar-studies-Setup-canary.exe` + archivio `.tar.zst`).
- Aggiunti script di comodo alla radice: `npm run desktop:dev` (build Angular + avvio shell in dev) e `npm run desktop:build` (build Angular + packaging installer).
- Non ancora validato in questa sessione: build/packaging su macOS (nessuna macchina disponibile) — resta il rischio noto già documentato in Fase 0.

## Esito Fase 5 (script di migrazione Firestore -> SQLite, implementato e smoke-testato)
- `scripts/migrate-firestore-to-sqlite.ts`: script one-off Bun che usa `firebase-admin` (service account) per esportare le collection `sessions`, `sessionGroups`, `studyPlans`, `tags` e il documento `settings/{userId}` di un singolo `userId` Firestore, e le importa nel DB SQLite tramite lo stesso schema di `backend/db.ts`.
- Gli ID dei documenti Firestore vengono **preservati** (`INSERT OR REPLACE` con `doc.id` come chiave primaria) per non rompere i riferimenti incrociati (`sessions.groupId` -> `session_groups.id`, `milestones[].sessions[].sessionId` -> `sessions.id`).
- Timestamp Firestore convertiti in stringhe ISO tramite `toIso()`.
- Guard clause: lo script si interrompe con un messaggio chiaro se mancano `FIREBASE_SERVICE_ACCOUNT` (percorso al service account JSON) o `FIRESTORE_USER_ID`.
- Aggiunto `firebase-admin` come devDependency (usato solo da questo script, nessun impatto sul bundle dell'app). Il file del service account è escluso da git (`scripts/serviceAccountKey.json` e pattern `*serviceAccountKey*.json` in `.gitignore`).
- Comando: `FIREBASE_SERVICE_ACCOUNT=./scripts/serviceAccountKey.json FIRESTORE_USER_ID=<uid> npm run migrate:firestore` (o direttamente `bun run scripts/migrate-firestore-to-sqlite.ts` con le stesse env var).
- Validato: la guard clause blocca correttamente l'esecuzione senza credenziali. **Non ancora eseguito con credenziali reali** in questa sessione (richiede il service account JSON scaricato dalla Firebase Console e lo user ID Firestore da parte dell'utente) — da eseguire manualmente prima di considerare la migrazione dati conclusa, seguendo poi il conteggio stampato a fine script per uno spot-check contro Firestore.

## Backup/sincronizzazione manuale tra istanze (post-migrazione, richiesto dall'utente)
- Nuovo endpoint backend `backend/routes/backup.ts`, montato su `/api/backup`:
  - `GET /api/backup/export`: esporta l'intero DB (sessions, sessionGroups, studyPlans, tags, settings) come JSON.
  - `POST /api/backup/import`: sostituisce **tutti** i dati esistenti con quelli del JSON fornito, in una singola transazione SQLite; preserva gli ID per non rompere i riferimenti incrociati.
- Nuovo `src/app/services/backup.service.ts` (HttpClient verso i due endpoint sopra).
- Pagina Impostazioni (`src/app/pages/settings/`): nuova card "Backup e sincronizzazione" con due azioni:
  - **Esporta dati**: scarica un file `my-guitar-studies-backup-<timestamp>.json` (validato: download reale funzionante su Windows via WebView2).
  - **Importa dati**: file picker + `ConfirmService` (azione distruttiva, sostituisce tutto) prima di inviare il file al backend; dopo l'import la pagina viene ricaricata (`window.location.reload()`) per evitare stato stale nei signal degli altri service.
- Uso previsto: esportare su un'istanza (es. Windows), copiare manualmente il file `.json` sull'altra macchina (es. macOS, via USB/cloud drive/email), importarlo da Impostazioni. Non è una sincronizzazione automatica/continua, ma un trasferimento manuale one-shot bidirezionale.
- **Nota operativa SQLite/WAL**: se in futuro serve copiare il file `.db` a mano (come fatto per instradare i dati migrati verso la user-data dir dell'app desktop), copiare **sempre insieme** `app.db`, `app.db-wal` e `app.db-shm` — in modalità WAL i dati più recenti possono risiedere quasi interamente nel file `-wal` non ancora "checkpointato" nel file principale. La funzione di export/import JSON qui sopra evita questo problema perché legge sempre lo stato corrente tramite query SQL (non il file grezzo).

## Stato implementazione
- [x] Fase 0 — Spike Electrobun (GO — vedi esito sopra)
- [x] Fase 1 — Backend Hono + SQLite (vedi esito sopra)
- [x] Fase 2 — Refactor service layer Angular (vedi esito sopra)
- [x] Fase 3 — Rimozione auth (vedi esito sopra)
- [x] Fase 4 — Shell desktop (vedi esito sopra; macOS non testato)
- [x] Fase 5 — Migrazione dati (eseguita con successo dall'utente: 63 sessioni, 10 gruppi, 1 piano, 25 tag)
- [x] Fase 6 — Cleanup Firebase (anticipato, vedi esito Fase 2-3; resta da decidere il destino di `netlify.toml`/`NETLIFY.md`, vedi Further Considerations)
- [x] Extra — Backup/sincronizzazione manuale export/import JSON (vedi sopra)
