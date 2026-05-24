import { Component, ChangeDetectionStrategy, input, output, signal, computed } from '@angular/core';
import { ChordProgressionItem, ChordDefinition } from '../../models/session.model';
import { ChordDiagramComponent } from '../chord-diagram/chord-diagram.component';
import { ChordBuilderModalComponent } from '../chord-builder-modal/chord-builder-modal.component';
import { ChordProgressionNameDialogComponent } from '../section-editor/dialogs/chord-progression-name-dialog.component';
import { LucidePlus, LucideTrash2, LucidePencil, LucideGripVertical } from '@lucide/angular';
import { CdkDrag, CdkDropList, CdkDragHandle, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-chord-progression',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChordDiagramComponent, ChordBuilderModalComponent, ChordProgressionNameDialogComponent, LucidePlus, LucideTrash2, LucidePencil, LucideGripVertical, CdkDrag, CdkDropList, CdkDragHandle],
  template: `
    <div class="card bg-base-100 shadow-md">
      <div class="card-body">
        <div class="flex justify-between items-center mb-2">
          <h3 class="text-lg font-semibold">{{ progression().title || 'Progressione Accordi' }}</h3>
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
              (click)="openTitleDialog()"
              aria-label="Modifica titolo"
            >
              <svg lucidePencil class="w-4 h-4"></svg>
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
          <div class="flex flex-wrap gap-3 mb-4" cdkDropList cdkDropListOrientation="horizontal" (cdkDropListDropped)="onChordDrop($event)">
            @for (chord of progression().chords; track $index) {
              <div cdkDrag class="chord-drag-wrapper">
                <div cdkDragHandle class="chord-drag-handle" [attr.aria-label]="'Trascina per riordinare'">
                  <svg lucideGripVertical class="w-4 h-4"></svg>
                </div>
                <app-chord-diagram
                  [chord]="chord"
                  (edit)="editChord($index)"
                  (deleteChord)="removeChord($index)"
                />
              </div>
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
    
    <!-- Title Edit Dialog -->
    <app-chord-progression-name-dialog
      [isOpen]="titleDialogOpen()"
      [initialTitle]="progression().title"
      (confirm)="updateTitle($event)"
      (close)="titleDialogOpen.set(false)"
    />
  `,
  styles: `
    :host {
      display: block;
    }

    .chord-drag-wrapper {
      position: relative;
    }

    .chord-drag-handle {
      position: absolute;
      top: 0.25rem;
      left: 0.25rem;
      cursor: grab;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.25rem;
      color: oklch(var(--bc) / 0.4);
      transition: all 0.2s;
      border-radius: 0.25rem;
      z-index: 10;
      background: transparent;
    }

    .chord-drag-handle:hover {
      color: oklch(var(--bc) / 0.9);
      background: oklch(var(--bc) / 0.1);
    }

    .chord-drag-handle:active {
      cursor: grabbing;
    }

    .cdk-drag-preview {
      opacity: 0.8;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      border-radius: 0.5rem;
    }

    .cdk-drag-placeholder {
      opacity: 0.3;
      border: 2px dashed oklch(var(--bc) / 0.3);
      border-radius: 0.5rem;
      background: oklch(var(--b1));
    }

    .cdk-drag-animating {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }

    .cdk-drop-list-dragging .chord-drag-wrapper:not(.cdk-drag-placeholder) {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
  `
})
export class ChordProgressionComponent {
  progression = input.required<ChordProgressionItem>();
  update = output<ChordProgressionItem>();
  deleteProgression = output<void>();
  
  editingChordIndex = signal<number | null>(null);
  builderModalOpen = signal(false);
  titleDialogOpen = signal(false);
  
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
  
  openTitleDialog() {
    this.titleDialogOpen.set(true);
  }
  
  updateTitle(newTitle: string) {
    const updated: ChordProgressionItem = {
      ...this.progression(),
      title: newTitle
    };
    this.update.emit(updated);
    this.titleDialogOpen.set(false);
  }

  onChordDrop(event: CdkDragDrop<ChordDefinition[]>) {
    const chordsArray = [...this.progression().chords];
    moveItemInArray(chordsArray, event.previousIndex, event.currentIndex);
    
    const updated: ChordProgressionItem = {
      ...this.progression(),
      chords: chordsArray
    };
    this.update.emit(updated);
  }
}
