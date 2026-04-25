import { Component, ChangeDetectionStrategy, inject, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SessionService } from '../../services/session.service';
import { Session, SessionSortBy } from '../../models/session.model';
import { AppRoutes } from '../../enums/routes.enum';
import { LucidePlus, LucideHeart, LucideTrash, LucideX, LucideCalendar, LucideArrowUp, LucideArrowDown, LucideArrowDownAZ, LucideArrowUpAZ } from "@lucide/angular";
import { TagService } from '../../services/tag.service';
import { ConfirmService } from '../../services/confirm.service';

@Component({
  selector: 'sessions-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LucidePlus, LucideHeart, LucideTrash, LucideX, LucideCalendar, LucideArrowUp, LucideArrowDown, LucideArrowDownAZ, LucideArrowUpAZ],
  template: `
    <div class="min-h-screen bg-base-200">
      <div class="sticky top-0 z-10 bg-base-100 shadow-sm">
        <div class="max-w-5xl mx-auto px-4 py-4">
        <div class="flex flex-wrap gap-3">
          <!-- Multi-tag filter con dropdown -->
          <div class="dropdown flex-1 min-w-[200px]">
            <div class="input input-bordered flex flex-wrap items-center gap-1 min-h-[2.5rem] h-auto py-1 cursor-text"
                 (click)="tagInput.focus()">
              @for (tag of filterTags(); track tag) {
                <span class="badge badge-primary gap-1">
                  {{ tag }}
                  <button type="button" (click)="removeFilterTag(tag, $event)" aria-label="Rimuovi filtro tag {{ tag }}">
                    <svg lucideX class="w-3 h-3"></svg>
                  </button>
                </span>
              }
              <input
                #tagInput
                type="text"
                class="outline-none bg-transparent flex-1 min-w-[80px] text-sm"
                placeholder="{{ filterTags().length === 0 ? 'Filtra per tag...' : '' }}"
                [value]="tagSearchQuery()"
                (input)="tagSearchQuery.set($any($event.target).value)"
                (focus)="tagDropdownOpen.set(true)"
                (blur)="onTagInputBlur()"
                (keydown.escape)="tagDropdownOpen.set(false)"
                aria-label="Cerca tag"
                autocomplete="off"
              />
            </div>
            @if (tagDropdownOpen() && availableTagOptions().length > 0) {
              <ul class="dropdown-content menu bg-base-100 rounded-box z-10 w-full shadow mt-1 max-h-48 overflow-y-auto flex-nowrap">
                @for (tag of availableTagOptions(); track tag.id) {
                  <li>
                    <button type="button" (mousedown)="addFilterTag(tag.name)">
                      {{ tag.name }}
                    </button>
                  </li>
                }
              </ul>
            }
          </div>

          <button
            type="button"
            class="btn btn-ghost btn-sm flex items-center gap-2"
            (click)="onFilterFavoritesChange()"
            [attr.aria-label]="filterFavorites() ? 'Mostra tutte le sessioni' : 'Mostra solo preferiti'"
            [attr.aria-pressed]="filterFavorites()"
          >
            <svg lucideHeart [class]="filterFavorites() ? 'w-5 h-5 fill-red-500 text-red-500' : 'w-5 h-5'"></svg>
            <span class="label-text">Solo preferiti</span>
          </button>

          <div class="join">
            <button
              type="button"
              class="btn btn-sm join-item"
              [class.btn-primary]="isDateSort()"
              [class.btn-ghost]="!isDateSort()"
              (click)="toggleDateSort()"
              [attr.aria-label]="sortBy() === 'updatedAt_desc' ? 'Ordina per data: dal più recente' : 'Ordina per data: dal più vecchio'"
            >
              <svg lucideCalendar class="w-4 h-4"></svg>
              @if (sortBy() === 'updatedAt_asc') {
                <svg lucideArrowUp class="w-3 h-3"></svg>
              } @else {
                <svg lucideArrowDown class="w-3 h-3"></svg>
              }
            </button>
            <button
              type="button"
              class="btn btn-sm join-item"
              [class.btn-primary]="isTitleSort()"
              [class.btn-ghost]="!isTitleSort()"
              (click)="toggleTitleSort()"
              [attr.aria-label]="sortBy() === 'title_desc' ? 'Ordina per titolo: Z-A' : 'Ordina per titolo: A-Z'"
            >
              @if (sortBy() === 'title_desc' && isTitleSort()) {
                <svg lucideArrowUpAZ class="w-4 h-4"></svg>
              } @else {
                <svg lucideArrowDownAZ class="w-4 h-4"></svg>
              }
            </button>
          </div>

          <a [routerLink]="[ '/' + routes.SessionNew]" class="btn btn-primary">
            <svg lucidePlus class="w-5 h-5 mr-2"></svg>
            Nuova sessione
          </a>
        </div>
        </div>
      </div>

      <div class="max-w-5xl mx-auto px-4 pb-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          @for (session of filteredSessions(); track session.id) {
            <div class="card bg-base-100 shadow-md hover:shadow-lg transition-shadow">
              <div class="card-body">
                <div class="flex justify-between items-start gap-4">
                  <a [routerLink]="[ '/' + routes.SessionEdit.replace(':id', session.id)]" class="card-title hover:link hover:text-primary">
                    {{ session.title || 'Senza titolo' }}
                  </a>
                  <div class="flex items-center gap-1">
                    <button class="btn btn-ghost btn-sm" (click)="toggleFavorite(session.id, $event)" [attr.aria-label]="session.isFavorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'">
                      <svg lucideHeart [class]="session.isFavorite ? 'w-5 h-5 fill-red-500 text-red-500' : 'w-5 h-5'"></svg>
                    </button>
                    <button class="btn btn-ghost btn-sm" (click)="confirmDelete(session, $event)" aria-label="Elimina sessione">
                      <svg lucideTrash class="w-4 h-4"></svg>
                    </button>
                  </div>
                </div>
                
                <div class="flex flex-wrap gap-2 mt-2">
                  @for (tag of session.tags; track tag) {
                    <div class="badge badge-primary badge-outline">{{ tag }}</div>
                  }
                </div>
              </div>
            </div>
          } @empty {
            <div class="text-center py-12 text-base-content/60">
              <p class="text-lg">Nessuna sessione</p>
              <p class="text-sm">Crea la tua prima sessione!</p>
            </div>
          }
        </div>
      </div>
    </div>
  `
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