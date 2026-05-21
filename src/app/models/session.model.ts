export interface Session {
  id: string;
  title: string;
  tags: string[];
  isFavorite: boolean;
  items: SessionItem[];
  groupId?: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface SessionGroup {
  id: string;
  name: string;
  tags: string[];
  isFavorite: boolean;
  order: number;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface SessionItem {
  id: string;
  type: 'section' | 'scale' | 'arpeggio' | 'chord' | 'comparison' | 'chordprogression' | 'timeline';
  order: number;
}

export interface SectionItem extends SessionItem {
  type: 'section';
  title: string;
  content: string;
}

export interface ScaleItem extends SessionItem {
  type: 'scale';
  config: VisualizationConfig;
  noteVisibility: Record<string, boolean>;
  overlays?: OverlayItem[];
  highlightedNotes?: HighlightedNote[];
}

export interface ArpeggioItem extends SessionItem {
  type: 'arpeggio';
  config: VisualizationConfig;
  noteVisibility: Record<string, boolean>;
  overlays?: OverlayItem[];
  highlightedNotes?: HighlightedNote[];
}

export interface ChordItem extends SessionItem {
  type: 'chord';
  config: VisualizationConfig;
  noteVisibility: Record<string, boolean>;
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

export interface ChordDefinition {
  name: string;
  startFret: number;
  strings: (number | 'x' | 'o')[];
}

export interface ChordProgressionItem extends SessionItem {
  type: 'chordprogression';
  title: string;
  chords: ChordDefinition[];
}

export interface ComparisonItem extends SessionItem {
  type: 'comparison';
  items: Array<{
    type: 'scale' | 'arpeggio' | 'chord';
    config: VisualizationConfig;
  }>;
}

export type NoteDuration = 1 | 0.5 | 0.25 | 0.125;

export interface TimelineLayer {
  id: string;
  root: string;
  chordType: string;
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