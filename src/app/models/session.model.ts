export interface Session {
  id: string;
  title: string;
  tags: string[];
  isFavorite: boolean;
  items: SessionItem[];
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface SessionItem {
  id: string;
  type: 'section' | 'scale' | 'arpeggio' | 'chord' | 'comparison' | 'chordprogression';
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
}

export interface ArpeggioItem extends SessionItem {
  type: 'arpeggio';
  config: VisualizationConfig;
  noteVisibility: Record<string, boolean>;
}

export interface ChordItem extends SessionItem {
  type: 'chord';
  config: VisualizationConfig;
  noteVisibility: Record<string, boolean>;
}

export interface ChordDefinition {
  name: string;
  startFret: number;
  strings: (number | 'x' | 'o')[];
}

export interface ChordProgressionItem extends SessionItem {
  type: 'chordprogression';
  chords: ChordDefinition[];
}

export interface ComparisonItem extends SessionItem {
  type: 'comparison';
  items: Array<{
    type: 'scale' | 'arpeggio' | 'chord';
    config: VisualizationConfig;
  }>;
}

export interface VisualizationConfig {
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
}

export type LabelMode = 'note' | 'degree' | 'none';
export type ColorMode = 'monocolor' | 'triads' | 'all' | 'octaves';

export interface Tag {
  id: string;
  name: string;
  createdAt: Date | null;
}

export type SessionSortBy = 'updatedAt_desc' | 'updatedAt_asc' | 'title_asc' | 'title_desc';