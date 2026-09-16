import { Component, ChangeDetectionStrategy, input, output, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LucidePencil, LucideTrash2, LucideX, LucidePlus, LucideChevronDown, LucideChevronRight, LucideLink, LucideBook } from '@lucide/angular';
import { LinksItem, Session } from '../../models/session.model';
import { SessionLinkSelectorModalComponent } from '../session-link-selector-modal/session-link-selector-modal.component';

@Component({
  selector: 'app-session-links-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucidePencil, LucideTrash2, LucideX, LucidePlus, LucideChevronDown, LucideChevronRight, LucideLink, LucideBook, SessionLinkSelectorModalComponent],
  templateUrl: './session-links-item.component.html',
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class SessionLinksItemComponent {
  private router = inject(Router);

  item = input.required<LinksItem>();
  currentSessionId = input.required<string>();
  allSessions = input.required<Session[]>();

  update = output<LinksItem>();
  delete = output<void>();

  isExpanded = signal(true);
  isEditing = signal(false);
  selectorOpen = signal(false);

  // Sessioni collegate presenti tra quelle disponibili, i link orfani (sessione eliminata) vengono nascosti
  linkedSessions = computed<Session[]>(() => {
    const sessionsById = new Map<string, Session>(this.allSessions().map((s: Session) => [s.id, s]));
    return this.item().linkedSessionIds
      .map((id: string) => sessionsById.get(id))
      .filter((s): s is Session => !!s);
  });

  excludeSessionIds = computed(() => [this.currentSessionId(), ...this.item().linkedSessionIds]);

  toggleExpanded() {
    this.isExpanded.update(v => !v);
  }

  toggleEditing(event: Event) {
    event.stopPropagation();
    this.isEditing.update(v => !v);
  }

  confirmDelete(event: Event) {
    event.stopPropagation();
    this.delete.emit();
  }

  openSelector() {
    this.selectorOpen.set(true);
  }

  onSelectorClose() {
    this.selectorOpen.set(false);
  }

  onSelectorConfirm(sessionIds: string[]) {
    this.selectorOpen.set(false);
    const merged = Array.from(new Set([...this.item().linkedSessionIds, ...sessionIds]));
    this.update.emit({ ...this.item(), linkedSessionIds: merged });
  }

  removeLink(sessionId: string) {
    this.update.emit({
      ...this.item(),
      linkedSessionIds: this.item().linkedSessionIds.filter((id: string) => id !== sessionId)
    });
  }

  navigateToSession(sessionId: string) {
    this.router.navigate(['/sessions', sessionId]);
  }
}
