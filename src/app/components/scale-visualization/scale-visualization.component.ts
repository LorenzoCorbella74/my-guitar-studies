import { Component, ChangeDetectionStrategy, OnInit, input, output, signal, computed, inject } from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import { LucidePencil, LucideTrash2, LucideEye, LucideEyeOff, LucideSettings, LucideNetwork, LucideLayers } from '@lucide/angular';
import { ScaleItem, ArpeggioItem, ChordItem } from '../../models/session.model';
import { Scale, ScaleType, Chord, ChordType, Interval, Note } from 'tonal';
import { ConfigurationDialogComponent, ConfigurationDialogData, ConfigurationDialogResult } from './dialogs/configuration-dialog.component';
import { DisplayConfigDialogComponent, DisplayConfigDialogData, DisplayConfigDialogResult } from './dialogs/display-config-dialog.component';
import { ScaleRelationsDialogComponent, ScaleRelationsDialogData } from './dialogs/scale-relations-dialog.component';
import { OverlayDialogComponent, OverlayDialogData, OverlayDialogResult, OverlayItem } from './dialogs/overlay-dialog.component';

const STANDARD_TUNINGS = {
  'Standard (E)': ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
  'Drop D': ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'],
  'Drop C': ['C2', 'G2', 'C3', 'F3', 'A3', 'D4'],
  'Half Step Down': ['Eb2', 'Ab2', 'Db3', 'Gb3', 'Bb3', 'Eb4'],
  'Whole Step Down': ['D2', 'G2', 'C3', 'F3', 'A3', 'D4'],
  'Open D': ['D2', 'A2', 'D3', 'F#3', 'A3', 'D4'],
  'Open G': ['D2', 'G2', 'D3', 'G3', 'B3', 'D4'],
  'DADGAD': ['D2', 'A2', 'D3', 'G3', 'A3', 'D4']
};

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NUM_FRETS = 12;

interface FretNote {
  string: number;
  fret: number;
  note: string;
  isScaleNote: boolean;
  scaleIndex?: number;
  octave?: number;
}

