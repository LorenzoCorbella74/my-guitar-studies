import { Component, Signal } from '@angular/core';
import { Toast, ToastService } from '../../services/toast.service';
import { slideInRight } from '../../animations';


@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [],
  animations: [slideInRight],
  template: `
    <div class="toast-container">
      @for (toast of toasts(); track toast.id) {
        <div class="alert" [class]="'alert-' + toast.type" @slideInRight>
          <span>{{ toast.message }}</span>
          <button class="btn btn-sm btn-ghost" (click)="dismissToast(toast.id)">
            <!-- <svg lucide-x class="w-4 h-4"></svg> --> X
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .toast-container {
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-width: 400px;
    }
    .alert {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 1rem;
      border-radius: 0.5rem;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .alert-success { background: #dcfce7; color: #166534; }
    .alert-error { background: #fee2e2; color: #991b1b; }
    .alert-warning { background: #fef3c7; color: #92400e; }
    .alert-info { background: #dbeafe; color: #1e40af; }
  `
})
export class ToastContainerComponent {

  toasts: Signal<Toast[]>;

  constructor(private toastService: ToastService) {
    this.toasts = this.toastService.toasts;
  }

  dismissToast(id: number) {
    this.toastService.dismissToast(id);
  }
}