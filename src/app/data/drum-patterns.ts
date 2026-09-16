export type DrumGenre =
  | 'pop'
  | 'rock'
  | 'rock_ballad'
  | 'funk'
  | 'blues'
  | 'jazz'
  | 'bossa'
  | 'latin'
  | 'fusion'
  | 'metronome';

export interface DrumGenreOption {
  value: DrumGenre;
  label: string;
  description: string;
}

export const DRUM_GENRES: DrumGenreOption[] = [
  { value: 'pop', label: 'Pop', description: 'Pattern 4/4 classico con cassa su 1 e 3, rullante su 2 e 4, hi-hat in ottavi' },
  { value: 'rock', label: 'Rock', description: 'Groove rock energico con kick driving, snare potente e charleston continuo' },
  { value: 'rock_ballad', label: 'Rock Ballad', description: 'Pattern lento ed espressivo, ideale per ballad rock con kick morbido e accenti' },
  { value: 'funk', label: 'Funk', description: 'Groove sincopato con sedicesimi, kick in levare e accenti funky su rullante' },
  { value: 'blues', label: 'Blues', description: 'Shuffle / terzinato tipico blues a 12/8 (subdivisione swing)' },
  { value: 'jazz', label: 'Jazz', description: 'Swing acustico arioso: hi-hat morbido a pedale e bacchetta, cassa leggera' },
  { value: 'bossa', label: 'Bossa Nova', description: 'Pattern brasiliano sincopato con cross-stick/rim e cassa caratteristica' },
  { value: 'latin', label: 'Latin', description: 'Ritmo latino con clave, percussioni e cassa incalzante' },
  { value: 'fusion', label: 'Fusion', description: 'Groove lirico ECM: hi-hat continuo in ottavi, cross-stick e cassa sincopata' },
  { value: 'metronome', label: 'Metronomo (con accento)', description: 'Click del metronomo con accento sul primo beat' }
];

export interface DrumKitOption {
  value: string;
  label: string;
}

export const AVAILABLE_DRUM_KITS: DrumKitOption[] = [
  { value: 'TR-808', label: 'Roland TR-808' },
  { value: 'Casio-RZ1', label: 'Casio RZ-1' },
  { value: 'LM-2', label: 'LinnDrum (LM-2)' },
  { value: 'MFB-512', label: 'MFB-512' },
  { value: 'Roland CR-8000', label: 'Roland CR-8000' }
];

export interface DrumStepHit {
  /** Voice / sample group name: 'kick', 'snare', 'hihat', 'openhat', 'rim', 'clap', 'ride', 'crash', 'tom' */
  note: string;
  /** Relative offset within the 4/4 bar in fractions of bar [0, 1). 
   * E.g., beat 1 = 0, beat 2 = 0.25, beat 3 = 0.5, beat 4 = 0.75.
   * Sixteenths: 0, 1/16, 2/16, ... 15/16.
   */
  offset: number;
  /** Velocity 0-127 (default: 100) */
  velocity?: number;
}

export interface DrumPattern {
  genre: DrumGenre;
  name: string;
  /** Subdivisions per bar (e.g. 16 for standard 16th notes, 12 for triplets/shuffle) */
  gridSize: number;
  hits: DrumStepHit[];
}

/**
 * Helper to build 16-step hits (index 0 to 15 in a 4/4 bar)
 */
function s16(step: number): number {
  return step / 16;
}

/**
 * Helper to build 12-step hits (shuffle / 12/8 triplet feel in a 4/4 bar)
 */
function s12(step: number): number {
  return step / 12;
}

