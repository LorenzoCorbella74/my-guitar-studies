import { Injectable, signal } from '@angular/core';
import { SessionItem } from '../models/session.model';

@Injectable({ providedIn: 'root' })
export class SessionItemClipboardService {
  private copiedItems = signal<SessionItem[]>([]);

  readonly count = () => this.copiedItems().length;
  readonly hasItems = () => this.copiedItems().length > 0;

  copy(items: SessionItem[]): void {
    this.copiedItems.update(copied => [...copied, ...items.map(item => this.clone(item))]);
  }

  reset(): void {
    this.copiedItems.set([]);
  }

  pasteInto(items: SessionItem[]): SessionItem[] {
    const pastedItems = this.copiedItems().map((item, index) => ({
      ...this.clone(item),
      id: this.createId(),
      order: (items.length + index) * 10
    }));

    this.reset();
    return [...items, ...pastedItems];
  }

  private clone<T>(value: T): T {
    return structuredClone(value);
  }

  private createId(): string {
    return `item_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
}
