# Guitar Study Sessions - Requisiti e Piano Realizzativo

## Panoramica

Web app Angular + Firebase per la gestione delle sessioni di studio della chitarra. Permette di creare sessioni contenenti visualizzazioni interattive di scale, arpeggi e accordi su tastiere SVG, con supporto per tabelle di confronto di note e descrizioni testuali inserite tramite editor WYSIWYG.

---

## Stack Tecnologico

| Categoria | Scelta |
|-----------|--------|
| Framework | Angular (standalone components) |
| Backend | Firebase (Auth + Firestore) |
| Music theory | Tonal.js v5 |
| Audio playback | smplr (soundfonts) |
| Editor WYSIWYG | ngx-editor |
| Icone | Lucide Angular |
| Modali | Angular CDK Overlay |
| PDF export | jsPDF + html2canvas |
| Stili | Tailwind CSS V4 |
| Deployment | Netlify |

---

## Utenti e Autenticazione

- **Autenticazione**: Firebase Authentication
- **Provider**: Email/Password (eventualmente Google in futuro)
- **Struttura**: Multi-utente (ogni utente vede solo le proprie sessioni)
- **Protezione**: Auth guard su tutte le route `/sessions/*`

---

## Struttura Dati (Firestore)

### Collezioni

```
users/
  {userId}/
    sessions/
      {sessionId}/
        title: string
        tags: string[]
        isFavorite: boolean
        items: SessionItem[]
        createdAt: timestamp
        updatedAt: timestamp
    tags/
      {tagId}/
        name: string
        color: string (opzionale)
        createdAt: timestamp
    settings/
      {userId}/
        defaultWoodTheme: string
        defaultMode: string
        defaultTuning: string
        metronomeBpm: number
        playbackVolume: number
        createdAt: timestamp
        updatedAt: timestamp
```

### Sessione

```typescript
interface Session {
  id: string
  title: string
  tags: string[]
  isFavorite: boolean
  items: SessionItem[]         // Array ordinato di elementi (sezioni + visualizzazioni)
  createdAt: Date
  updatedAt: Date
}
```

### Elemento Sessione (unificato)

Tutti gli elementi condividono una struttura base con `id` e `order`:

```typescript
interface SessionItem {
  id: string
  type: 'section' | 'scale' | 'arpeggio' | 'chord' | 'comparison'
  order: number                // Ordine di visualizzazione nella pagina
}

interface SectionItem extends SessionItem {
  type: 'section'
  title: string                 // Titolo della sezione (es. "Esercizio 1", "Osservazioni")
  content: string               // HTML da ngx-editor
}

interface ScaleItem extends SessionItem {
  type: 'scale'
  config: VisualizationConfig
  noteVisibility: { [note: string]: boolean }
}

interface ArpeggioItem extends SessionItem {
  type: 'arpeggio'
  config: VisualizationConfig
  noteVisibility: { [note: string]: boolean }
}

interface ChordItem extends SessionItem {
  type: 'chord'
  config: VisualizationConfig
  noteVisibility: { [note: string]: boolean }
}

interface ComparisonItem extends SessionItem {
  type: 'comparison'
  items: Array<{
    type: 'scale' | 'arpeggio' | 'chord'
    config: VisualizationConfig
  }>
}

interface VisualizationConfig {
  tuning: string[]      // es. ['E', 'A', 'D', 'G', 'B', 'E']
  root: string         // es. 'C', 'F#', 'Bb'
  scaleName?: string   // es. 'major', 'minorPentatonic'
  chordType?: string   // es. 'maj7', 'm7'
  woodTheme?: 'maple' | 'rosewood' | 'ebony' | 'pau ferro' | 'white'  // override default utente
  labelMode: LabelMode     // default: 'note'
  colorMode: ColorMode   // default: 'monocolor'
  showChordDegrees: boolean // default: false (per toggle scala completa vs accordo)
}

type LabelMode = 'note' | 'degree' | 'none'
type ColorMode = 'monocolor' | 'triads' | 'all' | 'octaves'
```

### Tag

```typescript
interface Tag {
  id: string
  name: string
  color?: string
  createdAt: Date
}
```

### Impostazioni Utente