@Component({
  selector: 'app-scale-visualization',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucidePencil, LucideTrash2, LucideEye, LucideEyeOff, LucideSettings, LucideNetwork, LucideLayers],
  template: `
    <div class="card bg-base-100 shadow-md">
      <div class="card-body">
        @if (!hasConfig()) {
          <!-- Initial prompt to configure -->
          <div class="text-center py-8">
            <p class="text-base-content/60 mb-4">
              Configura la visualizzazione @if (itemType() === 'scale') { della scala }
              @else if (itemType() === 'arpeggio') { dell'arpeggio }
              @else { dell'accordo }
            </p>
            <button class="btn btn-primary" (click)="openModal()">
              @if (itemType() === 'scale') { Configura scala }
              @else if (itemType() === 'arpeggio') { Configura arpeggio }
              @else { Configura accordo }
            </button>
          </div>
        } @else {
          <!-- Header with edit/delete buttons -->
          <div>
            <div class="flex justify-between items-center mb-2">
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <h3 class="text-lg font-semibold">
                    {{ displayTitle() }}
                  </h3>
                  <div class="flex gap-1">
                    <button
                      type="button"
                      class="btn btn-ghost btn-sm btn-square"
                      (click)="toggleAlternateNotes()"
                      [attr.aria-label]="areAlternateNotesVisible() ? 'Nascondi 2°,4°,6° nota' : 'Mostra 2°,4°,6° nota'"
                      [title]="areAlternateNotesVisible() ? 'Nascondi 2°,4°,6° nota' : 'Mostra 2°,4°,6° nota'"
                    >
                      @if (areAlternateNotesVisible()) {
                        <svg lucideEye class="w-4 h-4"></svg>
                      } @else {
                        <svg lucideEyeOff class="w-4 h-4"></svg>
                      }
                    </button>
                    <button
                      type="button"
                      class="btn btn-ghost btn-sm btn-square"
                      (click)="openConfigModal()"
                      aria-label="Configura visualizzazione"
                      title="Configura visualizzazione"
                    >
                      <svg lucideSettings class="w-4 h-4"></svg>
                    </button>
                    @if (itemType() === 'scale') {
                      <button
                        type="button"
                        class="btn btn-ghost btn-sm btn-square"
                        (click)="openRelationsModal()"
                        aria-label="Relazioni scala"
                        title="Relazioni scala"
                      >
                        <svg lucideNetwork class="w-4 h-4"></svg>
                      </button>
                    }
                    <button
                      type="button"
                      class="btn btn-ghost btn-sm btn-square"
                      (click)="openOverlayModal()"
                      aria-label="Aggiungi sovrapposizione"
                      title="Aggiungi sovrapposizione scala/accordo"
                    >
                      <svg lucideLayers class="w-4 h-4"></svg>
                    </button>
                  </div>
                </div>
                <p class="text-sm text-base-content/60">
                  {{ displaySubtitle() }} - {{ getTuningName() }}
                </p>
              </div>

              <!-- Notes Toggle -->
              <div class="flex gap-1 mx-4">
                @for (noteInfo of notesWithDegrees(); track $index) {
                  <button
                    type="button"
                    class="btn btn-xs flex flex-col gap-0 h-auto py-1 px-2"
                    [class.btn-primary]="isNoteVisible(noteInfo.note)"
                    [class.btn-ghost]="!isNoteVisible(noteInfo.note)"
                    (click)="toggleNote(noteInfo.note)"
                  >
                    <span class="text-[10px] leading-tight opacity-60">{{ noteInfo.degree }}</span>
                    <span class="text-xs font-semibold leading-tight">{{ noteInfo.note }}</span>
                  </button>
                }
              </div>

              <div class="flex gap-2">
                <button
                  class="btn btn-ghost btn-sm btn-square"
                  (click)="openModal()"
                  aria-label="Modifica configurazione"
                >
                  <svg lucidePencil class="w-4 h-4"></svg>
                </button>
                <button
                  class="btn btn-ghost btn-sm btn-square"
                  (click)="handleDelete()"
                  aria-label="Elimina"
                >
                  <svg lucideTrash2 class="w-4 h-4"></svg>
                </button>
              </div>
            </div>
          </div>

          <!-- SVG Fretboard -->
          <div class="overflow-x-auto">
            <svg
              [attr.viewBox]="'0 0 ' + fretboardWidth() + ' ' + fretboardHeight()"
              class="w-full"
            >
              <!-- Fretboard background (rendered first, behind everything) -->
              <rect
                [attr.x]="leftMargin"
                [attr.y]="getStringY(5)"
                [attr.width]="fretboardWidth() - leftMargin - rightMargin"
                [attr.height]="getStringY(0) - getStringY(5)"
                [attr.fill]="config().fretboardColor || '#fff'"
                opacity="0.95"
                style="pointer-events: none;"
              />

              <!-- Frets (vertical lines) -->
              @for (fret of frets; track fret) {
                <line
                  [attr.x1]="getFretX(fret)"
                  [attr.y1]="getStringY(5)"
                  [attr.x2]="getFretX(fret)"
                  [attr.y2]="getStringY(0)"
                  [attr.stroke]="fret === 0 ? fretboardColors().nut : fretboardColors().frets"
                  [attr.stroke-width]="fret === 0 ? 6 : 3"
                />
              }

              <!-- Strings (horizontal lines) -->
              @for (stringNum of strings; track stringNum) {
                <line
                  [attr.x1]="leftMargin"
                  [attr.y1]="getStringY(stringNum)"
                  [attr.x2]="fretboardWidth() - rightMargin"
                  [attr.y2]="getStringY(stringNum)"
                  [attr.stroke]="fretboardColors().strings"
                  stroke-width="1"
                />
              }

              <!-- Fret markers -->
              @for (marker of fretMarkers; track marker) {
                <circle
                  [attr.cx]="getFretX(marker - 1) + fretWidth / 2"
                  [attr.cy]="(getStringY(0) + getStringY(5)) / 2"
                  r="7"
                  [attr.fill]="fretboardColors().inlays"
                  opacity="0.8"
                />
              }

              <!-- Double marker at 12th fret -->
              <circle
                [attr.cx]="getFretX(11) + fretWidth / 2"
                [attr.cy]="(getStringY(0) + getStringY(5)) / 2 - 40"
                r="7"
                [attr.fill]="fretboardColors().inlays"
                opacity="0.8"
              />
              <circle
                [attr.cx]="getFretX(11) + fretWidth / 2"
                [attr.cy]="(getStringY(0) + getStringY(5)) / 2 + 40"
                r="7"
                [attr.fill]="fretboardColors().inlays"
                opacity="0.8"
              />

              <!-- Overlay Notes (rendered behind main notes) -->
              @for (fretNote of overlayFretNotes(); track 'overlay-' + fretNote.string + '-' + fretNote.fret) {
                @if (fretNote.isScaleNote && isInFretRange(fretNote.fret)) {
                  <circle
                    [attr.cx]="getNoteX(fretNote.fret)"
                    [attr.cy]="getStringY(fretNote.string)"
                    r="21"
                    fill="#000"
                    opacity="0.4"
                  />
                }
              }

              <!-- Main Notes -->
              @for (fretNote of fretNotes(); track fretNote.string + '-' + fretNote.fret) {
                @if (fretNote.isScaleNote && isNoteVisible(fretNote.note) && isInFretRange(fretNote.fret)) {
                  <g>
                    <circle
                      [attr.cx]="getNoteX(fretNote.fret)"
                      [attr.cy]="getStringY(fretNote.string)"
                      r="16"
                      [attr.fill]="getNoteColor(fretNote.scaleIndex, fretNote.note, fretNote.octave)"
                      [attr.opacity]="config().noteOpacity ?? 0.9"
                    />
                    @if (config().labelMode !== 'none') {
                      <text
                        [attr.x]="getNoteX(fretNote.fret)"
                        [attr.y]="getStringY(fretNote.string)"
                        text-anchor="middle"
                        dominant-baseline="middle"
                        class="text-sm font-semibold fill-white"
                      >
                        @if (config().labelMode === 'note') {
                          {{ fretNote.note }}
                        } @else if (config().labelMode === 'degree' && fretNote.scaleIndex !== undefined) {
                          {{ notesWithDegrees()[fretNote.scaleIndex]?.degree }}
                        }
                      </text>
                    }
                  </g>
                }
              }

              <!-- Fret Numbers -->
              @for (fretNum of [3, 5, 7, 9, 12]; track fretNum) {
                <text
                  [attr.x]="getFretX(fretNum - 1) + fretWidth / 2"
                  [attr.y]="getStringY(0) + 35"
                  text-anchor="middle"
                  class="text-sm"
                  fill="#999"
                >
                  {{ fretNum }}
                </text>
              }
            </svg>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
  `
})
export class ScaleVisualizationComponent implements OnInit {
  dialog = inject(Dialog);
  
