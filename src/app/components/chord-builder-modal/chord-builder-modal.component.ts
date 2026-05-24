import { Component, ChangeDetectionStrategy, input, output, signal, computed, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChordDefinition } from '../../models/session.model';
import { LucideWand2 } from '@lucide/angular';
import { Chord, Note } from 'tonal';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

@Component({
  selector: 'app-chord-builder-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, LucideWand2],
  template: `
    @if (isOpen()) {
      <div class="modal modal-open">
        <div class="modal-box max-w-2xl">
          <h3 class="font-bold text-lg mb-4">
            {{ editingChord() ? 'Modifica Accordo' : 'Nuovo Accordo' }}
          </h3>
          
          <form (submit)="saveChord($event)">
            <!-- Chord Name and Starting Fret -->
            <div class="grid grid-cols-2 gap-4 mb-4">
              <div class="form-control">
                <label class="label">
                  <span class="label-text">Nome accordo</span>
                </label>
                <input
                  type="text"
                  class="input input-bordered"
                  [(ngModel)]="tempName"
                  name="chordName"
                  placeholder="es. Em7, Cmaj7"
                  required
                />
              </div>
              
              <div class="form-control">
                <label class="label">
                  <span class="label-text">Tasto iniziale</span>
                </label>
                <input
                  type="number"
                  class="input input-bordered"
                  [(ngModel)]="tempStartFret"
                  name="startFret"
                  min="1"
                  max="12"
                  required
                />
              </div>
            </div>
            
            <!-- Interactive Fretboard -->
            <div class="mb-4">
                <div class="flex items-center justify-between mb-2">
                    <div>
                        <p class="label-text">Clicca sui tasti per aggiungere/rimuovere note (max 6).</p>
                        <p class="label-text">Clicca sul nome della corda per cambiare stato (X/O/•)</p>
                        <p class="label-text text-info">Tieni premuto Ctrl/Cmd e clicca per aggiungere/rimuovere barrè</p>
                    </div>
                    <p class="label-text-alt">Note selezionate: {{ selectedNotesCount() }}/6</p>
                </div>
           
              <div class="bg-base-200 rounded-lg p-4 flex justify-center">
                <svg [attr.viewBox]="'0 0 ' + svgWidth + ' ' + svgHeight" class="w-full mx-auto" style="max-width: 550px;">
                  <!-- String labels with status indicators (clickable) -->
                  @for (stringLabel of stringLabels; track $index; let i = $index) {
                    <g (click)="cycleStringStatus(i)" class="cursor-pointer">
                      <!-- Background circle -->
                      <circle
                        [attr.cx]="getStringX(i)"
                        [attr.cy]="20"
                        r="14"
                        [class.fill-error]="tempStrings()[i] === 'x'"
                        [class.fill-success]="tempStrings()[i] === 'o'"
                        [class.fill-base-300]="typeof tempStrings()[i] === 'number'"
                        class="opacity-80"
                      />
                      <!-- String label -->
                      <text
                        [attr.x]="getStringX(i)"
                        [attr.y]="20"
                        text-anchor="middle"
                        dominant-baseline="middle"
                        class="text-sm font-semibold pointer-events-none"
                        [class.fill-error-content]="tempStrings()[i] === 'x'"
                        [class.fill-success-content]="tempStrings()[i] === 'o'"
                        [class.fill-base-content]="typeof tempStrings()[i] === 'number'"
                      >
                        @if (tempStrings()[i] === 'x') {
                          X
                        } @else if (tempStrings()[i] === 'o') {
                          O
                        } @else {
                          {{ stringLabel }}
                        }
                      </text>
                    </g>
                  }
                  
                  <!-- Frets (horizontal lines) -->
                  @for (fret of [0, 1, 2, 3, 4, 5]; track fret) {
                    <line
                      [attr.x1]="stringStartX"
                      [attr.y1]="fretStartY + fret * fretSpacing"
                      [attr.x2]="getStringX(5)"
                      [attr.y2]="fretStartY + fret * fretSpacing"
                      class="stroke-base-content"
                      [attr.stroke-width]="fret === 0 ? 3 : 1"
                    />
                  }
                  
                  <!-- Strings (vertical lines) -->
                  @for (string of [0, 1, 2, 3, 4, 5]; track string) {
                    <line
                      [attr.x1]="getStringX(string)"
                      [attr.y1]="fretStartY"
                      [attr.x2]="getStringX(string)"
                      [attr.y2]="fretStartY + 5 * fretSpacing"
                      class="stroke-base-content"
                      stroke-width="2"
                    />
                  }
                  
                  <!-- Fret numbers -->
                  @for (fretNum of [1, 3, 5]; track fretNum) {
                    <text
                      [attr.x]="stringStartX - 30"
                      [attr.y]="fretStartY + (fretNum - 0.5) * fretSpacing"
                      text-anchor="middle"
                      dominant-baseline="middle"
                      class="text-xs fill-base-content"
                    >
                      {{ tempStartFret() + (fretNum - 1) }}
                    </text>
                  }
                  
                  <!-- Interactive click areas -->
                  @for (string of [0, 1, 2, 3, 4, 5]; track string) {
                    @for (fret of [1, 2, 3, 4, 5]; track fret) {
                      <rect
                        [attr.x]="getStringX(string) - fretSpacing / 2"
                        [attr.y]="fretStartY + (fret - 1) * fretSpacing"
                        [attr.width]="fretSpacing"
                        [attr.height]="fretSpacing"
                        class="fill-transparent cursor-pointer hover:fill-primary/10"
                        (click)="handleFretClick($event, string, fret)"
                      />
                    }
                  }
                  
                  <!-- Barres -->
                  @for (fret of [1, 2, 3, 4, 5]; track fret) {
                    @for (barreGroup of getBarreGroupsForFret(fret); track $index) {
                      <rect
                        [attr.x]="getStringX(barreGroup.fromString) - 8"
                        [attr.y]="fretStartY + (fret - 0.5) * fretSpacing - 8"
                        [attr.width]="getStringX(barreGroup.toString) - getStringX(barreGroup.fromString) + 16"
                        [attr.height]="16"
                        class="fill-primary pointer-events-none"
                        rx="8"
                      />
                    }
                  }
                  
                  <!-- Selected notes -->
                  @for (string of [0, 1, 2, 3, 4, 5]; track string) {
                    @for (fret of [1, 2, 3, 4, 5]; track fret) {
                      @if (isNoteSelected(string, fret)) {
                        <circle
                          [attr.cx]="getStringX(string)"
                          [attr.cy]="fretStartY + (fret - 0.5) * fretSpacing"
                          r="15"
                          class="fill-primary pointer-events-none"
                        />
                      }
                    }
                  }
                </svg>
              </div>
            </div>
            
            <!-- Actions Row -->
            <div class="flex items-center justify-between gap-4">
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="btn btn-secondary btn-sm"
                  (click)="detectChordName()"
                  [disabled]="selectedNotesCount() === 0"
                >
                  <svg lucideWand2 class="w-4 h-4"></svg>
                  Rileva nome accordo
                </button>
                @if (detectedChordName()) {
                  <span class="text-sm">
                    Rilevato: <strong>{{ detectedChordName() }}</strong>
                  </span>
                }
              </div>
              
              <div class="flex gap-2">
                <button type="button" class="btn btn-sm" (click)="cancel()">
                  Annulla
                </button>
                <button
                  type="submit"
                  class="btn btn-dash btn-primary btn-sm"
                  [disabled]="!canSave()"
                >
                  {{ editingChord() ? 'Aggiorna' : 'Aggiungi' }}
                </button>
              </div>
            </div>
          </form>
        </div>
        <div class="modal-backdrop" (click)="cancel()"></div>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }
  `
})
export class ChordBuilderModalComponent {
  isOpen = input.required<boolean>();
  editingChord = input<ChordDefinition | null>(null);
  save = output<ChordDefinition>();
  close = output<void>();
  
