import { Component, ChangeDetectionStrategy, input, output, signal, computed } from '@angular/core';
import { ChordProgressionItem, ChordDefinition } from '../../models/session.model';
import { ChordDiagramComponent } from '../chord-diagram/chord-diagram.component';
import { ChordBuilderModalComponent } from '../chord-builder-modal/chord-builder-modal.component';
import { LucidePlus, LucideTrash2 } from '@lucide/angular';

@Component({
  selector: 'app-chord-progression',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChordDiagramComponent, ChordBuilderModalComponent, LucidePlus, LucideTrash2],
  template: `
    <div class="card bg-base-100 shadow-md">
      <div class="card-body">
        <div class="flex justify-between items-center mb-2">
          <h3 class="text-lg font-semibold">Progressione Accordi</h3>
          <div class="flex gap-2">
            <button
              type="button"
              class="btn btn-dash btn-primary btn-sm"
              (click)="openChordBuilder()"
            >
              <svg lucidePlus class="w-4 h-4"></svg>
              Aggiungi accordo
            </button>
            <button
              type="button"
              class="btn btn-ghost btn-sm btn-square"
              (click)="deleteProgression.emit()"
              aria-label="Elimina progressione"
            >
              <svg lucideTrash2 class="w-4 h-4"></svg>
            </button>
          </div>
        </div>
        
        <!-- Chord Diagrams Grid -->
        @if (progression().chords.length > 0) {
          <div class="flex flex-wrap gap-4 mb-4">
            @for (chord of progression().chords; track $index) {
              <app-chord-diagram
                [chord]="chord"
                (edit)="editChord($index)"
                (deleteChord)="removeChord($index)"
              />
            }
          </div>
        } @else {
          <div class="text-center py-8 text-base-content/60">
            <p>Nessun accordo aggiunto</p>
            <p class="text-sm">Clicca "+ Aggiungi accordo" per iniziare</p>
          </div>
        }
      </div>
    </div>
    
    <!-- Chord Builder Modal -->
    <app-chord-builder-modal
      [isOpen]="builderModalOpen()"
      [editingChord]="editingChord()"
      (save)="addChord($event)"
      (close)="closeChordBuilder()"
    />
  `,
  styles: `
    :host {
      display: block;
    }
  `
})
export class ChordProgressionComponent {
  progression = input.required<ChordProgressionItem>();
  update = output<ChordProgressionItem>();
  deleteProgression = output<void>();
  
  editingChordIndex = signal<number | null>(null);
  builderModalOpen = signal(false);
  
  editingChord = computed(() => {
    const index = this.editingChordIndex();
    if (index !== null && index >= 0 && index < this.progression().chords.length) {
      return this.progression().chords[index];
    }
    return null;
  });
  
  openChordBuilder(chordIndex?: number) {
    if (chordIndex !== undefined) {
      this.editingChordIndex.set(chordIndex);
    } else {
      this.editingChordIndex.set(null);
    }
    this.builderModalOpen.set(true);
  }
  
  editChord(index: number) {
    this.openChordBuilder(index);
  }
  
  removeChord(index: number) {
    const updatedChords = this.progression().chords.filter((_, i) => i !== index);
    const updated: ChordProgressionItem = {
      ...this.progression(),
      chords: updatedChords
    };
    this.update.emit(updated);
  }
  
  addChord(chord: ChordDefinition) {
    const editingIndex = this.editingChordIndex();
    let updatedChords: ChordDefinition[];
    
    if (editingIndex !== null) {
      // Update existing chord
      updatedChords = this.progression().chords.map((c, i) => 
        i === editingIndex ? chord : c
      );
    } else {
      // Add new chord
      updatedChords = [...this.progression().chords, chord];
    }
    
    const updated: ChordProgressionItem = {
      ...this.progression(),
      chords: updatedChords
    };
    
    this.update.emit(updated);
    this.builderModalOpen.set(false);
    this.editingChordIndex.set(null);
  }
  
  closeChordBuilder() {
    this.builderModalOpen.set(false);
    this.editingChordIndex.set(null);
  }
}
