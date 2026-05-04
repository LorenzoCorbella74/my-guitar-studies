export interface UserSettings {
  id: string; // userId
  theme: 'light' | 'dark';
  fretboardStyleIndex: number; // Index in FRETBOARD_STYLES array
  createdAt: Date | null;
  updatedAt: Date | null;
}
