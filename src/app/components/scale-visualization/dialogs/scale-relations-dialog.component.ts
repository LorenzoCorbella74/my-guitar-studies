import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { LucidePlus } from '@lucide/angular';
import { OverlayItem } from '../../../models/session.model';

export interface ScaleRelationsDialogData {
  title: string;
  currentRoot: string;
  scaleChords: string[];
  extendedScales: string[];
  reducedScales: string[];
}

export interface ScaleRelationsDialogResult {
  overlay: OverlayItem;
}

@Component({
  selector: 'app-scale-relations-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucidePlus],
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
              <div class="badge badge-primary badge-lg flex items-center gap-2 pr-2">
                <span>{{ chord }}</span>
                <button 
                  type="button"
                  class="btn btn-ghost btn-xs btn-circle h-5 w-5 min-h-0"
                  (click)="addOverlay('chord', chord)"
                  title="Aggiungi come sovrapposizione"
                >
                  <svg lucidePlus [size]="14" color="white"></svg>
                </button>
              </div>
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
              <div class="badge badge-secondary badge-lg flex items-center gap-2 pr-2">
                <span>{{ scale }}</span>
                <button 
                  type="button"
                  class="btn btn-ghost btn-xs btn-circle h-5 w-5 min-h-0"
                  (click)="addOverlay('scale', scale)"
                  title="Aggiungi come sovrapposizione"
                >
                  <svg lucidePlus [size]="14" color="white"></svg>
                </button>
              </div>
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
              <div class="badge badge-accent badge-lg flex items-center gap-2 pr-2">
                <span>{{ scale }}</span>
                <button 
                  type="button"
                  class="btn btn-ghost btn-xs btn-circle h-5 w-5 min-h-0"
                  (click)="addOverlay('scale', scale)"
                  title="Aggiungi come sovrapposizione"
                >
                  <svg lucidePlus [size]="14" color="white"></svg>
                </button>
              </div>
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
  dialogRef = inject<DialogRef<ScaleRelationsDialogResult>>(DialogRef);
  data = inject<ScaleRelationsDialogData>(DIALOG_DATA);

  addOverlay(type: 'scale' | 'chord', fullName: string): void {
    // Both scales and chords from scale relations use current root + name
    // Example: "dorian" with currentRoot "C" -> root: "C", name: "dorian"
    // Example: "5" with currentRoot "C" -> root: "C", name: "5"
    const root = this.data.currentRoot;
    const name = fullName.trim();

    const overlay: OverlayItem = {
      type,
      root,
      name,
      visible: true
    };

    this.dialogRef.close({ overlay });
  }
}