export const DRUM_PATTERNS: Record<DrumGenre, DrumPattern> = {
  pop: {
    genre: 'pop',
    name: 'Pop Groove',
    gridSize: 16,
    hits: [
      // Kick on 1 and 3 (with ghost on 11)
      { note: 'kick', offset: s16(0), velocity: 110 },
      { note: 'kick', offset: s16(8), velocity: 105 },
      { note: 'kick', offset: s16(10), velocity: 85 },
      // Snare on 2 and 4 (beats 5 and 13 in 16ths: step 4 and 12)
      { note: 'snare', offset: s16(4), velocity: 115 },
      { note: 'snare', offset: s16(12), velocity: 115 },
      // Hi-hat straight 8th notes (steps 0, 2, 4, 6, 8, 10, 12, 14)
      { note: 'hihat', offset: s16(0), velocity: 90 },
      { note: 'hihat', offset: s16(2), velocity: 75 },
      { note: 'hihat', offset: s16(4), velocity: 90 },
      { note: 'hihat', offset: s16(6), velocity: 75 },
      { note: 'hihat', offset: s16(8), velocity: 90 },
      { note: 'hihat', offset: s16(10), velocity: 75 },
      { note: 'hihat', offset: s16(12), velocity: 90 },
      { note: 'hihat', offset: s16(14), velocity: 80 }
    ]
  },

  rock: {
    genre: 'rock',
    name: 'Rock Driving Beat',
    gridSize: 16,
    hits: [
      // Driving kick: 1, 1-and-a (step 0, 6), 3 (step 8)
      { note: 'kick', offset: s16(0), velocity: 120 },
      { note: 'kick', offset: s16(6), velocity: 100 },
      { note: 'kick', offset: s16(8), velocity: 115 },
      // Hard Snare on 2 and 4 (step 4, 12)
      { note: 'snare', offset: s16(4), velocity: 120 },
      { note: 'snare', offset: s16(12), velocity: 125 },
      // 8th-note Hi-hats with accent on beats
      { note: 'hihat', offset: s16(0), velocity: 95 },
      { note: 'hihat', offset: s16(2), velocity: 80 },
      { note: 'hihat', offset: s16(4), velocity: 95 },
      { note: 'hihat', offset: s16(6), velocity: 80 },
      { note: 'hihat', offset: s16(8), velocity: 95 },
      { note: 'hihat', offset: s16(10), velocity: 80 },
      { note: 'hihat', offset: s16(12), velocity: 95 },
      { note: 'hihat', offset: s16(14), velocity: 85 }
    ]
  },

  rock_ballad: {
    genre: 'rock_ballad',
    name: 'Rock Ballad',
    gridSize: 16,
    hits: [
      // Deep spaced kicks
      { note: 'kick', offset: s16(0), velocity: 105 },
      { note: 'kick', offset: s16(7), velocity: 85 },
      { note: 'kick', offset: s16(8), velocity: 100 },
      // Snare with ghost notes
      { note: 'snare', offset: s16(4), velocity: 110 },
      { note: 'snare', offset: s16(12), velocity: 110 },
      { note: 'snare', offset: s16(15), velocity: 60 },
      // 16th Hi-hat pattern
      { note: 'hihat', offset: s16(0), velocity: 85 },
      { note: 'hihat', offset: s16(1), velocity: 60 },
      { note: 'hihat', offset: s16(2), velocity: 75 },
      { note: 'hihat', offset: s16(3), velocity: 60 },
      { note: 'hihat', offset: s16(4), velocity: 85 },
      { note: 'hihat', offset: s16(5), velocity: 60 },
      { note: 'hihat', offset: s16(6), velocity: 75 },
      { note: 'hihat', offset: s16(7), velocity: 60 },
      { note: 'hihat', offset: s16(8), velocity: 85 },
      { note: 'hihat', offset: s16(9), velocity: 60 },
      { note: 'hihat', offset: s16(10), velocity: 75 },
      { note: 'hihat', offset: s16(11), velocity: 60 },
      { note: 'hihat', offset: s16(12), velocity: 85 },
      { note: 'hihat', offset: s16(13), velocity: 60 },
      { note: 'hihat', offset: s16(14), velocity: 75 },
      { note: 'hihat', offset: s16(15), velocity: 65 }
    ]
  },

  funk: {
    genre: 'funk',
    name: 'Syncopated Funk',
    gridSize: 16,
    hits: [
      // Funk kick syncopations
      { note: 'kick', offset: s16(0), velocity: 115 },
      { note: 'kick', offset: s16(6), velocity: 95 },
      { note: 'kick', offset: s16(10), velocity: 100 },
      { note: 'kick', offset: s16(13), velocity: 90 },
      // Snare on 2 and 4 + ghost notes
      { note: 'snare', offset: s16(4), velocity: 115 },
      { note: 'snare', offset: s16(7), velocity: 65 },
      { note: 'snare', offset: s16(12), velocity: 120 },
      { note: 'snare', offset: s16(14), velocity: 70 },
      // Crisp 16th Hi-hat with open hat accents
      { note: 'hihat', offset: s16(0), velocity: 90 },
      { note: 'hihat', offset: s16(1), velocity: 65 },
      { note: 'hihat', offset: s16(2), velocity: 85 },
      { note: 'hihat', offset: s16(3), velocity: 65 },
      { note: 'hihat', offset: s16(4), velocity: 90 },
      { note: 'hihat', offset: s16(5), velocity: 65 },
      { note: 'hihat', offset: s16(6), velocity: 85 },
      { note: 'hihat', offset: s16(7), velocity: 65 },
      { note: 'hihat', offset: s16(8), velocity: 90 },
      { note: 'hihat', offset: s16(9), velocity: 65 },
      { note: 'openhat', offset: s16(10), velocity: 85 },
      { note: 'hihat', offset: s16(11), velocity: 60 },
      { note: 'hihat', offset: s16(12), velocity: 90 },
      { note: 'hihat', offset: s16(13), velocity: 65 },
      { note: 'hihat', offset: s16(14), velocity: 85 },
      { note: 'hihat', offset: s16(15), velocity: 65 }
    ]
  },

  blues: {
    genre: 'blues',
    name: 'Blues Shuffle',
    gridSize: 12,
    hits: [
      // 12/8 shuffle: 4 beats, each with 3 triplet subdivisions (0, 3, 6, 9 are downbeats; 2, 5, 8, 11 are swing upbeats)
      // Kick on 1 and 3
      { note: 'kick', offset: s12(0), velocity: 110 },
      { note: 'kick', offset: s12(6), velocity: 105 },
      // Snare on 2 and 4 (beat 2 = step 3, beat 4 = step 9)
      { note: 'snare', offset: s12(3), velocity: 115 },
      { note: 'snare', offset: s12(9), velocity: 115 },
      // Shuffle Hi-hat (dum... da, dum... da)
      { note: 'hihat', offset: s12(0), velocity: 95 },
      { note: 'hihat', offset: s12(2), velocity: 75 },
      { note: 'hihat', offset: s12(3), velocity: 90 },
      { note: 'hihat', offset: s12(5), velocity: 75 },
      { note: 'hihat', offset: s12(6), velocity: 95 },
      { note: 'hihat', offset: s12(8), velocity: 75 },
      { note: 'hihat', offset: s12(9), velocity: 90 },
      { note: 'hihat', offset: s12(11), velocity: 75 }
    ]
  },

  jazz: {
    genre: 'jazz',
    name: 'Jazz Acoustic Swing',
    gridSize: 12,
    hits: [
      // Feathering morbido e trasparente di cassa (solo tocco su 1 e 3)
      { note: 'kick', offset: s12(0), velocity: 60 },
      { note: 'kick', offset: s12(6), velocity: 50 },
      // Hi-hat a pedale su 2 e 4 (chick pulito)
      { note: 'hihat', offset: s12(3), velocity: 80 },
      { note: 'hihat', offset: s12(9), velocity: 80 },
      // Hi-hat swing morbido al posto del piatto ride metallico (1, 2, 2+, 3, 4, 4+)
      { note: 'hihat', offset: s12(0), velocity: 70 },
      { note: 'hihat', offset: s12(5), velocity: 55 },
      { note: 'hihat', offset: s12(6), velocity: 70 },
      { note: 'hihat', offset: s12(11), velocity: 55 },
      // Tocco delicato di rimshot sul beat 4
      { note: 'rim', offset: s12(9), velocity: 50 }
    ]
  },

  bossa: {
    genre: 'bossa',
    name: 'Bossa Nova',
    gridSize: 16,
    hits: [
      // Classic Bossa Kick: beat 1, beat 2+, beat 3, beat 4+ (0, 6, 8, 14)
      { note: 'kick', offset: s16(0), velocity: 95 },
      { note: 'kick', offset: s16(6), velocity: 85 },
      { note: 'kick', offset: s16(8), velocity: 95 },
      { note: 'kick', offset: s16(14), velocity: 85 },
      // Rim/Cross-stick Bossa Clave pattern: 0, 3, 6, 10, 12
      { note: 'rim', offset: s16(0), velocity: 95 },
      { note: 'rim', offset: s16(3), velocity: 90 },
      { note: 'rim', offset: s16(6), velocity: 90 },
      { note: 'rim', offset: s16(10), velocity: 95 },
      { note: 'rim', offset: s16(12), velocity: 90 },
      // Constant soft 8th Hi-hat / Shaker feel
      { note: 'hihat', offset: s16(0), velocity: 70 },
      { note: 'hihat', offset: s16(2), velocity: 60 },
      { note: 'hihat', offset: s16(4), velocity: 70 },
      { note: 'hihat', offset: s16(6), velocity: 60 },
      { note: 'hihat', offset: s16(8), velocity: 70 },
      { note: 'hihat', offset: s16(10), velocity: 60 },
      { note: 'hihat', offset: s16(12), velocity: 70 },
      { note: 'hihat', offset: s16(14), velocity: 60 }
    ]
  },

  latin: {
    genre: 'latin',
    name: 'Latin Afro-Cuban Clave',
    gridSize: 16,
    hits: [
      // Tumbao kick pattern: 0, 6, 8, 14
      { note: 'kick', offset: s16(0), velocity: 100 },
      { note: 'kick', offset: s16(6), velocity: 90 },
      { note: 'kick', offset: s16(8), velocity: 100 },
      { note: 'kick', offset: s16(14), velocity: 90 },
      // Clave / rim: 0, 3, 6, 10, 12
      { note: 'rim', offset: s16(0), velocity: 105 },
      { note: 'rim', offset: s16(3), velocity: 100 },
      { note: 'rim', offset: s16(6), velocity: 100 },
      { note: 'rim', offset: s16(10), velocity: 105 },
      { note: 'rim', offset: s16(12), velocity: 100 },
      // Hi-hat pulito e controllato in ottavi
      { note: 'hihat', offset: s16(0), velocity: 75 },
      { note: 'hihat', offset: s16(2), velocity: 60 },
      { note: 'hihat', offset: s16(4), velocity: 75 },
      { note: 'hihat', offset: s16(6), velocity: 60 },
      { note: 'hihat', offset: s16(8), velocity: 75 },
      { note: 'hihat', offset: s16(10), velocity: 60 },
      { note: 'hihat', offset: s16(12), velocity: 75 },
      { note: 'hihat', offset: s16(14), velocity: 60 }
    ]
  },

  fusion: {
    genre: 'fusion',
    name: 'ECM Lyrical Fusion',
    gridSize: 16,
    hits: [
      // Cassa lirica sincopata stile PMG (1, 2+, 3+)
      { note: 'kick', offset: s16(0), velocity: 85 },
      { note: 'kick', offset: s16(6), velocity: 70 },
      { note: 'kick', offset: s16(10), velocity: 75 },
      // Cross-stick / Rimshot caldo e delicato su 2 e 4 con ghost note
      { note: 'rim', offset: s16(4), velocity: 85 },
      { note: 'rim', offset: s16(12), velocity: 90 },
      { note: 'rim', offset: s16(14), velocity: 45 },
      // Hi-hat morbido e controllato in ottavi
      { note: 'hihat', offset: s16(0), velocity: 65 },
      { note: 'hihat', offset: s16(2), velocity: 50 },
      { note: 'hihat', offset: s16(4), velocity: 65 },
      { note: 'hihat', offset: s16(6), velocity: 50 },
      { note: 'hihat', offset: s16(8), velocity: 65 },
      { note: 'hihat', offset: s16(10), velocity: 50 },
      { note: 'hihat', offset: s16(12), velocity: 65 },
      { note: 'hihat', offset: s16(14), velocity: 50 }
    ]
  },

  metronome: {
    genre: 'metronome',
    name: 'Metronomo (solo click)',
    gridSize: 4,
    hits: [] // Empty drum hits: handled by MetronomeService
  }
};

