import { Component, ChangeDetectionStrategy, OnInit, input, output, signal, computed, inject } from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import { LucidePencil, LucideTrash2, LucideSettings, LucideCopy } from '@lucide/angular';
import { FretboardItem, FretboardNote, FretboardOverlay } from '../../models/session.model';
import { Note } from 'tonal';
import { FretboardConfigDialogComponent, FretboardConfigDialogData, FretboardConfigDialogResult } from './fretboard-config-dialog.component';
import { FRETBOARD_STYLES, NUM_FRETS } from '../scale-visualization/constants';
import { UserSettingsService } from '../../services/user-settings.service';

interface FretPosition {
  string: number;
  fret: number;
  note: string;
}

@Component({
  selector: 'app-fretboard-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucidePencil, LucideTrash2, LucideSettings, LucideCopy],
  templateUrl: './fretboard-editor.component.html',
  styles: `
    :host {
      display: block;
    }
    
    svg circle, svg rect {
      transition: opacity 200ms cubic-bezier(0.4, 0, 0.2, 1),
                  fill 200ms cubic-bezier(0.4, 0, 0.2, 1);
    }
  `
})
export class FretboardEditorComponent implements OnInit {
  dialog = inject(Dialog);
  userSettingsService = inject(UserSettingsService);
  
  fretboardItem = input.required<FretboardItem>();
  update = output<FretboardItem>();
  delete = output<void>();
  clone = output<FretboardItem>();
  
  // Color palette
  colors = [
    {  value: '#ffee58', key: 'yellow' },
    {  value: '#ffa726', key: 'orange' },
    {  value: '#FF4136', key: 'red' },
    {  value: '#9e9e9e', key: 'grey' },
    {  value: '#ffffff', key: 'white' }
  ];
  
  selectedColor = signal<string>('yellow'); // default giallo
  
  // Fretboard styles for visualization
  fretboardStyles = FRETBOARD_STYLES;
  
  // SVG dimensions
  leftMargin = 40;
  rightMargin = 15;
  stringSpacing = 38;
  fretWidth = 80;
  
  strings = [0, 1, 2, 3, 4, 5];

  ngOnInit() {
    // Nothing to auto-initialize
  }

  // Computed frets based on fretShift
  frets = computed(() => {
    const shift = this.fretboardItem().fretboardConfig.fretShift || 0;
    return Array.from({ length: NUM_FRETS + 1 }, (_, i) => i + shift);
  });
  
