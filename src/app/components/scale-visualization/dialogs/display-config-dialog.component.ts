import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { FRETBOARD_STYLES } from '../constants';

export interface DisplayConfigDialogData {
  noteOpacity: number;
  labelMode: 'note' | 'degree' | 'none';
  colorMode: 'monocolor' | 'triads' | 'all' | 'octaves';
  startFret: number;
  endFret: number;
  fretboardColor: string;
}

export interface DisplayConfigDialogResult {
  noteOpacity: number;
  labelMode: 'note' | 'degree' | 'none';
  colorMode: 'monocolor' | 'triads' | 'all' | 'octaves';
  startFret: number;
  endFret: number;
  fretboardColor: string;
}

@Component({
  selector: 'app-display-config-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="cdk-dialog-content">
      <h3 class="font-bold text-lg mb-4">Configura visualizzazione</h3>
      
      <form (submit)="onSubmit($event)">
        <!-- Opacity Slider -->
        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">Opacità note</span>
            <span class="label-text-alt">{{ (opacity() * 100).toFixed(0) }}%</span>
          </label>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            class="range range-primary"
            [(ngModel)]="opacity"
            name="opacity"
          />
        </div>

        <!-- Fret Range Slider -->
        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">Range tasti</span>
            <span class="label-text-alt">{{ startFret() }} - {{ endFret() }}</span>
          </label>
          <div class="flex gap-4 items-center">
            <input
              type="range"
              min="0"
              max="12"
              step="1"
              class="range range-primary flex-1"
              [(ngModel)]="startFret"
              name="startFret"
              [max]="endFret() - 1"
            />
            <span class="text-sm font-semibold min-w-[3rem] text-center">{{ startFret() }}</span>
            <span class="text-sm">-</span>
            <span class="text-sm font-semibold min-w-[3rem] text-center">{{ endFret() }}</span>
            <input
              type="range"
              min="0"
              max="12"
              step="1"
              class="range range-primary flex-1"
              [(ngModel)]="endFret"
              name="endFret"
              [min]="startFret() + 1"
            />
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

        <!-- Label Mode and Color Mode side by side -->
        <div class="grid grid-cols-2 gap-4 mb-4">
          <!-- Label Mode -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Etichette</span>
            </label>
            <div class="flex flex-col gap-2">
              <label class="label cursor-pointer justify-start gap-2">
                <input
                  type="radio"
                  class="radio radio-primary"
                  [(ngModel)]="labelMode"
                  name="labelMode"
                  value="note"
                />
                <span class="label-text">Note</span>
              </label>
              <label class="label cursor-pointer justify-start gap-2">
                <input
                  type="radio"
                  class="radio radio-primary"
                  [(ngModel)]="labelMode"
                  name="labelMode"
                  value="degree"
                />
                <span class="label-text">Gradi</span>
              </label>
              <label class="label cursor-pointer justify-start gap-2">
                <input
                  type="radio"
                  class="radio radio-primary"
                  [(ngModel)]="labelMode"
                  name="labelMode"
                  value="none"
                />
                <span class="label-text">Nessuna</span>
              </label>
            </div>
          </div>

          <!-- Color Mode -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Modalità colori</span>
            </label>
            <div class="flex flex-col gap-2">
              <label class="label cursor-pointer justify-start gap-2">
                <input
                  type="radio"
                  class="radio radio-primary"
                  [(ngModel)]="colorMode"
                  name="colorMode"
                  value="monocolor"
                />
                <span class="label-text">Monocromatico</span>
              </label>
              <label class="label cursor-pointer justify-start gap-2">
                <input
                  type="radio"
                  class="radio radio-primary"
                  [(ngModel)]="colorMode"
                  name="colorMode"
                  value="all"
                />
                <span class="label-text">Tutti diversi</span>
              </label>
              <label class="label cursor-pointer justify-start gap-2">
                <input
                  type="radio"
                  class="radio radio-primary"
                  [(ngModel)]="colorMode"
                  name="colorMode"
                  value="triads"
                />
                <span class="label-text">Triadi</span>
              </label>
              <label class="label cursor-pointer justify-start gap-2">
                <input
                  type="radio"
                  class="radio radio-primary"
                  [(ngModel)]="colorMode"
                  name="colorMode"
                  value="octaves"
                />
                <span class="label-text">Per ottave</span>
              </label>
            </div>
          </div>
        </div>

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
export class DisplayConfigDialogComponent {
  dialogRef = inject<DialogRef<DisplayConfigDialogResult>>(DialogRef);
  data = inject<DisplayConfigDialogData>(DIALOG_DATA);

  fretboardStyles = FRETBOARD_STYLES;

  opacity = signal(this.data.noteOpacity);
  labelMode = signal(this.data.labelMode);
  colorMode = signal(this.data.colorMode);
  startFret = signal(this.data.startFret);
  endFret = signal(this.data.endFret);
  fretboardColor = signal(this.data.fretboardColor);

  onSubmit(event: Event): void {
    event.preventDefault();
    
    const result: DisplayConfigDialogResult = {
      noteOpacity: this.opacity(),
      labelMode: this.labelMode(),
      colorMode: this.colorMode(),
      startFret: this.startFret(),
      endFret: this.endFret(),
      fretboardColor: this.fretboardColor()
    };

    this.dialogRef.close(result);
  }
}