  tempName = signal('');
  tempStartFret = signal(1);
  tempStrings = signal<(number | 'x' | 'o')[]>([0, 0, 0, 0, 0, 0]);
  tempBarres = signal<Record<number, number[]>>({});
  detectedChordName = signal('');
  
  constructor() {
    // Watch editingChord changes to initialize form
    effect(() => {
      const chord = this.editingChord();
      if (chord) {
        this.tempName.set(chord.name);
        this.tempStartFret.set(chord.startFret);
        this.tempStrings.set([...chord.strings]);
        this.tempBarres.set(chord.barres ? { ...chord.barres } : {});
      } else if (this.isOpen()) {
        // Reset form when opening for new chord
        this.resetForm();
      }
    });
  }
  
  // SVG dimensions
  svgWidth = 550;
  svgHeight = 290;
  stringStartX = 80;
  stringEndX = 480;
  stringSpacing = 70;
  fretStartY = 40;
  fretSpacing = 45;
  
  stringLabels = ['E', 'A', 'D', 'G', 'B', 'E'];
  
  selectedNotesCount = computed(() => {
    const regularNotes = this.tempStrings().filter(s => typeof s === 'number' && s > 0).length;
    
    // Count barre notes (only those without regular notes)
    const barres = this.tempBarres();
    const barreNotes = Object.values(barres).flat().filter(stringIndex => {
      const stringValue = this.tempStrings()[stringIndex];
      return typeof stringValue !== 'number' || stringValue === 0;
    }).length;
    
    return regularNotes + barreNotes;
  });
  
