import { DrumGenre } from '../data/drum-patterns';

export interface UserSettings {
  id: string; // userId
  theme: 'light' | 'dark';
  fretboardStyleIndex: number; // Index in FRETBOARD_STYLES array
  
  // Audio settings for timeline playback
  audioInstrument?: string; // Default: 'string_ensemble_1'
  audioVolume?: number; // 0-1, Default: 0.7
  audioReverb?: number; // 0-1, Default: 0.3
  audioDetune?: number; // -100 to 100 cents, Default: 0
  audioSustain?: boolean; // Default: true
  playMetronome?: boolean; // Default: true

  // Drum machine & sequencer settings
  audioDrumGenre?: DrumGenre; // Default: 'pop'
  audioDrumKit?: string; // Default: 'TR-808'
  audioDrumVolume?: number; // 0-1, Default: 0.7
  
  createdAt: Date | null;
  updatedAt: Date | null;
}
