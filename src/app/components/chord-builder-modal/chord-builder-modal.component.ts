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
                        (click)="toggleNote(string, fret)"
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
                  class="btn btn-primary btn-sm"
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
  detectedChordName = signal('');
  
  constructor() {
    // Watch editingChord changes to initialize form
    effect(() => {
      const chord = this.editingChord();
      if (chord) {
        this.tempName.set(chord.name);
        this.tempStartFret.set(chord.startFret);
        this.tempStrings.set([...chord.strings]);
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
    return this.tempStrings().filter(s => typeof s === 'number' && s > 0).length;
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
  
  toggleNote(stringIndex: number, fret: number) {
    const current = this.tempStrings()[stringIndex];
    
    // If trying to add a note but already at max capacity
    if (current !== fret && this.selectedNotesCount() >= 6) {
      return;
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
  
  isNoteSelected(stringIndex: number, fret: number): boolean {
    return this.tempStrings()[stringIndex] === fret;
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
    
    const chord: ChordDefinition = {
      name: this.tempName(),
      startFret: this.tempStartFret(),
      strings: [...this.tempStrings()]
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
    this.detectedChordName.set('');
  }
}