  getStringX(stringIndex: number): number {
    return this.stringStartX + stringIndex * this.stringSpacing;
  }
  
  cycleStringStatus(stringIndex: number) {
    const current = this.tempStrings()[stringIndex];
    let next: number | 'x' | 'o';
    
    if (current === 'x') {
      next = 'o';
    } else if (current === 'o') {
      next = 0;
    } else {
      next = 'x';
    }
    
    this.tempStrings.update(strings => {
      const newStrings = [...strings];
      newStrings[stringIndex] = next;
      return newStrings;
    });
  }
  
  handleFretClick(event: MouseEvent, stringIndex: number, fret: number) {
    if (event.ctrlKey || event.metaKey) {
      // Ctrl/Cmd + click = toggle barre
      this.toggleBarre(stringIndex, fret);
    } else {
      // Normal click = toggle note
      this.toggleNote(stringIndex, fret);
    }
  }
  
  toggleNote(stringIndex: number, fret: number) {
    const current = this.tempStrings()[stringIndex];
    
    // If trying to add a note but already at max capacity
    if (current !== fret && this.selectedNotesCount() >= 6) {
      return;
    }
    
    // Remove barre if present on this string/fret
    const barres = this.tempBarres();
    if (barres[fret]?.includes(stringIndex)) {
      this.removeBarre(stringIndex, fret);
    }
    
    this.tempStrings.update(strings => {
      const newStrings = [...strings];
      if (strings[stringIndex] === fret) {
        // Remove note
        newStrings[stringIndex] = 0;
      } else {
        // Add note
        newStrings[stringIndex] = fret;
      }
      return newStrings;
    });
  }
  
  toggleBarre(stringIndex: number, fret: number) {
    const barres = this.tempBarres();
    const stringsOnFret = barres[fret] || [];
    
    if (stringsOnFret.includes(stringIndex)) {
      // Remove barre from this string
      this.removeBarre(stringIndex, fret);
    } else {
      // Add barre to this string
      this.addBarre(stringIndex, fret);
    }
  }
  
  addBarre(stringIndex: number, fret: number) {
    // Remove any existing note on this string/fret
    if (this.tempStrings()[stringIndex] === fret) {
      this.tempStrings.update(strings => {
        const newStrings = [...strings];
        newStrings[stringIndex] = 0;
        return newStrings;
      });
    }
    
    this.tempBarres.update(barres => {
      const newBarres = { ...barres };
      if (!newBarres[fret]) {
        newBarres[fret] = [];
      }
      if (!newBarres[fret].includes(stringIndex)) {
        newBarres[fret] = [...newBarres[fret], stringIndex].sort();
      }
      return newBarres;
    });
  }
  
