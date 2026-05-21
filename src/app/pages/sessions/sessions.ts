import { Component, ChangeDetectionStrategy, inject, OnInit, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CdkDrag, CdkDropList, CdkDragDrop, CdkDragEnter } from '@angular/cdk/drag-drop';
import { SessionService } from '../../services/session.service';
import { Session, SessionGroup, SessionSortBy } from '../../models/session.model';
import { AppRoutes } from '../../enums/routes.enum';
import { LucidePlus, LucideHeart, LucideTrash, LucideX, LucideCalendar, LucideArrowUp, LucideArrowDown, LucideArrowDownAZ, LucideArrowUpAZ, LucideList, LucideGrid, LucideFolderOpen, LucidePencil, LucideFileText } from "@lucide/angular";
import { TagService } from '../../services/tag.service';
import { ConfirmService } from '../../services/confirm.service';
import { fadeSlideUp, listStagger } from '../../animations';
import { SessionGroupModalComponent } from '../../components/session-group-modal/session-group-modal.component';

@Component({
  selector: 'sessions-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CdkDrag, CdkDropList, SessionGroupModalComponent, LucidePlus, LucideHeart, LucideTrash, LucideX, LucideCalendar, LucideArrowUp, LucideArrowDown, LucideArrowDownAZ, LucideArrowUpAZ, LucideList, LucideGrid, LucideFolderOpen, LucidePencil, LucideFileText],
  templateUrl: './sessions.component.html',
  animations: [fadeSlideUp, listStagger],
  styles: [`
    :host {
      display: block;
    }
    
    .cdk-drag-preview {
      opacity: 0.8;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      border-radius: 0.5rem;
    }

    .cdk-drag-placeholder {
      opacity: 0.3;
    }
    
    .cdk-drag-animating {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
  `]
})
export class SessionsListPage implements OnInit {
  sessionService = inject(SessionService);
  tagService = inject(TagService);
  confirmService = inject(ConfirmService);
  router = inject(Router);

  routes = AppRoutes;

  filterTags = signal<string[]>([]);
  tagSearchQuery = signal<string>('');
  tagDropdownOpen = signal(false);
  filterFavorites = signal(false);
  sortBy = signal<SessionSortBy>('updatedAt_desc');
  viewMode = signal<'card' | 'table'>('card');
  
  addDropdownOpen = signal(false);
  groupModalOpen = signal(false);
  selectedGroup = signal<SessionGroup | null>(null);
  dragOverGroupId = signal<string | null>(null);
  
  // IDs per collegare i drop lists
  allDropListIds = computed(() => {
    const groupIds = this.sessionService.groups().map(g => `group-${g.id}`);
    return ['loose-sessions', ...groupIds];
  });

  filteredSessions = signal<Session[]>([]);
  filteredGroups = signal<SessionGroup[]>([]);

  isDateSort = computed(() => this.sortBy() === 'updatedAt_desc' || this.sortBy() === 'updatedAt_asc');
  isTitleSort = computed(() => this.sortBy() === 'title_asc' || this.sortBy() === 'title_desc');

