import { Component, ChangeDetectionStrategy, OnInit, input, output, signal, computed, inject } from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import { LucidePencil, LucideTrash2, LucideEye, LucideEyeOff, LucideSettings, LucideNetwork, LucideLayers } from '@lucide/angular';
import { ScaleItem, ArpeggioItem, ChordItem } from '../../models/session.model';
import { Scale, ScaleType, Chord, ChordType, Interval, Note } from 'tonal';
import { ConfigurationDialogComponent, ConfigurationDialogData, ConfigurationDialogResult } from './dialogs/configuration-dialog.component';
import { DisplayConfigDialogComponent, DisplayConfigDialogData, DisplayConfigDialogResult } from './dialogs/display-config-dialog.component';
import { ScaleRelationsDialogComponent, ScaleRelationsDialogData } from './dialogs/scale-relations-dialog.component';
import { OverlayDialogComponent, OverlayDialogData, OverlayDialogResult, OverlayItem } from './dialogs/overlay-dialog.component';
import { DEGREE_COLOURS, OCTAVE_COLOURS, STANDARD_TUNINGS, NOTES, NUM_FRETS, FRETBOARD_STYLES } from './constants';

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
  templateUrl: './scale-visualization.component.html',
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
  
  // Fretboard styles for visualization
  fretboardStyles = FRETBOARD_STYLES;
  
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
      return DEGREE_COLOURS['1P'];
    }
    
    if (colorMode === 'octaves') {
      // Color by octave: each octave has its own color
      if (octave === undefined) return DEGREE_COLOURS['1P'];
      return OCTAVE_COLOURS[octave] || DEGREE_COLOURS['1P'];
    }
    
    if (colorMode === 'triads') {
      // Specific colors for triad degrees:
      // Tonic (1st degree, index 0) = yellow
      // Third (3rd degree, index 2) = orange
      // Fifth (5th degree, index 4) = red
      // All others = blue
      if (scaleIndex === undefined) return '#3b82f6';
      
      if (scaleIndex === 0) return DEGREE_COLOURS['1P'];
      if (scaleIndex === 2) return DEGREE_COLOURS['3M'];
      if (scaleIndex === 4) return DEGREE_COLOURS['5P'];
      return '#3b82f6';
    }
    
    // 'all' mode - color by scale degree using DEGREE_COLOURS
    if (scaleIndex === undefined) return DEGREE_COLOURS['1P'];
    const degree = this.notesWithDegrees()[scaleIndex]?.degree || '1P';
    return DEGREE_COLOURS[degree as keyof typeof DEGREE_COLOURS] || DEGREE_COLOURS['1P'];
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
          noteOpacity: 1.0,
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
