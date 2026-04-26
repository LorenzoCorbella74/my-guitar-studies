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
  template: `
    <div class="cdk-dialog-content">
      <h3 class="font-bold text-lg mb-4">Aggiungi sovrapposizione</h3>
      
      <form (submit)="onSubmit($event)">
        <!-- Type Selection -->
        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">Tipo</span>
          </label>
          <select
            class="select select-bordered w-full"
            [(ngModel)]="overlayType"
            name="overlayType"
            required
          >
            <option value="scale">Scala</option>
            <option value="chord">Accordo</option>
          </select>
        </div>

        <!-- Root Note Selection -->
        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">Tonica</span>
          </label>
          <select
            class="select select-bordered w-full"
            [(ngModel)]="overlayRoot"
            name="overlayRoot"
            required
          >
            @for (note of notes; track note) {
              <option [value]="note">{{ note }}</option>
            }
          </select>
        </div>

        <!-- Scale/Chord Name -->
        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">
              @if (overlayType() === 'scale') { Nome scala } @else { Tipo accordo }
            </span>
          </label>
          @if (overlayType() === 'scale') {
            <input
              list="overlay-scale-names"
              class="input input-bordered w-full"
              [(ngModel)]="overlayName"
              name="overlayName"
              placeholder="Cerca scala..."
              required
            />
            <datalist id="overlay-scale-names">
              @for (scaleName of scaleNames; track scaleName) {
                <option [value]="scaleName">{{ scaleName }}</option>
              }
            </datalist>
          } @else {
            <input
              list="overlay-chord-types"
              class="input input-bordered w-full"
              [(ngModel)]="overlayName"
              name="overlayName"
              placeholder="Cerca accordo..."
              required
            />
            <datalist id="overlay-chord-types">
              @for (chordType of chordTypes; track chordType) {
                <option [value]="chordType">{{ chordType }}</option>
              }
            </datalist>
          }
        </div>

        <!-- Current Overlays List -->
        @if (overlays().length > 0) {
          <div class="mb-4">
            <label class="label">
              <span class="label-text">Sovrapposizioni attive</span>
            </label>
            <div class="space-y-2">
              @for (overlay of overlays(); track $index) {
                <div class="flex items-center justify-between bg-base-200 p-2 rounded">
                  <span class="text-sm">
                    {{ overlay.root }} {{ overlay.name }} ({{ overlay.type === 'scale' ? 'Scala' : 'Accordo' }})
                  </span>
                  <button
                    type="button"
                    class="btn btn-ghost btn-xs btn-square"
                    (click)="removeOverlay($index)"
                  >
                    <svg lucideTrash2 class="w-3 h-3"></svg>
                  </button>
                </div>
              }
            </div>
          </div>
        }

        <!-- Modal Actions -->
        <div class="modal-action">
          <button type="button" class="btn" (click)="close()">
            Chiudi
          </button>
          <button type="submit" class="btn btn-primary">
            Aggiungi
          </button>
        </div>
      </form>
    </div>
  `,
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
