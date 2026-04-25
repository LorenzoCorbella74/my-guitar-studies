import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ConfirmService {
  isOpen = signal(false);
  title = signal('Conferma eliminazione');
  message = signal('Sei sicuro di voler procedere?');
  
  private onConfirmCallback: (() => void) | null = null;
  
  show(title: string, message: string, onConfirm: () => void) {
    this.title.set(title);
    this.message.set(message);
    this.onConfirmCallback = onConfirm;
    this.isOpen.set(true);
  }
  
  confirm() {
    if (this.onConfirmCallback) {
      this.onConfirmCallback();
    }
    this.cancel();
  }
  
  cancel() {
    this.isOpen.set(false);
    this.onConfirmCallback = null;
  }
}
