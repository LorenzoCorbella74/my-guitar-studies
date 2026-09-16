import { Component, ChangeDetectionStrategy, input, output, signal, effect, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideSearch, LucideBook } from '@lucide/angular';
import { Session } from '../../models/session.model';

@Component({
  selector: 'app-session-link-selector-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, LucideSearch, LucideBook],
  templateUrl: './session-link-selector-modal.component.html',
  styles: [`
    :host {
      display: contents;
    }
  `]
})
export class SessionLinkSelectorModalComponent {
  isOpen = input.required<boolean>();
  allSessions = input.required<Session[]>();
  excludeSessionIds = input<string[]>([]);

  close = output<void>();
  confirm = output<string[]>();

  searchQuery = signal('');
  selectedSessionIds = signal<Set<string>>(new Set());

  availableSessions = computed(() => {
    const excluded = new Set(this.excludeSessionIds());
    return this.allSessions().filter(s => !excluded.has(s.id));
  });

  filteredSessions = computed(() => {
    const query = this.searchQuery().toLowerCase();
    if (!query) return this.availableSessions();

    return this.availableSessions().filter(s =>
      s.title.toLowerCase().includes(query) ||
      s.tags.some(tag => tag.toLowerCase().includes(query))
    );
  });

  constructor() {
    effect(() => {
      if (!this.isOpen()) {
        this.searchQuery.set('');
        this.selectedSessionIds.set(new Set());
      }
    });
  }

  onBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }

  onClose() {
    this.close.emit();
  }

  toggleSession(sessionId: string) {
    this.selectedSessionIds.update(set => {
      const newSet = new Set(set);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  }

  isSelected(sessionId: string): boolean {
    return this.selectedSessionIds().has(sessionId);
  }

  selectAll() {
    const allIds = new Set(this.filteredSessions().map(s => s.id));
    this.selectedSessionIds.set(allIds);
  }

  deselectAll() {
    this.selectedSessionIds.set(new Set());
  }

  onConfirm() {
    const selectedIds = Array.from(this.selectedSessionIds());
    if (selectedIds.length > 0) {
      this.confirm.emit(selectedIds);
    }
  }
}
