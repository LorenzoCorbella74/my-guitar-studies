export interface Session {
  id: string;
  title: string;
  tags: string[];
  isFavorite: boolean;
  items: SessionItem[];
  groupId?: string;
  groupOrder?: number;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface SessionGroup {
  id: string;
  name: string;
  tags: string[];
  isGlobal: boolean;
  isFavorite: boolean;
  order: number;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface SessionItem {
  id: string;
  type: 'section' | 'scale' | 'arpeggio' | 'chord' | 'comparison' | 'chordprogression' | 'harmonicgrid' | 'keyprogression' | 'timeline' | 'modalinterchange' | 'fretboard' | 'tab' | 'circleoffifths';
  order: number;
}

export interface SectionItem extends SessionItem {
  type: 'section';
  title: string;
  content: string;
}

export type NoteVisibility = 0 | 0.35 | 1;

export interface ScaleItem extends SessionItem {
  type: 'scale';
  config: VisualizationConfig;
  noteVisibility: Record<string, NoteVisibility | 0.5 | boolean>;
  customNotes?: string[];
  overlays?: OverlayItem[];
  highlightedNotes?: HighlightedNote[];
}

export interface ArpeggioItem extends SessionItem {
  type: 'arpeggio';
  config: VisualizationConfig;
  noteVisibility: Record<string, NoteVisibility | 0.5 | boolean>;
  customNotes?: string[];
  overlays?: OverlayItem[];
  highlightedNotes?: HighlightedNote[];
}

export interface ChordItem extends SessionItem {
  type: 'chord';
  config: VisualizationConfig;
  noteVisibility: Record<string, NoteVisibility | 0.5 | boolean>;
  customNotes?: string[];
  overlays?: OverlayItem[];
  highlightedNotes?: HighlightedNote[];
}

export interface HighlightedNote {
  string: number;
  fret: number;
  note: string;
  level: 1 | 2; // Level 1: single position, Level 2: all instances
}

export interface OverlayItem {
  type: 'scale' | 'chord' | 'notes' | 'notes-with-octaves';
  root?: string;
  name?: string;
  notes?: string[]; // For 'notes': ['C', 'E', 'G'], for 'notes-with-octaves': ['C3', 'E4', 'G5']
  visible?: boolean; // If undefined, defaults to true
}

export type ChordNoteDegree = 'root' | 'third' | 'sixth' | 'fifth' | 'seventh' | 'ninth' | 'eleventh' | 'generic';

export interface ChordDefinition {
  name: string;
  startFret: number;
  strings: (number | 'x' | 'o')[];
  barres?: Record<number, number[]>; // { fret: [stringIndices] }
  noteDegrees?: Partial<Record<number, ChordNoteDegree>>; // { stringIndex: degree }, undefined = colore default
}

// Ciclo Alt/Option+click: nessun grado (colore default) -> tonica -> terza -> ... -> generico -> ...
export const CHORD_NOTE_DEGREE_CYCLE: (ChordNoteDegree | undefined)[] =
  [undefined, 'root', 'third', 'fifth', 'seventh', 'ninth', 'eleventh', 'sixth', 'generic'];

export const CHORD_NOTE_DEGREE_LABELS: Record<ChordNoteDegree, string> = {
  root: 'Tonica',
  third: 'Terza',
  fifth: 'Quinta',
  seventh: 'Settima',
  ninth: 'Nona',
  eleventh: 'Undicesima',
  sixth: 'Sesta',
  generic: 'Generico'
};

// Stessa palette usata nel fretboard editor (fretboard-editor.component.ts)
export const CHORD_NOTE_DEGREE_COLORS: Record<ChordNoteDegree, string> = {
  root: '#ffee58',    // yellow
  third: '#ffa726',   // orange
  fifth: '#FF4136',   // red
  seventh: '#9e9e9e', // grey
  ninth: '#AACDDC',   // palette1
  eleventh: '#84B179', // palette2
  sixth: '#FFB399',   // palette3
  generic: '#ffffff'  // white, va bordato per restare visibile
};

export function getChordNoteDegreeColor(degree: ChordNoteDegree | undefined): string | undefined {
  return degree ? CHORD_NOTE_DEGREE_COLORS[degree] : undefined;
}

export interface ChordProgressionItem extends SessionItem {
  type: 'chordprogression';
  title: string;
  chords: ChordDefinition[];
}

export interface HarmonicBeat {
  chord: string | null;
  holdPrevious: boolean;
}

export interface HarmonicBar {
  id: string;
  beats: [HarmonicBeat, HarmonicBeat, HarmonicBeat, HarmonicBeat];
}

export interface HarmonicSection {
  id: string;
  label: string;
  name?: string;
  bars: HarmonicBar[];
}

export interface HarmonicGridItem extends SessionItem {
  type: 'harmonicgrid';
  title: string;
  bpm?: number;
  sections: HarmonicSection[];
}

export interface ComparisonItem extends SessionItem {
  type: 'comparison';
  items: Array<{
    type: 'scale' | 'arpeggio' | 'chord';
    config: VisualizationConfig;
  }>;
}

export type NoteDuration = 1 | 0.5 | 0.25 | 0.125;

export type ChordInversion = 'root' | '1st' | '2nd' | '3rd';

export interface TimelineLayer {
  id: string;
  root: string;
  chordType: string;
  octave: number; // 2, 3, or 4
  inversion: ChordInversion; // Default: 'root'
  duration: NoteDuration;
  activeNotes: Record<string, boolean>;
  overlays?: OverlayItem[];
}

export interface TimelineItem extends SessionItem {
  type: 'timeline';
  bpm: number;
  tuning: string[];
  layers: TimelineLayer[];
  colorMode?: ColorMode;
  fretboardColor?: string;
}

export interface ModalInterchangeItem extends SessionItem {
  type: 'modalinterchange';
  root: string;
  selectedMode1: number | null; // Index del modo selezionato (0-6)
  selectedMode2: number | null; // Index del secondo modo selezionato (0-6)
}

export interface FretboardNote {
  string: number;
  fret: number;
  color: string; // uno dei 6 colori della palette: yellow, orange, red, grey, white, black
}

export interface FretboardOverlay {
  string: number;
  fret: number;
}

export interface FretboardItem extends SessionItem {
  type: 'fretboard';
  title:string;
  fretboardConfig: {
    fretShift?: number;
    fretboardColor?: string;
    tuning: string[];
  };
  notes: FretboardNote[];
  overlays: FretboardOverlay[];
}

export interface KeyProgressionItem extends SessionItem {
  type: 'keyprogression';
  tonic?: string;
  keyType?: string; // 'major', 'natural', 'harmonic', 'melodic'
}

export interface TabItem extends SessionItem {
  type: 'tab';
  notation: string;
  title?: string;
  width?: number;
  height?: number;
}

export interface CircleOfFifthsItem extends SessionItem {
  type: 'circleoffifths';
  selectedKey: string;
  showRelativeMinor: boolean;
  highlightDistance: 1 | 2;
  zoomLevel: number;
  detailsPanelOpen: boolean;
}

export interface VisualizationConfig {
  title?: string;
  tuning: string[];
  root: string;
  scaleName?: string;
  chordType?: string;
  woodTheme?: 'maple' | 'rosewood' | 'ebony' | 'pau ferro' | 'white';
  fretboardColor?: string;
  labelMode: LabelMode;
  colorMode: ColorMode;
  showChordDegrees: boolean;
  noteOpacity?: number;
  startFret?: number;
  endFret?: number;
  fretShift?: number; // Offset for rendering fretboard (0-12)
}

export type LabelMode = 'note' | 'degree' | 'none';
export type ColorMode = 'monocolor' | 'triads' | 'all' | 'octaves';

export interface Tag {
  id: string;
  name: string;
  createdAt: Date | null;
}

export type SessionSortBy = 'updatedAt_desc' | 'updatedAt_asc' | 'title_asc' | 'title_desc';