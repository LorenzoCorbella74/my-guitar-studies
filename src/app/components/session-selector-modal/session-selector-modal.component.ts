import { Component, ChangeDetectionStrategy, input, output, signal, effect, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideSearch, LucideBook } from '@lucide/angular';
import { Session } from '../../models/session.model';
import { PlanMilestone } from '../../models/study-plan.model';
import { SessionService } from '../../services/session.service';

@Component({
  selector: 'app-session-selector-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, LucideSearch, LucideBook],
  templateUrl: './session-selector-modal.component.html',
  styles: [`
    :host {
      display: contents;
    }
  `]
})
export class SessionSelectorModalComponent {
  private sessionService = inject(SessionService);
  
  isOpen = input.required<boolean>();
  milestone = input.required<PlanMilestone>();
  
  close = output<void>();
  confirm = output<string[]>();
  
  searchQuery = signal('');
  selectedSessionIds = signal<Set<string>>(new Set());
  
  availableSessions = computed(() => {
    const milestone = this.milestone();
    const existingIds = new Set(milestone.sessions.map(s => s.sessionId));
    return this.sessionService.sessions().filter(s => !existingIds.has(s.id));
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
