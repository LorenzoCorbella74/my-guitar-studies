import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { ScaleType, ChordType } from 'tonal';
import { STANDARD_TUNINGS, NOTES } from '../constants';

export interface ConfigurationDialogData {
  itemType: 'scale' | 'arpeggio' | 'chord';
  currentConfig?: {
    tuning?: string[];
    root?: string;
    scaleName?: string;
    chordType?: string;
  };
}

export interface ConfigurationDialogResult {
  tuning: string[];
  root: string;
  scaleName?: string;
  chordType?: string;
}

@Component({
  selector: 'app-configuration-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="cdk-dialog-content">
      <h3 class="font-bold text-lg mb-4">
        @if (data.itemType === 'scale') { Configura scala }
        @else if (data.itemType === 'arpeggio') { Configura arpeggio }
        @else { Configura accordo }
      </h3>
      
      <form (submit)="onSubmit($event)">
        <!-- Tuning Selection -->
        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">Accordatura</span>
          </label>
          <select
            class="select select-bordered w-full"
            [(ngModel)]="tuningName"
            name="tuning"
            required
          >
            @for (tuning of tuningNames; track tuning) {
              <option [value]="tuning">{{ tuning }}</option>
            }
          </select>
        </div>

        <!-- Root Note Selection -->
        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">Tonica</span>
          </label>
          <select
            class="select select-bordered w-full"
            [(ngModel)]="root"
            name="root"
            required
          >
            @for (note of notes; track note) {
              <option [value]="note">{{ note }}</option>
            }
          </select>
        </div>

        <!-- Scale Selection (only for scales) -->
        @if (data.itemType === 'scale') {
          <div class="form-control mb-4">
            <label class="label">
              <span class="label-text">Scala</span>
            </label>
            <input
              list="scale-names"
              class="input input-bordered w-full"
              [(ngModel)]="scaleName"
              name="scale"
              placeholder="Cerca scala..."
              required
            />
            <datalist id="scale-names">
              @for (scaleName of scaleNames; track scaleName) {
                <option [value]="scaleName">{{ scaleName }}</option>
              }
            </datalist>
          </div>
        }

        <!-- Chord Type Selection (for arpeggios and chords) -->
        @if (data.itemType === 'arpeggio' || data.itemType === 'chord') {
          <div class="form-control mb-4">
            <label class="label">
              <span class="label-text">
                @if (data.itemType === 'arpeggio') { Tipo di accordo (per arpeggio) }
                @else { Tipo di accordo }
              </span>
            </label>
            <input
              list="chord-types"
              class="input input-bordered w-full"
              [(ngModel)]="chordType"
              name="chordType"
              placeholder="Cerca accordo..."
              required
            />
            <datalist id="chord-types">
              @for (chordType of chordTypes; track chordType) {
                <option [value]="chordType">{{ chordType }}</option>
              }
            </datalist>
          </div>
        }

        <!-- Modal Actions -->
        <div class="modal-action">
          <button
            type="button"
            class="btn"
            (click)="dialogRef.close()"
          >
            Annulla
          </button>
          <button
            type="submit"
            class="btn btn-primary"
          >
            Conferma
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
export class ConfigurationDialogComponent {
  dialogRef = inject<DialogRef<ConfigurationDialogResult>>(DialogRef);
  data = inject<ConfigurationDialogData>(DIALOG_DATA);

  tuningNames = Object.keys(STANDARD_TUNINGS);
  notes = NOTES;
  scaleNames = ScaleType.names();
  chordTypes = ChordType.names();

  tuningName = signal(this.getTuningName() || 'Standard (E)');
  root = signal(this.data.currentConfig?.root || 'C');
  scaleName = signal(this.data.currentConfig?.scaleName || 'major');
  chordType = signal(this.data.currentConfig?.chordType || 'maj7');

  private getTuningName(): string | null {
    if (!this.data.currentConfig?.tuning) return null;
    
    const tuningStr = this.data.currentConfig.tuning.join(',');
    for (const [name, tuning] of Object.entries(STANDARD_TUNINGS)) {
      if (tuning.join(',') === tuningStr) {
        return name;
      }
    }
    return null;
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    
    const tuning = STANDARD_TUNINGS[this.tuningName() as keyof typeof STANDARD_TUNINGS];
    
    const result: ConfigurationDialogResult = {
      tuning,
      root: this.root()
    };

    if (this.data.itemType === 'scale') {
      result.scaleName = this.scaleName();
    } else {
      result.chordType = this.chordType();
    }

    this.dialogRef.close(result);
  }
}