  availableTagOptions = computed(() => {
    const query = this.tagSearchQuery().toLowerCase();
    const selected = this.filterTags();
    return this.tagService.tags().filter(
      t => !selected.includes(t.name) && t.name.toLowerCase().includes(query)
    );
  });

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    await Promise.all([
      this.sessionService.loadSessions(),
      this.sessionService.loadGroups(),
      this.tagService.loadTags()
    ]);
    this.updateFiltered();
  }

  addFilterTag(name: string) {
    if (!this.filterTags().includes(name)) {
      this.filterTags.update(tags => [...tags, name]);
      this.updateFiltered();
    }
    this.tagSearchQuery.set('');
    this.tagDropdownOpen.set(false);
  }

  removeFilterTag(name: string, event: Event) {
    event.stopPropagation();
    this.filterTags.update(tags => tags.filter(t => t !== name));
    this.updateFiltered();
  }

  onTagInputBlur() {
    // Piccolo delay per permettere il click sul dropdown
    setTimeout(() => this.tagDropdownOpen.set(false), 150);
  }

  onFilterFavoritesChange() {
    this.filterFavorites.update(v => !v);
    this.updateFiltered();
  }

  toggleViewMode() {
    this.viewMode.update(v => v === 'card' ? 'table' : 'card');
  }

  toggleDateSort() {
    this.sortBy.update(s => s === 'updatedAt_desc' ? 'updatedAt_asc' : 'updatedAt_desc');
    this.updateFiltered();
  }

  toggleTitleSort() {
    if (!this.isTitleSort()) {
      this.sortBy.set('title_asc');
    } else {
      this.sortBy.update(s => s === 'title_asc' ? 'title_desc' : 'title_asc');
    }
    this.updateFiltered();
  }

  updateFiltered() {
    let sessions = this.sessionService.sessions();
    let groups = this.sessionService.groups();
    const tags = this.filterTags();
    const favorites = this.filterFavorites();
    const sort = this.sortBy();

    // Filtra sessioni
    if (tags.length > 0) {
      sessions = sessions.filter(s => {
        // Una sessione matcha se:
        // 1. Ha tutti i tag richiesti tra i suoi tag propri
        // 2. Oppure è in un gruppo che ha tutti i tag richiesti
        const hasOwnTags = tags.every(t => s.tags.includes(t));
        if (hasOwnTags) return true;
        
        if (s.groupId) {
          const group = groups.find(g => g.id === s.groupId);
          if (group) {
            return tags.every(t => group.tags.includes(t));
          }
        }
        return false;
      });
    }
    
    if (favorites) {
      sessions = sessions.filter(s => s.isFavorite);
    }

    // Filtra gruppi
    if (tags.length > 0) {
      groups = groups.filter(g => tags.every(t => g.tags.includes(t)));
    }
    
    if (favorites) {
      groups = groups.filter(g => g.isFavorite);
    }

    // Ordina sessioni
    if (sort === 'title_asc') {
      sessions = [...sessions].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === 'title_desc') {
      sessions = [...sessions].sort((a, b) => b.title.localeCompare(a.title));
    } else if (sort === 'updatedAt_asc') {
      sessions = [...sessions].sort((a, b) => (a.updatedAt?.getTime() || 0) - (b.updatedAt?.getTime() || 0));
    } else {
      sessions = [...sessions].sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0));
    }
    
    // Ordina gruppi per data (sempre)
    groups = [...groups].sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0));

    this.filteredSessions.set(sessions);
    this.filteredGroups.set(groups);
  }

  async toggleFavorite(id: string, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    await this.sessionService.toggleFavorite(id);
    this.loadData();
  }

  confirmDelete(session: Session, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    
    this.confirmService.show(
      'Elimina sessione?',
      `Sei sicuro di voler eliminare "${session.title}"?`,
      async () => {
        await this.sessionService.deleteSession(session.id);
        this.loadData();
      }
    );
  }

  // ====== ADD DROPDOWN ======
  
  toggleAddDropdown() {
    this.addDropdownOpen.update(v => !v);
  }
  
  onAddDropdownBlur() {
    setTimeout(() => this.addDropdownOpen.set(false), 150);
  }
  
  createNewSession() {
    this.addDropdownOpen.set(false);
    this.router.navigate(['/', this.routes.SessionNew]);
  }
  
  openNewGroupModal() {
    this.addDropdownOpen.set(false);
    this.selectedGroup.set(null);
    this.groupModalOpen.set(true);
  }

  // ====== GROUP METHODS ======
  
  openGroupModal(group: SessionGroup) {
    this.selectedGroup.set(group);
    this.groupModalOpen.set(true);
  }
  
  closeGroupModal() {
    this.groupModalOpen.set(false);
    this.selectedGroup.set(null);
  }
  
  async confirmGroupModal(data: { name: string; tags: string[] }) {
    const group = this.selectedGroup();
    
    if (group) {
      await this.sessionService.updateGroup(group.id, { name: data.name, tags: data.tags });
    } else {
      await this.sessionService.createGroup(data.name, data.tags);
    }
    
    this.closeGroupModal();
    this.loadData();
  }
  
  async unlinkSessionFromGroup(sessionId: string) {
    await this.sessionService.removeSessionFromGroup(sessionId);
    this.loadData();
  }
  
  async toggleGroupFavorite(id: string, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    await this.sessionService.toggleGroupFavorite(id);
    this.loadData();
  }
  
  confirmDeleteGroup(group: SessionGroup, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    
    const sessionCount = this.sessionService.getSessionsInGroup(group.id).length;
    const message = sessionCount > 0 
      ? `Sei sicuro di voler eliminare "${group.name}"? Le ${sessionCount} sessioni contenute diventeranno indipendenti.`
      : `Sei sicuro di voler eliminare "${group.name}"?`;
    
    this.confirmService.show(
      'Elimina gruppo?',
      message,
      async () => {
        await this.sessionService.deleteGroup(group.id);
        this.loadData();
      }
    );
  }
  
  // ====== DRAG & DROP ======
  
  onSessionDragEnter(event: CdkDragEnter, groupId: string) {
    this.dragOverGroupId.set(groupId);
  }
  
  onSessionDragExit() {
    this.dragOverGroupId.set(null);
  }
  
  onSessionDrop(event: CdkDragDrop<any>) {
    this.dragOverGroupId.set(null);
    
    const sessionId = event.item.data as string;
    if (!sessionId) return;
    
    // Se proviene dalla lista "loose-sessions" e viene droppato su un gruppo
    if (event.previousContainer !== event.container) {
      const containerId = event.container.id;
      if (containerId.startsWith('group-')) {
        const groupId = containerId.replace('group-', '');
        this.sessionService.addSessionToGroup(sessionId, groupId).then(() => {
          this.loadData();
        });
      }
    }
  }
  
  canDropOnGroup = (item: CdkDrag): boolean => {
    // Permette di droppare solo se l'item ha dati (è una sessione)
    return !!item.data;
  };
}