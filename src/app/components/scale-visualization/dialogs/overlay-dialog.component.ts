import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { ScaleType, ChordType } from 'tonal';
import { LucideTrash2, LucideEye, LucideEyeOff } from '@lucide/angular';
import { NOTES_WITH_FLATS } from '../constants';
import { OverlayItem } from '../../../models/session.model';

export interface OverlayDialogData {
  overlays: OverlayItem[];
}

export interface OverlayDialogResult {
  overlays: OverlayItem[];
}

@Component({
  selector: 'app-overlay-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, LucideTrash2, LucideEye, LucideEyeOff],
  templateUrl: './overlay-dialog.component.html',
  styles: `
    :host {
      display: block;
    }
  `
})
export class OverlayDialogComponent {
  dialogRef = inject<DialogRef<OverlayDialogResult>>(DialogRef);
  data = inject<OverlayDialogData>(DIALOG_DATA);

  notes = NOTES_WITH_FLATS;
  scaleNames = ScaleType.names();
  chordTypes = ChordType.names();
  octaves = [2, 3, 4, 5];

  overlayType = signal<'scale' | 'chord' | 'notes' | 'notes-with-octaves'>('scale');
  overlayRoot = signal('C');
  overlayName = signal('major');
  overlays = signal<OverlayItem[]>([...this.data.overlays]);
  
  // For notes type
  selectedNote = signal('C');
  selectedOctave = signal(2);
  selectedNotes = signal<string[]>([]);

  onSubmit(event: Event): void {
    event.preventDefault();
    
    if (this.overlayType() === 'notes' || this.overlayType() === 'notes-with-octaves') {
      // For notes types, check if there are notes to add
      if (this.selectedNotes().length === 0) {
        return;
      }
      
      const newOverlay: OverlayItem = {
        type: this.overlayType(),
        notes: [...this.selectedNotes()],
        visible: true
      };
      
      this.overlays.update(overlays => [...overlays, newOverlay]);
      
      // Reset notes
      this.selectedNotes.set([]);
      this.selectedNote.set('C');
      this.selectedOctave.set(2);
    } else {
      const newOverlay: OverlayItem = {
        type: this.overlayType(),
        root: this.overlayRoot(),
        name: this.overlayName(),
        visible: true
      };
      
      this.overlays.update(overlays => [...overlays, newOverlay]);
      
      // Reset form
      this.overlayType.set('scale');
      this.overlayRoot.set('C');
      this.overlayName.set('major');
    }
  }
  
  addNoteToSelection(): void {
    const note = this.overlayType() === 'notes-with-octaves' 
      ? `${this.selectedNote()}${this.selectedOctave()}` 
      : this.selectedNote();
    
    if (!this.selectedNotes().includes(note)) {
      this.selectedNotes.update(notes => [...notes, note]);
    }
  }
  
  removeNoteFromSelection(note: string): void {
    this.selectedNotes.update(notes => notes.filter(n => n !== note));
  }

  toggleVisibility(index: number): void {
    this.overlays.update(overlays => 
      overlays.map((overlay, i) => 
        i === index ? { ...overlay, visible: !(overlay.visible ?? true) } : overlay
      )
    );
  }

  removeOverlay(index: number): void {
    this.overlays.update(overlays => overlays.filter((_, i) => i !== index));
  }

  close(): void {
    this.dialogRef.close({
      overlays: this.overlays()
    });
  }
}
