export const DEGREE_COLOURS = {
  '1P': '#ffee58',
  '2m': '#b3e5fc',
  '2M': '#87CEFA',
  '2A': '#87CEFA',
  '3m': '#ffcc80',
  '3M': '#ffa726',
  '4P': '#a5d6a7',
  '4A': '#66bb6a',
  '5d': '#e57373',
  '5P': '#FF4136',
  '5A': '#f44336',
  '6m': '#f8bbd0',
  '6M': '#f48fb1',
  '7d': '#e0e0e0',
  '7m': '#bdbdbd',
  '7M': '#9e9e9e'
};

export const OCTAVE_COLOURS: Record<number, string> = {
  2: '#2196F3',  // Blu
  3: '#4CAF50',  // Verde
  4: '#FF9800',  // Arancione
  5: '#9C27B0'   // Viola
};

export const STANDARD_TUNINGS = {
  'Standard (E)': ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
  'Drop D': ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'],
  'Drop C': ['C2', 'G2', 'C3', 'F3', 'A3', 'D4'],
  'Half Step Down': ['Eb2', 'Ab2', 'Db3', 'Gb3', 'Bb3', 'Eb4'],
  'Whole Step Down': ['D2', 'G2', 'C3', 'F3', 'A3', 'D4'],
  'Open D': ['D2', 'A2', 'D3', 'F#3', 'A3', 'D4'],
  'Open G': ['D2', 'G2', 'D3', 'G3', 'B3', 'D4'],
  'DADGAD': ['D2', 'A2', 'D3', 'G3', 'A3', 'D4']
};

export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Notes with both sharps and flats for UI dropdowns
export const NOTES_WITH_FLATS = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'];

export const NUM_FRETS = 12;

export const FRETBOARD_STYLES = [
  {
    label: 'Chiaro',
    fretboard: '#fff',
    frets: '#bbb',
    strings: '#bbb',
    inlays: '#bbb',
    nut: '#555'
  },
  {
    label: 'Acero chiaro',
    fretboard: '#efd4a5',
    frets: '#cab0b0',
    strings: '#555',
    inlays: '#fff',
    nut: '#cab0b0'
  },
  {
    label: 'Acero medio',
    fretboard: '#d8ac85',
    frets: '#bbb',
    strings: '#555',
    inlays: '#fff',
    nut: '#bbb'
  },
  {
    label: 'Acero scuro',
    fretboard: '#e6b854',
    frets: '#ddd',
    strings: '#555',
    inlays: '#fff',
    nut: '#ddd'
  },
  {
    label: 'Ebano chiaro',
    fretboard: '#333',
    frets: 'lightgray',
    strings: '#777',
    inlays: '#fff',
    nut: 'lightgray'
  },
  {
    label: 'Ebano medio',
    fretboard: '#433',
    frets: 'lightgray',
    strings: '#777',
    inlays: '#fff',
    nut: 'lightgray'
  },
  {
    label: 'Palissandro',
    fretboard: '#381411',
    frets: '#eae8c2',
    strings: '#e0dc98',
    inlays: '#fff',
    nut: '#eae8c2'
  }
];
