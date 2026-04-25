import { Component, inject } from '@angular/core';
import { LoadingService } from '../../services/loading.service';
import { LucideLoaderCircle } from '@lucide/angular';


@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [LucideLoaderCircle],
  template: `
    @if (loading()) {
      <div class="loading-overlay">
        <svg lucideLoaderCircle class="w-12 h-12 animate-spin"></svg>
      </div>
    }
  `,
  styles: `
    .loading-overlay {
      position: fixed;
      inset: 0;
      background: rgba(255,255,255,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9998;
    }
    .animate-spin {
      animation: spin 1s linear infinite;
      color: #00754A;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `
})
export class LoadingComponent {
  protected readonly loading = inject(LoadingService).loading;
}