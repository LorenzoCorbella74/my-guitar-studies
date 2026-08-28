import { Component, ChangeDetectionStrategy, inject, input, output } from '@angular/core';
import { ConfirmService } from '../../services/confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    @if (isOpen()) {
      <dialog class="modal modal-open z-[1100]">
        <div class="modal-box relative z-10">
          <h3 class="font-bold text-lg">{{ title() }}</h3>
          <p class="py-4">{{ message() }}</p>
          <div class="modal-action">
            <button type="button" class="btn" (click)="onCancel()">Annulla</button>
            <button type="button" class="btn btn-error" (click)="onConfirm()">Elimina</button>
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
  private confirmService = inject(ConfirmService);

  isOpen = input.required<boolean>();
  title = input<string>('Conferma eliminazione');
  message = input<string>('Sei sicuro di voler procedere?');
  
  cancel = output<void>();
  
  onConfirm() {
    this.confirmService.confirm();
  }
  
  onCancel() {
    this.cancel.emit();
  }
}
