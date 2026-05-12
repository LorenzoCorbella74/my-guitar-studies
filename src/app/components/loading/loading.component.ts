import { Component, inject } from '@angular/core';
import { LoadingService } from '../../services/loading.service';
import { LucideLoaderCircle } from '@lucide/angular';
import { fade } from '../../animations';


@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [LucideLoaderCircle],
  animations: [fade],
  template: `
    @if (loading()) {
      <div class="loading-overlay" @fade>
        <svg lucideLoaderCircle class="w-24 h-24 animate-spin"></svg>
      </div>
    }
  `,
  styles: `
    .loading-overlay {
      position: fixed;
      inset: 0;
      background: oklch(var(--b1) / 0.85);
      backdrop-filter: blur(2px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9998;
    }
    .animate-spin {
      animation: spin 1s linear infinite;
      color: oklch(var(--p));
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