  removeBarre(stringIndex: number, fret: number) {
    this.tempBarres.update(barres => {
      const newBarres = { ...barres };
      if (newBarres[fret]) {
        newBarres[fret] = newBarres[fret].filter(s => s !== stringIndex);
        if (newBarres[fret].length === 0) {
          delete newBarres[fret];
        }
      }
      return newBarres;
    });
  }
  
  isNoteSelected(stringIndex: number, fret: number): boolean {
    return this.tempStrings()[stringIndex] === fret;
  }
  
  isBarreSelected(stringIndex: number, fret: number): boolean {
    const barres = this.tempBarres();
    return barres[fret]?.includes(stringIndex) || false;
  }
  
  getBarreGroupsForFret(fret: number): Array<{ fromString: number; toString: number }> {
    const barres = this.tempBarres();
    const stringsOnFret = barres[fret];
    if (!stringsOnFret || stringsOnFret.length === 0) return [];
    
    // Group consecutive strings
    const sorted = [...stringsOnFret].sort((a, b) => a - b);
    const groups: Array<{ fromString: number; toString: number }> = [];
    let start = sorted[0];
    let end = sorted[0];
    
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === end + 1) {
        end = sorted[i];
      } else {
        groups.push({ fromString: start, toString: end });
        start = sorted[i];
        end = sorted[i];
      }
    }
    groups.push({ fromString: start, toString: end });
    
    return groups;
  }
  
  detectChordName() {
    const notes: string[] = [];
    const stringTunings = ['E', 'A', 'D', 'G', 'B', 'E'];
    const stringOctaves = [2, 2, 3, 3, 3, 4];
    
    this.tempStrings().forEach((value, stringIndex) => {
      const basePitch = stringTunings[stringIndex];
      const baseChroma = Note.chroma(basePitch);
      
      if (baseChroma !== undefined) {
        if (value === 'o') {
          // Open string - use base note
          notes.push(basePitch);
        } else if (typeof value === 'number' && value > 0) {
          // Fretted note
          const fret = value + (this.tempStartFret() - 1);
          const finalChroma = (baseChroma + fret) % 12;
          const noteName = NOTES[finalChroma];
          notes.push(noteName);
        }
      }
    });
    
    // Add notes from barres
    const barres = this.tempBarres();
    Object.entries(barres).forEach(([fretStr, strings]) => {
      const fret = parseInt(fretStr, 10);
      strings.forEach(stringIndex => {
        // Only add if this string doesn't already have a regular note
        if (typeof this.tempStrings()[stringIndex] !== 'number' || this.tempStrings()[stringIndex] === 0) {
          const basePitch = stringTunings[stringIndex];
          const baseChroma = Note.chroma(basePitch);
          
          if (baseChroma !== undefined) {
            const actualFret = fret + (this.tempStartFret() - 1);
            const finalChroma = (baseChroma + actualFret) % 12;
            const noteName = NOTES[finalChroma];
            notes.push(noteName);
          }
        }
      });
    });
    
    if (notes.length > 0) {
      const detected = Chord.detect(notes);
      if (detected.length > 0) {
        this.detectedChordName.set(detected[0]);
        this.tempName.set(detected[0]);
      } else {
        this.detectedChordName.set('Non riconosciuto');
      }
    }
  }
  
  canSave(): boolean {
    return this.tempName().trim().length > 0 && this.selectedNotesCount() > 0;
  }
  
  saveChord(event: Event) {
    event.preventDefault();
    
    if (!this.canSave()) return;
    
    const barres = this.tempBarres();
    const chord: ChordDefinition = {
      name: this.tempName(),
      startFret: this.tempStartFret(),
      strings: [...this.tempStrings()],
      ...(Object.keys(barres).length > 0 && { barres: { ...barres } })
    };
    
    this.save.emit(chord);
    this.resetForm();
  }
  
  cancel() {
    this.resetForm();
    this.close.emit();
  }
  
  resetForm() {
    this.tempName.set('');
    this.tempStartFret.set(1);
    this.tempStrings.set([0, 0, 0, 0, 0, 0]);
    this.tempBarres.set({});
    this.detectedChordName.set('');
  }
}
