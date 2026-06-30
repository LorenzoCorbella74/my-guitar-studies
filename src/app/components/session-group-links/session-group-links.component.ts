import { Component, ChangeDetectionStrategy, input, signal, computed, inject, effect } from '@angular/core';
import { Router } from '@angular/router';
import { LucideFolderOpen } from '@lucide/angular';
import { Session, SessionGroup } from '../../models/session.model';

interface GroupLinkSection {
  id: string;
  name: string;
  isCurrent: boolean;
  sessions: Session[];
}

@Component({
  selector: 'app-session-group-links',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideFolderOpen],
  templateUrl: './session-group-links.component.html',
  styles: `
    :host {
      display: block;
    }
  `
})
export class SessionGroupLinksComponent {
  private router = inject(Router);

  // Input signals
  groupId = input<string>();
  groupName = input<string>();
  currentSessionId = input.required<string>();
  allGroups = input.required<SessionGroup[]>();
  allSessions = input.required<Session[]>();

  // State
  isOpen = signal(false);
  searchQuery = signal('');
  expandedGroupIds = signal<string[]>([]);

  constructor() {
    effect(() => {
      const currentGroupId = this.groupId();
      if (!currentGroupId) return;
      const expanded = this.expandedGroupIds();
      if (!expanded.includes(currentGroupId)) {
        this.expandedGroupIds.set([currentGroupId, ...expanded]);
      }
    });
  }

  private sortSessions(sessions: Session[]): Session[] {
    return [...sessions].sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) {
        return a.isFavorite ? -1 : 1;
      }
      return (a.title || '').localeCompare(b.title || '');
    });
  }

  private getSessionsForGroup(groupId: string): Session[] {
    const currentId = this.currentSessionId();
    const groupSessions = this.allSessions().filter(
      s => s.groupId === groupId && s.id !== currentId
    );
    return this.sortSessions(groupSessions);
  }

  currentGroupSection = computed<GroupLinkSection | null>(() => {
    const currentGroupId = this.groupId();
    if (!currentGroupId) return null;

    return {
      id: currentGroupId,
      name: this.groupName() || 'Gruppo corrente',
      isCurrent: true,
      sessions: this.getSessionsForGroup(currentGroupId)
    };
  });

  globalGroupSections = computed<GroupLinkSection[]>(() => {
    const currentGroupId = this.groupId();
    return this.allGroups()
      .filter(group => group.isGlobal && group.id !== currentGroupId)
      .map(group => ({
        id: group.id,
        name: group.name,
        isCurrent: false,
        sessions: this.getSessionsForGroup(group.id)
      }))
      .filter(section => section.sessions.length > 0);
  });

  filteredSections = computed<GroupLinkSection[]>(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const currentSection = this.currentGroupSection();
    const sections = currentSection
      ? [currentSection, ...this.globalGroupSections()]
      : this.globalGroupSections();

    return sections
      .map(section => {
        if (!query) return section;
        const filteredSessions = section.sessions.filter(session =>
          (session.title || 'Senza titolo').toLowerCase().includes(query)
        );
        return { ...section, sessions: filteredSessions };
      })
      .filter(section => section.sessions.length > 0);
  });

  totalLinks = computed(() =>
    this.filteredSections().reduce((acc, section) => acc + section.sessions.length, 0)
  );

  // Mostra il componente se ci sono sessioni nel gruppo corrente o nei gruppi globali
  shouldShow = computed(() => this.totalLinks() > 0);

  isGroupExpanded(groupId: string): boolean {
    return this.expandedGroupIds().includes(groupId);
  }

  toggleGroup(groupId: string) {
    this.expandedGroupIds.update(ids =>
      ids.includes(groupId) ? ids.filter(id => id !== groupId) : [...ids, groupId]
    );
  }

  togglePanel() {
    this.isOpen.update(open => !open);
  }

  panelLabel = computed(() => this.groupName() || 'Gruppi globali');

  navigateToSession(sessionId: string) {
    this.router.navigate(['/sessions', sessionId]);
    this.isOpen.set(false);
  }
}
