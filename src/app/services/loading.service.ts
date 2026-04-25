import { computed, Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly _count = signal(0);
  readonly loading = computed(() => this._count() > 0);

  showLoading(): void {
    this._count.update(c => c + 1);
  }

  hideLoading(): void {
    this._count.update(c => Math.max(0, c - 1));
  }

  async track<T>(promise: Promise<T>): Promise<T> {
    this.showLoading();
    try {
      return await promise;
    } finally {
      this.hideLoading();
    }
  }
}