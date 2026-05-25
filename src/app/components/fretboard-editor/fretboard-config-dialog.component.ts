import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { FRETBOARD_STYLES } from '../scale-visualization/constants';

export interface FretboardConfigDialogData {
  fretShift: number;
  fretboardColor: string;
  tuning: string[];
}

export interface FretboardConfigDialogResult {
  fretShift: number;
  fretboardColor: string;
  tuning: string[];
}

@Component({
  selector: 'app-fretboard-config-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="cdk-dialog-content">
      <h3 class="font-bold text-lg mb-4">Configura tastiera</h3>
      
      <form (submit)="onSubmit($event)">
        <!-- Fret Shift Slider -->
        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">Posizione tastiera (tasti {{ fretShift() }} - {{ fretShift() + 12 }})</span>
            <span class="label-text-alt">Shift: {{ fretShift() }}</span>
          </label>
          <input
            type="range"
            min="0"
            max="12"
            step="1"
            class="range range-primary ml-2"
            [(ngModel)]="fretShift"
            name="fretShift"
          />
          <div class="text-xs text-base-content/60 mt-1">
            Sposta il rendering della tastiera dal capotasto (0) fino al 12° tasto
          </div>
        </div>

        <!-- Fretboard Color Selection -->
        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">Colore tastiera</span>
          </label>
          <div class="flex gap-2 flex-wrap">
            @for (style of fretboardStyles; track style.fretboard) {
              <button
                type="button"
                class="btn btn-sm"
                [class.btn-primary]="fretboardColor() === style.fretboard"
                [class.btn-ghost]="fretboardColor() !== style.fretboard"
                (click)="fretboardColor.set(style.fretboard)"
              >
                <div
                  class="w-4 h-4 rounded border border-base-content/20 mr-1"
                  [style.background-color]="style.fretboard"
                ></div>
                {{ style.label }}
              </button>
            }
          </div>
        </div>

        <!-- Tuning Selection -->
        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">Accordatura</span>
          </label>
          <select 
            class="select select-bordered"
            [(ngModel)]="tuningPreset"
            name="tuning"
          >
            <option value="E2 A2 D3 G3 B3 E4">Standard (E A D G B E)</option>
            <option value="D2 A2 D3 G3 B3 E4">Drop D</option>
            <option value="C2 G2 C3 F3 A3 D4">Drop C</option>
            <option value="Eb2 Ab2 Db3 Gb3 Bb3 Eb4">Eb Standard</option>
            <option value="D2 G2 C3 F3 A3 D4">D Standard</option>
          </select>
        </div>

        <div class="modal-action flex gap-2">
          <button
            type="button"
            class="btn btn-ghost"
            (click)="dialogRef.close()"
          >
            Annulla
          </button>
          <button
            type="submit"
            class="btn btn-primary"
          >
            Salva
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
export class FretboardConfigDialogComponent {
  dialogRef = inject<DialogRef<FretboardConfigDialogResult>>(DialogRef);
  data = inject<FretboardConfigDialogData>(DIALOG_DATA);

  fretboardStyles = FRETBOARD_STYLES;

  fretShift = signal(this.data.fretShift);
  fretboardColor = signal(this.data.fretboardColor);
  tuningPreset = signal(this.data.tuning.join(' '));

  onSubmit(event: Event): void {
    event.preventDefault();
    
    const result: FretboardConfigDialogResult = {
      fretShift: this.fretShift(),
      fretboardColor: this.fretboardColor(),
      tuning: this.tuningPreset().split(' ')
    };

    this.dialogRef.close(result);
  }
}
