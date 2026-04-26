import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { ScaleType, ChordType } from 'tonal';
import { LucideTrash2 } from '@lucide/angular';
import { NOTES } from '../constants';

export interface OverlayItem {
  type: 'scale' | 'chord';
  root: string;
  name: string;
}

export interface OverlayDialogData {
  overlays: OverlayItem[];
}

export interface OverlayDialogResult {
  overlays: OverlayItem[];
}

@Component({
  selector: 'app-overlay-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, LucideTrash2],
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

  notes = NOTES;
  scaleNames = ScaleType.names();
  chordTypes = ChordType.names();

  overlayType = signal<'scale' | 'chord'>('scale');
  overlayRoot = signal('C');
  overlayName = signal('major');
  overlays = signal<OverlayItem[]>([...this.data.overlays]);

  onSubmit(event: Event): void {
    event.preventDefault();
    
    const newOverlay: OverlayItem = {
      type: this.overlayType(),
      root: this.overlayRoot(),
      name: this.overlayName()
    };
    
    this.overlays.update(overlays => [...overlays, newOverlay]);
    
    // Reset form
    this.overlayType.set('scale');
    this.overlayRoot.set('C');
    this.overlayName.set('major');
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
