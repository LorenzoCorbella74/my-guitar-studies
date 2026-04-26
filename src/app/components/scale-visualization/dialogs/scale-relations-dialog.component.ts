import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';

export interface ScaleRelationsDialogData {
  title: string;
  scaleChords: string[];
  extendedScales: string[];
  reducedScales: string[];
}

@Component({
  selector: 'app-scale-relations-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cdk-dialog-content">
      <h3 class="font-bold text-lg mb-4">Relazioni - {{ data.title }}</h3>
      
      <div class="space-y-6">
        <!-- Scale Chords -->
        <div>
          <h4 class="font-semibold text-base mb-2">Accordi della scala</h4>
          <p class="text-sm text-base-content/60 mb-2">Accordi che si adattano a questa scala</p>
          <div class="flex flex-wrap gap-2">
            @for (chord of data.scaleChords; track chord) {
              <span class="badge badge-primary badge-lg">{{ chord }}</span>
            } @empty {
              <p class="text-sm text-base-content/50">Nessun accordo trovato</p>
            }
          </div>
        </div>

        <!-- Extended Scales -->
        <div>
          <h4 class="font-semibold text-base mb-2">Scale estese</h4>
          <p class="text-sm text-base-content/60 mb-2">Scale che contengono tutte le note di questa scala e altre</p>
          <div class="flex flex-wrap gap-2">
            @for (scale of data.extendedScales; track scale) {
              <span class="badge badge-secondary badge-lg">{{ scale }}</span>
            } @empty {
              <p class="text-sm text-base-content/50">Nessuna scala estesa trovata</p>
            }
          </div>
        </div>

        <!-- Reduced Scales -->
        <div>
          <h4 class="font-semibold text-base mb-2">Scale ridotte</h4>
          <p class="text-sm text-base-content/60 mb-2">Scale che sono un sottoinsieme di questa scala</p>
          <div class="flex flex-wrap gap-2">
            @for (scale of data.reducedScales; track scale) {
              <span class="badge badge-accent badge-lg">{{ scale }}</span>
            } @empty {
              <p class="text-sm text-base-content/50">Nessuna scala ridotta trovata</p>
            }
          </div>
        </div>
      </div>

      <div class="modal-action">
        <button type="button" class="btn" (click)="dialogRef.close()">
          Chiudi
        </button>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
  `
})
export class ScaleRelationsDialogComponent {
  dialogRef = inject<DialogRef<void>>(DialogRef);
  data = inject<ScaleRelationsDialogData>(DIALOG_DATA);
}