/*
 ===================================================================================================
 🥁 GUIDA ALL'EDITING E ALLA CREAZIONE DEI DRUM PATTERNS
 ===================================================================================================

 Ogni pattern in `DRUM_PATTERNS` rappresenta la ritmica di una battuta standard in tempo 4/4.

 ---
 1. STRUTTURA DI UN PATTERN (`DrumPattern`)
 ---
 - `genre`: Identificativo univoco del genere (`DrumGenre`).
 - `name`: Nome descrittivo visualizzato nella UI.
 - `gridSize`: Numero di suddivisioni temporali nella battuta:
     * `16`: per tempi binari / sedicesimi (pop, rock, funk, bossa, fusion, ecc.)
     * `12`: per tempi shuffle / terzinati / swing (blues, jazz con suddivisione a terzine)
 - `hits`: Array di colpi percussivi (`DrumStepHit`), ciascuno con `note`, `offset` e `velocity`.

 ---
 2. OFFSET (Posizione temporale nella battuta)
 ---
 L'offset è un numero decimale compreso tra [0.0, 1.0) che indica in quale punto della battuta 4/4
 viene innescato il colpo:
   - `0.00` (Beat 1 - Inizio battuta)
   - `0.25` (Beat 2)
   - `0.50` (Beat 3)
   - `0.75` (Beat 4)

 Per facilitare la scrittura sono disponibili due helper:
   a) `s16(step)`: per griglie a 16esimi (step da 0 a 15)
      - `s16(0)`  -> Beat 1
      - `s16(2)`  -> Beat 1-levare (ottavo)
      - `s16(4)`  -> Beat 2
      - `s16(8)`  -> Beat 3
      - `s16(12)` -> Beat 4
   b) `s12(step)`: per griglie a terzine di 12esimi (step da 0 a 11)
      - `s12(0)` -> Beat 1
      - `s12(2)` -> Terzina levare swing (upbeat)
      - `s12(3)` -> Beat 2
      - `s12(6)` -> Beat 3
      - `s12(9)` -> Beat 4

 ---
 3. VELOCITY (Dinamica e intensità del colpo)
 ---
 La velocity è un valore numerico in scala MIDI da 1 a 127:
   - `115 - 127`: Accento forte / Colpo primario (es. cassa su 1 e 3, rullante su 2 e 4)
   - `80 - 100` : Colpo normale / Groove di base (es. hi-hat sui quarti o ottavi principali)
   - `50 - 75`  : Colpo morbido / Sub-divisione non accentata
   - `30 - 50`  : Ghost note / Tocco quasi impercettibile per dare respiro al groove

 ---
 4. SUONI DISPONIBILI (`note`)
 ---
 I nomi logici vengono automaticamente mappati da `AudioService.resolveDrumSample()` sul sample
 corretto del drum kit in uso:
   - `'kick'`    : Cassa / Bass Drum (bd)
   - `'snare'`   : Rullante / Snare Drum (sd)
   - `'hihat'`   : Charleston chiuso (closed hi-hat / ch)
   - `'openhat'` : Charleston aperto (open hi-hat / oh)
   - `'rim'`     : Cross-stick / Rimshot / Clave
   - `'clap'`    : Battito di mani (handclap)
   - `'ride'`    : Piatto Ride / Cymbal
   - `'crash'`   : Piatto Crash
   - `'cowbell'` : Campanaccio
 ===================================================================================================
*/