  scaleItem = input.required<ScaleItem | ArpeggioItem | ChordItem>();
  update = output<ScaleItem | ArpeggioItem | ChordItem>();
  delete = output<void>();
  cancelFirstConfig = output<void>();

  isFirstConfig = signal(false);
  
  // Overlay state
  overlays = signal<OverlayItem[]>([]);

  ngOnInit() {
    // Auto-open modal if item has no configuration
    if (!this.hasConfig()) {
      this.isFirstConfig.set(true);
      // Use setTimeout to ensure the component is fully initialized
      setTimeout(() => this.openModal(), 0);
    }
  }
  
  // Color palette for scale degrees
  noteColors = [
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#f59e0b', // amber
    '#10b981', // emerald
    '#3b82f6', // blue
    '#f97316', // orange
    '#06b6d4', // cyan
    '#6366f1', // indigo
    '#14b8a6', // teal
    '#a855f7', // purple
    '#eab308', // yellow
    '#ef4444'  // red
  ];
  
  // Fretboard styles for visualization
  fretboardStyles = [
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
  
  // SVG dimensions
  leftMargin = 40;
  rightMargin = 15;
  stringSpacing = 38;
  fretWidth = 80;
  
  strings = [0, 1, 2, 3, 4, 5];
  frets = Array.from({ length: NUM_FRETS + 1 }, (_, i) => i);
  fretMarkers = [3, 5, 7, 9];

  config = computed(() => this.scaleItem().config);
  itemType = computed(() => this.scaleItem().type);
  
  // Single computed for all fretboard colors based on current config
  fretboardColors = computed(() => {
    const color = this.config().fretboardColor || '#fff';
    const style = this.fretboardStyles.find(s => s.fretboard === color) || this.fretboardStyles[0];
    return {
      frets: style.frets,
      nut: style.nut,
      strings: style.strings,
      inlays: style.inlays
    };
  });
  
  hasConfig = computed(() => {
    const cfg = this.config();
    const type = this.itemType();
    return cfg && cfg.tuning && cfg.tuning.length > 0 && cfg.root && 
           (type === 'scale' ? !!cfg.scaleName : !!cfg.chordType);
  });

  displayTitle = computed(() => {
    if (!this.hasConfig()) return '';
    const cfg = this.config();
    const type = this.itemType();
    if (type === 'scale') {
      return `${cfg.root} ${cfg.scaleName}`;
    } else {
      return `${cfg.root}${cfg.chordType}`;
    }
  });

  displaySubtitle = computed(() => {
    const type = this.itemType();
    if (type === 'scale') return 'Scala';
    if (type === 'arpeggio') return 'Arpeggio';
    return 'Accordo';
  });

  fretboardWidth = computed(() => this.leftMargin + (NUM_FRETS * this.fretWidth) + this.rightMargin);
  fretboardHeight = computed(() => (this.strings.length - 1) * this.stringSpacing + (this.stringSpacing * 2) + 30);

  scaleNotes = computed(() => {
    if (!this.hasConfig()) return [];
    const cfg = this.config();
    const type = this.itemType();
    
    if (type === 'scale') {
      const scale = Scale.get(`${cfg.root} ${cfg.scaleName}`);
      return scale.notes;
    } else {
      const chord = Chord.get(`${cfg.root}${cfg.chordType}`);
      return chord.notes;
    }
  });

  notesWithDegrees = computed(() => {
    if (!this.hasConfig()) return [];
    const notes = this.scaleNotes();
    const cfg = this.config();
    const root = cfg.root;
    
    return notes.map(note => {
      const noteName = note.replace(/[0-9]/g, '');
      const degree = Interval.distance(root, noteName);
      return {
        note: noteName, // Keep original note name (with flats if present)
        degree: degree || '1P'
      };
    });
  });

  fretNotes = computed(() => {
    if (!this.hasConfig()) return [];
    
    const cfg = this.config();
    const scaleNotesArray = this.scaleNotes().map(n => n.replace(/[0-9]/g, ''));
    
    // Create map using chroma (0-11) as key for enharmonic comparison
    const scaleNotesMap = new Map<number, { originalNote: string; index: number }>();
    scaleNotesArray.forEach((note, index) => {
      const chroma = Note.chroma(note);
      if (chroma !== undefined) {
        scaleNotesMap.set(chroma, { originalNote: note, index });
      }
    });
    
    const notes: FretNote[] = [];

    cfg.tuning.forEach((openNote, stringIndex) => {
      const openNoteName = openNote.replace(/[0-9]/g, '');
      const openChroma = Note.chroma(openNoteName);
      
      // Extract octave from open note (e.g., "E2" -> 2)
      const openOctave = parseInt(openNote.match(/\d+/)?.[0] || '0', 10);
      
      if (openChroma === undefined) return;

      for (let fret = 0; fret <= NUM_FRETS; fret++) {
        const noteChroma = (openChroma + fret) % 12;
        const scaleNoteData = scaleNotesMap.get(noteChroma);
        const isScaleNote = !!scaleNoteData;
        
        // Calculate octave: add 1 for every 12 semitones, adjusting for chromatic wraparound
        const totalSemitones = openChroma + fret;
        const octaveOffset = Math.floor(totalSemitones / 12);
        const currentOctave = openOctave + octaveOffset;
        
        notes.push({
          string: stringIndex,
          fret,
          note: isScaleNote ? scaleNoteData.originalNote : NOTES[noteChroma],
          isScaleNote,
          scaleIndex: isScaleNote ? scaleNoteData.index : undefined,
          octave: currentOctave
        });
      }
    });

    return notes;
  });

  // Scale relationships (only for scales)
  scaleChords = computed(() => {
    if (!this.hasConfig() || this.itemType() !== 'scale') return [];
    const cfg = this.config();
    return Scale.scaleChords(`${cfg.root} ${cfg.scaleName}`);
  });

  extendedScales = computed(() => {
    if (!this.hasConfig() || this.itemType() !== 'scale') return [];
    const cfg = this.config();
    return Scale.extended(`${cfg.root} ${cfg.scaleName}`);
  });

  reducedScales = computed(() => {
    if (!this.hasConfig() || this.itemType() !== 'scale') return [];
    const cfg = this.config();
    return Scale.reduced(`${cfg.root} ${cfg.scaleName}`);
  });

  overlayFretNotes = computed(() => {
    if (!this.hasConfig() || this.overlays().length === 0) return [];
    
    const cfg = this.config();
    const allOverlayNotes: FretNote[] = [];
    
    // Collect all notes from all overlays
    const overlayNotesSet = new Set<number>();
    
    this.overlays().forEach(overlay => {
      let notes: string[] = [];
      
      if (overlay.type === 'scale') {
        const scale = Scale.get(`${overlay.root} ${overlay.name}`);
        notes = scale.notes;
      } else {
        const chord = Chord.get(`${overlay.root}${overlay.name}`);
        notes = chord.notes;
      }
      
      notes.forEach(note => {
        const noteName = note.replace(/[0-9]/g, '');
        const chroma = Note.chroma(noteName);
        if (chroma !== undefined) {
          overlayNotesSet.add(chroma);
        }
      });
    });
    
    // Generate fret notes for overlay
    cfg.tuning.forEach((openNote, stringIndex) => {
      const openNoteName = openNote.replace(/[0-9]/g, '');
      const openChroma = Note.chroma(openNoteName);
      
      if (openChroma === undefined) return;
      
      for (let fret = 0; fret <= NUM_FRETS; fret++) {
        const noteChroma = (openChroma + fret) % 12;
        const isOverlayNote = overlayNotesSet.has(noteChroma);
        
        if (isOverlayNote) {
          allOverlayNotes.push({
            string: stringIndex,
            fret,
            note: NOTES[noteChroma],
            isScaleNote: true
          });
        }
      }
    });
    
    return allOverlayNotes;
  });

  getTuningName(): string {
    const cfg = this.config();
    if (!cfg || !cfg.tuning) return '';
    
    const tuningStr = cfg.tuning.join(',');
    for (const [name, tuning] of Object.entries(STANDARD_TUNINGS)) {
      if (tuning.join(',') === tuningStr) {
        return name;
      }
    }
    return 'Custom';
  }

  getFretX(fret: number): number {
    return this.leftMargin + (fret * this.fretWidth);
  }

  getStringY(stringIndex: number): number {
    // Inverti l'ordine: stringa 0 (E grave) in basso, stringa 5 (E cantino) in alto
    const invertedIndex = (this.strings.length - 1) - stringIndex;
    return this.stringSpacing + (invertedIndex * this.stringSpacing);
  }

  getNoteX(fret: number): number {
    if (fret === 0) {
      // Corde a vuoto: a sinistra del capotasto
      return this.getFretX(0) - 20;
    } else {
      // Note sui tasti: al centro tra due frets
      return this.getFretX(fret - 1) + this.fretWidth / 2;
    }
  }

  getNoteColor(scaleIndex: number | undefined, noteName: string, octave?: number): string {
    const colorMode = this.config().colorMode;
    
    if (colorMode === 'monocolor') {
      return this.noteColors[0];
    }
    
    if (colorMode === 'octaves') {
      // Color by octave: all notes in same octave have same color
      if (octave === undefined) return this.noteColors[0];
      return this.noteColors[octave % this.noteColors.length];
    }
    
    if (colorMode === 'triads') {
      // Specific colors for triad degrees:
      // Tonic (1st degree, index 0) = yellow
      // Third (3rd degree, index 2) = orange
      // Fifth (5th degree, index 4) = red
      // All others = blue
      if (scaleIndex === undefined) return '#3b82f6'; // blue for non-scale notes
      
      if (scaleIndex === 0) return '#eab308'; // yellow - tonic
      if (scaleIndex === 2) return '#f97316'; // orange - third
      if (scaleIndex === 4) return '#ef4444'; // red - fifth
      return '#3b82f6'; // blue - all other scale degrees
    }
    
    // 'all' mode - color by scale degree
    if (scaleIndex === undefined) return this.noteColors[0];
    return this.noteColors[scaleIndex % this.noteColors.length];
  }

  isNoteVisible(note: string): boolean {
    const item = this.scaleItem();
    const noteVis = item.noteVisibility || {};
    // Default to visible if not specified
    return noteVis[note] !== false;
  }

  isInFretRange(fret: number): boolean {
    const cfg = this.config();
    const startFret = cfg.startFret ?? 0;
    const endFret = cfg.endFret ?? 12;
    return fret >= startFret && fret <= endFret;
  }

  toggleNote(note: string): void {
    const item = this.scaleItem();
    const currentVisibility = item.noteVisibility || {};
    const isCurrentlyVisible = currentVisibility[note] !== false;
    
    const updatedItem = {
      ...item,
      noteVisibility: {
        ...currentVisibility,
        [note]: !isCurrentlyVisible
      }
    };
    
    this.update.emit(updatedItem);
  }

  areAlternateNotesVisible(): boolean {
    const notes = this.notesWithDegrees();
    const item = this.scaleItem();
    const noteVis = item.noteVisibility || {};
    
    // Check if 2nd, 4th, 6th notes (indices 1, 3, 5) are visible
    const alternateIndices = [1, 3, 5];
    return alternateIndices.some(idx => {
      if (idx < notes.length) {
        const note = notes[idx].note;
        return noteVis[note] !== false;
      }
      return false;
    });
  }

  toggleAlternateNotes(): void {
    const notes = this.notesWithDegrees();
    const item = this.scaleItem();
    const currentVisibility = item.noteVisibility || {};
    
    // Toggle 2nd, 4th, 6th notes (indices 1, 3, 5)
    const alternateIndices = [1, 3, 5];
    const shouldHide = this.areAlternateNotesVisible();
    
    const newVisibility = { ...currentVisibility };
    alternateIndices.forEach(idx => {
      if (idx < notes.length) {
        const note = notes[idx].note;
        newVisibility[note] = !shouldHide;
      }
    });
    
    const updatedItem = {
      ...item,
      noteVisibility: newVisibility
    };
    
    this.update.emit(updatedItem);
  }

  openConfigModal(): void {
    const cfg = this.config();
    
    const dialogData: DisplayConfigDialogData = {
      noteOpacity: cfg.noteOpacity ?? 0.9,
      labelMode: cfg.labelMode || 'note',
      colorMode: cfg.colorMode || 'all',
      startFret: cfg.startFret ?? 0,
      endFret: cfg.endFret ?? 12,
      fretboardColor: cfg.fretboardColor || '#fff'
    };

    const dialogRef = this.dialog.open<DisplayConfigDialogResult, DisplayConfigDialogData>(
      DisplayConfigDialogComponent,
      {
        data: dialogData,
        disableClose: false,
        hasBackdrop: true,
        width: '48rem',
        maxWidth: '90vw',
        maxHeight: '90vh'
      }
    );

    dialogRef.closed.subscribe(result => {
      if (result) {
        const updatedItem = {
          ...this.scaleItem(),
          config: {
            ...this.config(),
            noteOpacity: result.noteOpacity,
            labelMode: result.labelMode,
            colorMode: result.colorMode,
            startFret: result.startFret,
            endFret: result.endFret,
            fretboardColor: result.fretboardColor
          }
        };
        
        this.update.emit(updatedItem);
      }
    });
  }

  openRelationsModal(): void {
    const dialogData: ScaleRelationsDialogData = {
      title: this.displayTitle(),
      scaleChords: this.scaleChords(),
      extendedScales: this.extendedScales(),
      reducedScales: this.reducedScales()
    };

    this.dialog.open(ScaleRelationsDialogComponent, {
      data: dialogData,
      disableClose: false,
      hasBackdrop: true,
      width: '56rem',
      maxWidth: '90vw',
      maxHeight: '90vh'
    });
  }

  openOverlayModal(): void {
    const dialogData: OverlayDialogData = {
      overlays: this.overlays()
    };

    const dialogRef = this.dialog.open<OverlayDialogResult, OverlayDialogData>(
      OverlayDialogComponent,
      {
        data: dialogData,
        disableClose: false,
        hasBackdrop: true,
        width: '40rem',
        maxWidth: '90vw',
        maxHeight: '90vh'
      }
    );

    dialogRef.closed.subscribe(result => {
      if (result) {
        this.overlays.set(result.overlays);
      }
    });
  }

  openModal(): void {
    const dialogData: ConfigurationDialogData = {
      itemType: this.itemType(),
      currentConfig: this.hasConfig() ? {
        tuning: this.config().tuning,
        root: this.config().root,
        scaleName: this.config().scaleName,
        chordType: this.config().chordType
      } : undefined
    };

    const dialogRef = this.dialog.open<ConfigurationDialogResult, ConfigurationDialogData>(
      ConfigurationDialogComponent,
      {
        data: dialogData,
        disableClose: this.isFirstConfig(),
        hasBackdrop: true,
        width: '48rem',
        maxWidth: '90vw',
        maxHeight: '90vh'
      }
    );

    dialogRef.closed.subscribe(result => {
      if (result) {
        const type = this.itemType();
        
        const baseConfig = {
          tuning: result.tuning,
          root: result.root,
          labelMode: 'note' as const,
          colorMode: 'all' as const,
          showChordDegrees: false,
          noteOpacity: 0.9,
          startFret: 0,
          endFret: 12,
          fretboardColor: '#fff'
        };

        const config = type === 'scale' 
          ? { ...baseConfig, scaleName: result.scaleName! }
          : { ...baseConfig, chordType: result.chordType! };

        const updatedItem = {
          ...this.scaleItem(),
          config
        };

        this.isFirstConfig.set(false);
        this.update.emit(updatedItem);
      } else if (this.isFirstConfig() && !this.hasConfig()) {
        // If closing without config on first attempt, emit cancel event for silent deletion
        this.cancelFirstConfig.emit();
      }
    });
  }

  handleDelete(): void {
    this.delete.emit();
  }
}
