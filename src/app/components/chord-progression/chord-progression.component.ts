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
  imports: [
    ChordDiagramComponent, 
    ChordBuilderModalComponent, 
    ChordProgressionNameDialogComponent, 
    LucidePlus, LucideTrash2, LucidePencil, LucideGripVertical, 
    CdkDrag, CdkDropList, CdkDragHandle
  ],
  templateUrl: './chord-progression.component.html',
  styleUrls: ['./chord-progression.component.css'],
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