  // Computed fret markers based on fretShift
  fretMarkers = computed(() => {
    const shift = this.fretboardItem().fretboardConfig.fretShift || 0;
    const allMarkers = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24];
    // Show only markers that fall within the visible fret range
    return allMarkers.filter(m => m >= shift && m <= shift + NUM_FRETS);
  });
  
  // Computed fret numbers to display
  fretNumbers = computed(() => {
    const shift = this.fretboardItem().fretboardConfig.fretShift || 0;
    const allFretNumbers = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24];
    // Show only fret numbers that fall within the visible fret range
    return allFretNumbers.filter(f => f >= shift && f <= shift + NUM_FRETS);
  });

  // Single computed for all fretboard colors based on current config
  fretboardColors = computed(() => {
    const color = this.fretboardItem().fretboardConfig.fretboardColor || '#fff';
    const style = this.fretboardStyles.find(s => s.fretboard === color) || this.fretboardStyles[0];
    return {
      frets: style.frets,
      nut: style.nut,
      strings: style.strings,
      inlays: style.inlays
    };
  });

  fretboardWidth = computed(() => this.leftMargin + (NUM_FRETS * this.fretWidth) + this.rightMargin);
  fretboardHeight = computed(() => (this.strings.length - 1) * this.stringSpacing + (this.stringSpacing * 2) + 10);

  // Generate all fret positions with note names
  allFretPositions = computed<FretPosition[]>(() => {
    const tuning = this.fretboardItem().fretboardConfig.tuning;
    const shift = this.fretboardItem().fretboardConfig.fretShift || 0;
    const positions: FretPosition[] = [];
    
    this.strings.forEach(stringNum => {
      this.frets().forEach(fret => {
        const openNote = tuning[5 - stringNum]; // Reverse order (string 0 is highest)
        const midiNote = Note.midi(openNote);
        if (midiNote !== null) {
          const actualFret = fret; // Fret value is already shifted
          const note = Note.fromMidi(midiNote + actualFret);
          positions.push({ string: stringNum, fret, note: Note.pitchClass(note) });
        }
      });
    });
    
    return positions;
  });

  isInFretRange(fret: number): boolean {
    const shift = this.fretboardItem().fretboardConfig.fretShift || 0;
    return fret >= shift && fret <= shift + NUM_FRETS;
  }

  getFretX(fret: number): number {
    const shift = this.fretboardItem().fretboardConfig.fretShift || 0;
    return this.leftMargin + ((fret - shift) * this.fretWidth);
  }

  getNoteX(fret: number): number {
    return this.getFretX(fret) - (this.fretWidth / 2);
  }

  getStringY(stringNum: number): number {
    // stringNum 0 = E4 (cantino) in alto, stringNum 5 = E2 (basso) in basso
    return this.stringSpacing + (stringNum * this.stringSpacing);
  }

  handleFretClick(event: MouseEvent, position: FretPosition): void {
    const isCtrlPressed = event.ctrlKey || event.metaKey;
    
    if (isCtrlPressed) {
      // Add or remove overlay
      this.toggleOverlay(position.string, position.fret);
    } else {
      // Add or remove note
      this.toggleNote(position.string, position.fret);
    }
  }

  toggleNote(string: number, fret: number): void {
    const item = this.fretboardItem();
    const existingIndex = item.notes.findIndex(n => n.string === string && n.fret === fret);
    
    if (existingIndex !== -1) {
      // Remove note
      const updatedNotes = item.notes.filter((_, i) => i !== existingIndex);
      this.update.emit({ ...item, notes: updatedNotes });
    } else {
      // Add note with selected color
      const newNote: FretboardNote = {
        string,
        fret,
        color: this.selectedColor()
      };
      this.update.emit({ ...item, notes: [...item.notes, newNote] });
    }
  }

  toggleOverlay(string: number, fret: number): void {
    const item = this.fretboardItem();
    const existingIndex = item.overlays.findIndex(o => o.string === string && o.fret === fret);
    
    if (existingIndex !== -1) {
      // Remove overlay
      const updatedOverlays = item.overlays.filter((_, i) => i !== existingIndex);
      this.update.emit({ ...item, overlays: updatedOverlays });
    } else {
      // Add overlay
      const newOverlay: FretboardOverlay = { string, fret };
      this.update.emit({ ...item, overlays: [...item.overlays, newOverlay] });
    }
  }

  hasNote(string: number, fret: number): FretboardNote | undefined {
    return this.fretboardItem().notes.find(n => n.string === string && n.fret === fret);
  }

  hasOverlay(string: number, fret: number): boolean {
    return this.fretboardItem().overlays.some(o => o.string === string && o.fret === fret);
  }

  getColorValue(colorKey: string): string {
    const color = this.colors.find(c => c.key === colorKey);
    return color?.value || '#fbbf24'; // default yellow
  }

  openConfigModal(): void {
    const item = this.fretboardItem();
    const dialogRef = this.dialog.open<FretboardConfigDialogResult, FretboardConfigDialogData>(
      FretboardConfigDialogComponent,
      {
        data: {
          fretShift: item.fretboardConfig.fretShift || 0,
          fretboardColor: item.fretboardConfig.fretboardColor || '#fff',
          tuning: item.fretboardConfig.tuning
        }
      }
    );

    dialogRef.closed.subscribe(result => {
      if (result) {
        this.update.emit({
          ...item,
          fretboardConfig: {
            ...item.fretboardConfig,
            fretShift: result.fretShift,
            fretboardColor: result.fretboardColor,
            tuning: result.tuning
          }
        });
      }
    });
  }

  handleDelete(): void {
    this.delete.emit();
  }

  handleClone(): void {
    this.clone.emit(this.fretboardItem());
  }
}
