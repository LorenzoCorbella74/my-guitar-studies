import { Component, ChangeDetectionStrategy, inject, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SessionService } from '../../services/session.service';
import { Session, SessionSortBy } from '../../models/session.model';
import { AppRoutes } from '../../enums/routes.enum';
import { LucidePlus, LucideHeart, LucideTrash, LucideX, LucideCalendar, LucideArrowUp, LucideArrowDown, LucideArrowDownAZ, LucideArrowUpAZ, LucideList, LucideGrid } from "@lucide/angular";
import { TagService } from '../../services/tag.service';
import { ConfirmService } from '../../services/confirm.service';

@Component({
  selector: 'sessions-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LucidePlus, LucideHeart, LucideTrash, LucideX, LucideCalendar, LucideArrowUp, LucideArrowDown, LucideArrowDownAZ, LucideArrowUpAZ, LucideList, LucideGrid],
  templateUrl: './sessions.component.html'
})
export class SessionsListPage implements OnInit {
  sessionService = inject(SessionService);
  tagService = inject(TagService);
  confirmService = inject(ConfirmService);

  routes = AppRoutes;

  filterTags = signal<string[]>([]);
  tagSearchQuery = signal<string>('');
  tagDropdownOpen = signal(false);
  filterFavorites = signal(false);
  sortBy = signal<SessionSortBy>('updatedAt_desc');
  viewMode = signal<'card' | 'table'>('card');

  filteredSessions = signal<Session[]>([]);

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
    await this.sessionService.loadSessions();
    await this.tagService.loadTags();
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
    const tags = this.filterTags();
    const favorites = this.filterFavorites();
    const sort = this.sortBy();

    if (tags.length > 0) {
      sessions = sessions.filter(s => tags.every(t => s.tags.includes(t)));
    }
    if (favorites) {
      sessions = sessions.filter(s => s.isFavorite);
    }

    if (sort === 'title_asc') {
      sessions = [...sessions].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === 'title_desc') {
      sessions = [...sessions].sort((a, b) => b.title.localeCompare(a.title));
    } else if (sort === 'updatedAt_asc') {
      sessions = [...sessions].sort((a, b) => (a.updatedAt?.getTime() || 0) - (b.updatedAt?.getTime() || 0));
    } else {
      sessions = [...sessions].sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0));
    }

    this.filteredSessions.set(sessions);
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
}