import { Component, ChangeDetectionStrategy, input, output, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideX } from '@lucide/angular';

@Component({
  selector: 'app-chord-progression-name-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, LucideX],
  template: `
    @if (isOpen()) {
      <div class="modal modal-open">
        <div class="modal-box">
          <button
            type="button"
            class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
            (click)="close.emit()"
            aria-label="Chiudi"
          >
            <svg lucideX class="w-4 h-4"></svg>
          </button>
          
          <h3 class="font-bold text-lg mb-4">Nuova Progressione Accordi</h3>
          
          <div class="form-control w-full mb-6">
            <label class="label">
              <span class="label-text">Nome della progressione</span>
            </label>
            <input
              type="text"
              class="input input-bordered w-full"
              [(ngModel)]="localTitle"
              placeholder="Progressione accordi"
              (keydown.enter)="onConfirm()"
              autofocus
            />
          </div>
          
          <div class="modal-action">
            <button
              type="button"
              class="btn btn-ghost"
              (click)="close.emit()"
            >
              Annulla
            </button>
            <button
              type="button"
              class="btn btn-primary"
              (click)="onConfirm()"
            >
              Conferma
            </button>
          </div>
        </div>
        <div class="modal-backdrop" (click)="close.emit()"></div>
      </div>
    }
  `,
  styles: `
    :host {
      display: contents;
    }
  `
})
export class ChordProgressionNameDialogComponent {
  isOpen = input.required<boolean>();
  initialTitle = input<string>('Progressione accordi');
  
  confirm = output<string>();
  close = output<void>();
  
  localTitle = signal('Progressione accordi');
  
  constructor() {
    // Sincronizza il titolo locale quando cambia l'input o quando si apre la modale
    effect(() => {
      if (this.isOpen()) {
        this.localTitle.set(this.initialTitle());
      }
    });
  }
  
  onConfirm() {
    const title = this.localTitle().trim() || 'Progressione accordi';
    this.confirm.emit(title);
  }
}