```typescript
interface UserSettings {
  id: string (same as userId)
  defaultWoodTheme: 'maple' | 'rosewood' | 'ebony' | 'pau ferro' | 'white'
  defaultMode: 'light' | 'dark'
  defaultTuning: string                   // es. 'E-A-D-G-B-E'
  metronomeBpm: number                   // default: 120
  playbackVolume: number                  // 0-1, default: 0.7
  // Configurazione colori visualizzazione
  degreeColors: {
    root: string        // default: '#E53935' (rosso)
      third: string       // default: '#1E88E5' (blu)
      fifth: string       // default: '#43A047' (verde)
      seventh: string     // default: '#8E24AA' (viola)
      ninth: string       // default: '#FB8C00' (arancione)
      eleventh: string    // default: '#00ACC1' (ciano)
      sixth: string       // default: '#D81B60' (rosa)
  },
  octaveColors: {
    octave2: string     // default: '#D32F2F' (rosso scuro)
    octave3: string     // default: '#F57C00' (arancione)
    octave4: string     // default: '#FBC02D' (giallo)
    octave5: string     // default: '#388E3C' (verde)
    octave6: string     // default: '#1976D2' (blu)
    }
  ```
  monocolorNote: string  // default: '#2C2C2C'
  createdAt: Date
  updatedAt: Date
}
```

### Wood Themes

| Tema | Colore Base | Colore Tasti | Venature |
|------|-------------|--------------|----------|
| Maple | #F5DEB3 | #2C2C2C | subtle grain |
| Rosewood | #5D4037 | #1A1A1A | dark grain |
| Ebony | #1C1C1C | #F5F5F5 | subtle grain |
| Pau Ferro | #8B4513 | #2C2C2C | medium grain |
| White | #FFFFFF | #2C2C2C | none |

---

## Funzionalità

### Autenticazione
- [x] Login con email/password
- [x] Registrazione nuovo utente
- [x] Logout
- [x] Redirect automatico se non autenticato
- [x] Protezione route lato client

### Gestione Sessioni (CRUD)
- [x] Lista sessioni utente (ordinata per data)
- [x] Creazione nuova sessione
- [x] Modifica sessione esistente
- [x] Eliminazione sessione con conferma
- [x] Salvataggio automatico / manuale
- [x] Toggle preferito (stella) su ogni sessione
- [x] Assegnazione tag a sessione (multipli)

### Tags
- [x] Creazione nuovo tag
- [x] Eliminazione tag
- [x] Autocomplete per tag esistenti
- [x] Salvataggio tag in collezione separata `users/{userId}/tags`

### Filtri SessionList
- [x] Filtro per tag (dropdown/multiselect)
- [x] Filtro "Solo preferiti"
- [x] Ordinamento (data crescente/decrescente, titolo A-Z)
- [x] Reset filtri

### Elementi Sessione (unificati)
- [ ] Tutti gli elementi (section, scale, arpeggio, chord, comparison) condividono `id` e `order`
- [ ] Elementi ordinati verticalmente nella pagina
- [ ] Bottone per aggiungere nuovo elemento (con dropdown tipologia)
- [ ] Icone per spostare su/giù (future)
- [ ] Icone per editare / salvare / cancellare ogni elemento

### Sezioni WYSIWYG
- [x] Aggiunta sezione testuale (type: 'section')
- [x] Rimozione sezione
- [x] Editor ngx-editor per ogni sezione
- [x] Formattazione base (bold, italic, liste, heading)
- [x] Salvataggio contenuto HTML in Firestore

### Visualizzazioni

#### Tipologie
- [ ] **Scale**: selezione accordatura, tonica, tipo scala
- [ ] **Arpeggi**: selezione accordatura, tonica, tipo arpeggio
- [ ] **Accordi**: selezione accordatura, tonica, tipo accordo

#### Accordature Supportate
- [ ] Standard (E-A-D-G-B-E) come default
- [ ] Drop D
- [ ] DADGAD
- [ ] Open tunings (Open G, Open D)
- [ ] D Modal
- [ ] Altre common tunings

#### Modalità di Visualizzazione Note su Tastiera
- [ ] Visualizzazione note
- [ ] Visualizzazione intervalli/gradi
- [ ] Colorazione per ottave
- [ ] Colorazione nuetra 

#### Interattività Tastiera
- [ ] Toggle visibilità nota da tabella (sopra la tastiera)
- [ ] Click su tasto per aggiungere/rimuovere nota (disegno libero)
- [ ] Evidenziazione visiva note attive/inattive

#### Toolbar Visualizzazione (4 bottoni)
- [ ] **Bottone 1 - Settings**: Modal configurazione label + colori
  - Selezione label mode (note/degree/none)
  - Selezione color mode (monocolor/triads/all/octaves)
  - Preview in tempo reale
- [ ] **Bottone 2 - Fullscreen**: Visualizzazione fullscreen tastiera
  - Toggle modal/fullscreen
  - Chiudibile con ESC o click outside
- [ ] **Bottone 3 - Toggle Chord**: Toggle scala completa ↔ accordo
  - Scala completa: tutte le note della scala
  - Accordo: tonica (1) + terza (3) + quinta (5) + settima (7)
  - Animazione transizione
- [ ] **Bottone 4 - Info Panel**: Pannello informativo
  - Reduced Scale: scale contenute nella scala corrente (es. pentatonica nella maggiore)
  - Extended: scale che estendono quella corrente (es. bebop)
  - Compatibili: accordi che suonano bene con questa scala

#### Selettore Elementi
- [ ] Bottone con dropdown per aggiungere elemento (section, scale, arpeggio, chord, comparison)
- [ ] Icone per spostare su/giù nella lista (future)
- [ ] Icone per editare / salvare / cancellare ogni elemento

### Tabelle di Confronto
- [ ] Selezione elementi da confrontare (scale/accordi/arpeggi)
- [ ] Riga per ogni nota unica
- [ ] Header con gradi rispetto alla prima selezione
- [ ] Toggle visibilità elementi

### Metronomo
- [ ] BPM configurabile (40-240)
- [ ] Play/Pausa
- [ ] Tempo visuale (lampeggio)
- [ ] Suono click (accent su primo tempo)
- [ ] Integrazione in sessioni (opzionale)

### Playback Audio
- [ ] Riproduzione note selezionate su tastiera
- [ ] Utilizzo smplr con soundfonts
- [ ] Caricamento soundfont chitarra
- [ ] Play singola nota / sequenza
- [ ] Toggle playback su ogni visualizzazione

### Temi Visualizzazione Tastiera
- [ ] Tema legno Acero (chiaro, venature light)
- [ ] Tema legno Palissandro (marrone medio)
- [ ] Tema legno Ebano (scuro, venature nere)
- [ ] Tema legno Pau Ferro (marrone rossiccio)
- [ ] Tema Bianco (bianco neutro)
- [ ] Rendering venature (CSS/gradient)
- [ ] Lookup temi in UserSettings

### Impostazioni Utente
- [ ] Raccolta `users/{userId}/settings`
- [ ] Default wood theme configurabile
- [ ] Default light/dark mode (default: light)
- [ ] Override tema per sessione
- [ ] SettingsService per CRUD
- [ ] UI settings nel frontend

### Toggle Theme App
- [ ] Switch light/dark globale
- [ ] Persistenza preference
- [ ] Supporto CSS variables per theming

### Esportazione PDF
- [ ] Generazione PDF da sessione
- [ ] Include titolo, tag, descrizioni
- [ ] Include visualizzazioni tastiere (render SVG → canvas → PDF)
- [ ] Download file PDF

### PWA (Post-Release)
- [ ] Service worker per offline
- [ ] Manifest installabile
- [ ] Supporto mobile

---

## Componenti UI

| Componente | Responsabilità |
|------------|----------------|
| `LoginComponent` | Form login |
| `RegisterComponent` | Form registrazione |
| `SessionListComponent` | Lista sessioni con cards, filtri (tag/favoriti) |
| `SessionEditorComponent` | Editor completo sessione, lista elementi ordinati |
| `SessionItemComponent` | Wrapper generico per elemento (header con azioni) |
| `SectionEditorComponent` | Sezione WYSIWYG (titolo + editor) |
| `FretboardComponent` | Tastiera SVG interattiva |
| `ScaleVisualizationComponent` | Wrapper visualizzazione scala |
| `ArpeggioVisualizationComponent` | Wrapper visualizzazione arpeggio |
| `ChordVisualizationComponent` | Wrapper visualizzazione accordo |
| `ComparisonTableComponent` | Tabella confronto note/gradi |
| `ItemSelectorComponent` | Dropdown aggiunta elemento (tipologie unificate) |
| `TagInputComponent` | Input con autocomplete tag |
| `WysiwygEditorComponent` | Wrapper ngx-editor |
| `ConfirmDialogComponent` | Dialogo conferma eliminazione |
| `FilterPanelComponent` | Pannello filtri sessioni |
| `MetronomeComponent` | Metronomo con BPM, play/pause, tempo visuale |
| `AudioPlaybackComponent` | Controlli playback per visualizzazioni |
| `SettingsComponent` | Pagina impostazioni utente |
| `ThemeToggleComponent` | Toggle light/dark mode |
| `WoodThemeSelectorComponent` | Selettore tema legno per sessione |
| `VisualizationToolbarComponent` | Toolbar 4 bottoni per visualizzazione |
| `VisualizationSettingsModalComponent` | Modal configurazione label+colori |
| `VisualizationInfoPanelComponent` | Panel reduced/extended/compatible |

---

## Routing

```
/login              → LoginComponent
/register           → RegisterComponent
/sessions           → SessionListComponent (auth guard)
/sessions/new       → SessionEditorComponent (auth guard)
/sessions/:id       → SessionEditorComponent (auth guard)
/settings           → SettingsComponent (auth guard)
```

---

## Servizi

| Servizio | Responsabilità |
|----------|----------------|
| `AuthService` | Gestione stato autenticazione Firebase |
| `SessionService` | CRUD operazioni su Firestore |
| `TagService` | Gestione tags utente |
| `TonalService` | Wrapper Tonal.js per generazione note |
| `TuningService` | Gestione e validazione accordature |
| `MetronomeService` | Gestione BPM, timing, audio click |
| `AudioService` | Playback note con smplr |
| `SettingsService` | CRUD impostazioni utente (tema legno, light/dark) |
| `ThemeService` | Gestione switch light/dark app-wide |

---

## UI/UX

### Layout
- Desktop-first, responsive fino a 1024px landscape
- Visualizzazioni in stack verticale (scrollabile)
- Shell con header/navigation

### Stili
- Tailwind CSS V4 (per la configurazione usare Context7)
- Angular CDK Overlay per modali
- Lucide per icone

### Responsive Breakpoints
- Desktop: > 1024px
- Tablet landscape: 1024px (max)
- Focus su UX desktop con adattamento tablet

---

## Piano Realizzativo

### Fase 1: MVP - Fundamenta
> *Obiettivo: Aprire, creare una sessione e vedere una scala*

1. Setup progetto Angular
2. Configurazione Firebase
3. Installazione dipendenze (Tonal.js v5, ngx-editor, lucide-angular, @angular/cdk)
4. Auth Firebase (login, register, logout, auth guard)
5. Routing base con protezione
6. Session list (lettura, cancellazione)
7. Session create/edit (titolo + salvataggio)
8. SVG Fretboard base (tastiera vuota, 6 corde, 12-15 tasti)
9. Scale visualization base (seleziona scala → mostra note)

---

### Fase 2: Interactive Fretboard
> *Obiettivo: Cliccare per togglare note*

1. Tabella note/intervalli sopra fretboard
2. Click su nota tabella → toggle visibilità sulla tastiera
3. Click su tasto → aggiungi/rimuovi nota (disegno libero)
4. Modalità view: Note / Intervalli
5. Colorazione ottave

---

### Fase 3: Tutte le Visualizzazioni
> *Obiettivo: Arpeggi, accordi e confronti*

1. Arpeggio visualization
2. Chord visualization
3. Comparison tables con gradi
4. Selettore accordatura (standard + alternative)
5. UI refinement visualizzazioni

---

### Fase 4: Polish & UX
> *Obiettivo: Editor WYSIWYG e polish finale*

1. Integrazione ngx-editor
2. Dropdown per aggiungere/eliminare visualizzazioni
3. Icone azioni (save/edit/delete) su ogni elemento
4. Responsive refinement (fino a 1024px)
5. Confirm dialog per cancellazioni
6. Loading states e error handling

---

### Fase 5: Audio Features
> *Obiettivo: Metronomo e playback audio*

1. Installazione smplr
2. MetronomeService (BPM, timing, audio)
3. MetronomeComponent (UI BPM slider, play/pause)
4. AudioService (playback soundfonts chitarra)
5. AudioPlaybackComponent su visualizzazioni
6. Toggle play/stop su ogni elemento

---

### Fase 6: PDF Export
> *Obiettivo: Esportazione sessioni*

1. Installazione jsPDF + html2canvas
2. Servizio export PDF
3. Pulsante download su editor
4. Render SVG → canvas → PDF
5. Download file

---

### Fase 7: PWA (Post-Release)
> *Obiettivo: App installabile*

1. Service worker offline
2. Web manifest
3. Supporto mobile
4. Deploy Netlify

---

## Note Tecniche

### Tonal.js v5
- API tree-shakeable, usare named imports
- Moduli principali: `Note`, `Scale`, `Chord`, `Arpeggio`, `Tuning`
- Generazione note basata su Tonal, renderizzazione su SVG custom

### SVG Fretboard
- Elementi `<line>` per corde e tasti
- Elementi `<circle>` per i dot markers
- Elementi `<circle>` con event listeners per le note cliccabili
- CSS per styling colori, transizioni e hover

### Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/sessions/{sessionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/tags/{tagId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## Todo Checkbox

### Setup
- [ ] Creare progetto Angular
- [ ] Configurare Firebase project
- [ ] Installare dipendenze npm
- [ ] Installare Tone.js
- [ ] Installare jsPDF + html2canvas
- [ ] Configurare environment Firebase
- [ ] Setup Firestore rules

### Autenticazione
- [ ] Implementare AuthService
- [ ] Creare LoginComponent
- [ ] Creare RegisterComponent
- [ ] Implementare auth guard
- [ ] Gestire redirect post login

### Impostazioni Utente
- [ ] Implementare SettingsService
- [ ] Creare UserSettings in Firestore al primo login
- [ ] Caricare impostazioni utente all'avvio
- [ ] Implementare ThemeService (light/dark)
- [ ] Creare SettingsComponent
- [ ] Aggiungere route /settings

### Sessioni
- [ ] Implementare SessionService
- [ ] Implementare TagService
- [ ] Creare SessionListComponent
- [ ] Creare FilterPanelComponent
- [ ] Creare SessionEditorComponent
- [ ] Creare SessionItemComponent (wrapper generico)
- [ ] Creare SectionEditorComponent
- [ ] Creare TagInputComponent
- [ ] Implementare filtri (tag, preferiti)
- [ ] Implementare toggle preferiti
- [ ] Implementare CRUD completo
- [ ] Implementare ordinamento elementi (order property)
- [ ] Implementare aggiunta/rimozione elementi dalla lista

### Visualizzazioni
- [ ] Implementare TonalService
- [ ] Implementare TuningService
- [ ] Creare FretboardComponent
- [ ] Creare ScaleVisualizationComponent
- [ ] Creare ArpeggioVisualizationComponent
- [ ] Creare ChordVisualizationComponent
- [ ] Implementare interattività (toggle, click)

### Tabelle Confronto
- [ ] Creare ComparisonTableComponent
- [ ] Implementare logica gradi

### WYSIWYG
- [ ] Integrare ngx-editor
- [ ] Creare WysiwygEditorComponent
- [ ] Supporto multiple sezioni nella lista elementi
- [ ] Aggiunta/rimozione sezioni dinamicamente

### UI Components
- [ ] Creare ItemSelectorComponent (dropdown unificato)
- [ ] Implementare CDK Overlay modali
- [ ] Aggiungere icone Lucide
- [ ] Implementare spostamento su/giù elementi (UI placeholder)

### Wood Themes & Theming
- [ ] Definire CSS variables per temi legno (maple, rosewood, ebony, pau ferro)
- [ ] Implementare FretboardComponent con theming dinamico
- [ ] Creare WoodThemeSelectorComponent (dropdown per sessione)
- [ ] Creare ThemeToggleComponent (light/dark switch)
- [ ] Implementare persistenza tema in sessionStorage/localStorage
- [ ] Creare SettingsComponent con selezione default

### Polish
- [ ] Responsive styling (fino a 1024px)
- [ ] Error handling
- [ ] Loading states
- [ ] Deploy Netlify
