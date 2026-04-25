import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private toastId = 0;
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  showToast(message: string, type: ToastType = 'info', duration: number = 5000): number {
    const id = ++this.toastId;
    this._toasts.update(t => [...t, { id, message, type }]);

    setTimeout(() => {
      this._toasts.update(t => t.filter(toast => toast.id !== id));
    }, duration);

    return id;
  }

  dismissToast(id: number): void {
    this._toasts.update(t => t.filter(toast => toast.id !== id));
  }

  clearToasts(): void {
    this._toasts.set([]);
  }
}