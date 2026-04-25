import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    @if (isOpen()) {
      <dialog class="modal modal-open">
        <div class="modal-box">
          <h3 class="font-bold text-lg">{{ title() }}</h3>
          <p class="py-4">{{ message() }}</p>
          <div class="modal-action">
            <button class="btn" (click)="onCancel()">Annulla</button>
            <button class="btn btn-error" (click)="onConfirm()">Elimina</button>
          </div>
        </div>
        <form method="dialog" class="modal-backdrop">
          <button (click)="onCancel()">close</button>
        </form>
      </dialog>
    }
  `,
  styles: `
    :host {
      display: contents;
    }
  `
})
export class ConfirmDialogComponent {
  isOpen = input.required<boolean>();
  title = input<string>('Conferma eliminazione');
  message = input<string>('Sei sicuro di voler procedere?');
  
  confirm = output<void>();
  cancel = output<void>();
  
  onConfirm() {
    this.confirm.emit();
  }
  
  onCancel() {
    this.cancel.emit();
  }
}
