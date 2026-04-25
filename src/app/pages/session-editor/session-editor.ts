import { Component, ChangeDetectionStrategy, inject, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SessionService } from '../../services/session.service';
import { AppRoutes } from '../../enums/routes.enum';
import { TagService } from '../../services/tag.service';
import { FormsModule } from '@angular/forms';
import { LucideX, LucideSave } from '@lucide/angular';
import { SessionItem, SectionItem, ComparisonItem, ScaleItem, ArpeggioItem, ChordItem, ChordProgressionItem } from '../../models/session.model';
import { SectionEditorComponent } from '../../components/section-editor/section-editor.component';
import { ItemSelectorComponent, ItemType } from '../../components/item-selector/item-selector.component';
import { ComparisonTableComponent } from '../../components/comparison-table/comparison-table.component';
import { ScaleVisualizationComponent } from '../../components/scale-visualization/scale-visualization.component';
import { ChordProgressionComponent } from '../../components/chord-progression/chord-progression.component';
import { ConfirmService } from '../../services/confirm.service';

@Component({
  selector: 'session-editor-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, LucideX, LucideSave, SectionEditorComponent, ItemSelectorComponent, ComparisonTableComponent, ScaleVisualizationComponent, ChordProgressionComponent],
  template: `
    <div class="min-h-screen bg-base-200">
      <div class="sticky top-0 z-50 bg-base-100 shadow-sm">
        <div class="max-w-5xl mx-auto px-4 py-3">
          <div class="flex justify-between items-center">
            <a routerLink="/sessions" class="btn btn-ghost btn-sm">
              ← Torna alle sessioni
            </a>
            @if (!notFound()) {
              <div class="flex gap-2">
                <app-item-selector (itemSelected)="addItem($event)" />
                <button class="btn btn-primary btn-sm" (click)="save()" [disabled]="saving()">
                  <svg lucideSave class="w-4 h-4"></svg> Salva
                </button>
              </div>
            }
          </div>
        </div>
      </div>
      <div class="max-w-5xl mx-auto px-4 pt-4 pb-8">
        
        @if (notFound()) {
          <div class="card bg-base-100 shadow-md">
            <div class="card-body">
              <h2 class="card-title text-error">Sessione non trovata</h2>
              <div class="card-actions">
                <a routerLink="/sessions" class="btn btn-primary">Torna alla lista</a>
              </div>
            </div>
          </div>
        } @else {
          <!-- Title and Tags Row -->
          <div class="grid grid-cols-2 gap-4 mb-4">
            <!-- Title Section -->
            <div class="flex items-center gap-4">
              <h3 class="shrink-0"><strong>Titolo</strong></h3>
              <input
                type="text"
                class="input input-bordered flex-1"
                [(ngModel)]="title"
                placeholder="Titolo della sessione"
              />
            </div>
            
            <!-- Tag Section -->
            <div class="flex items-center gap-4">
              <h3 class="shrink-0"><strong>Tag</strong></h3>
              <div class="dropdown flex-1">
                <div class="input input-bordered flex flex-wrap items-center gap-1 min-h-[2.5rem] h-auto py-1 cursor-text w-full"
                     (click)="tagInput.focus()">
                  @for (tag of sessionTags(); track tag) {
                    <span class="badge badge-primary gap-1">
                      {{ tag }}
                      <button type="button" (click)="removeTag(tag, $event)" [attr.aria-label]="'Rimuovi tag ' + tag">
                        <svg lucideX class="w-3 h-3"></svg>
                      </button>
                    </span>
                  }
                  <input
                    #tagInput
                    type="text"
                    class="outline-none bg-transparent flex-1 min-w-[80px] text-sm"
                    [placeholder]="sessionTags().length === 0 ? 'Aggiungi tag...' : ''"
                    [value]="tagQuery()"
                    (input)="tagQuery.set($any($event.target).value)"
                    (focus)="tagDropdownOpen.set(true)"
                    (blur)="onTagBlur()"
                    (keydown.enter)="addTagFromInput($event)"
                    (keydown.escape)="tagDropdownOpen.set(false)"
                    aria-label="Aggiungi tag"
                    autocomplete="off"
                  />
                </div>
                @if (tagDropdownOpen() && tagSuggestions().length > 0) {
                  <ul class="dropdown-content menu bg-base-100 rounded-box z-10 w-full shadow mt-1 max-h-48 overflow-y-auto flex-nowrap">
                    @for (tag of tagSuggestions(); track tag.id) {
                      <li>
                        <button type="button" (mousedown)="selectTag(tag.name)">{{ tag.name }}</button>
                      </li>
                    }
                  </ul>
                }
              </div>
            </div>
          </div>
        }

        @if (!notFound()) {
          <!-- Items Section -->
          <div class="space-y-4 mb-4">
            
            @if (items().length === 0) {
              <div class="card bg-base-100 shadow-md">
                <div class="card-body">
                  <p class="text-base-content/60 text-center">
                    Nessun elemento aggiunto. Usa il pulsante qui sotto per iniziare.
                  </p>
                </div>
              </div>
            }
            
            @for (item of items(); track item.id) {
              @if (item.type === 'section') {
                <app-section-editor
                  [section]="$any(item)"
                  [editMode]="editingItemId() === item.id"
                  (edit)="editingItemId.set(item.id)"
                  (save)="updateSection(item.id, $event)"
                  (delete)="deleteItem(item.id)"
                />
              }
              @if (item.type === 'scale' || item.type === 'arpeggio' || item.type === 'chord') {
                <app-scale-visualization
                  [scaleItem]="$any(item)"
                  (update)="updateScale(item.id, $event)"
                  (delete)="deleteItem(item.id)"
                  (cancelFirstConfig)="removeItemSilently(item.id)"
                />
              }
              @if (item.type === 'comparison') {
                <app-comparison-table
                  [comparison]="$any(item)"
                  (update)="updateComparison(item.id, $event)"
                  (delete)="deleteItem(item.id)"
                />
              }
              @if (item.type === 'chordprogression') {
                <app-chord-progression
                  [progression]="$any(item)"
                  (update)="updateChordProgression(item.id, $event)"
                  (deleteProgression)="deleteItem(item.id)"
                />
              }
            }
          </div>
        }
      </div>
    </div>
  `
})
export class SessionEditorPage implements OnInit {
  private sessionService = inject(SessionService);
  private tagService = inject(TagService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private confirmService = inject(ConfirmService);

  routes = AppRoutes;

  sessionId = signal<string>('');
  title = signal<string>('');
  sessionTags = signal<string[]>([]);
  items = signal<SessionItem[]>([]);
  editingItemId = signal<string | null>(null);
  saving = signal(false);
  notFound = signal(false);

  tagQuery = signal('');
  tagDropdownOpen = signal(false);

  tagSuggestions = computed(() => {
    const query = this.tagQuery().toLowerCase();
    const used = this.sessionTags();
    return this.tagService.tags().filter(
      t => !used.includes(t.name) && t.name.toLowerCase().includes(query)
    );
  });

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');

    await this.tagService.loadTags();

    if (!id || id === 'new') {
       this.title.set('Nuova sessione');
      return;
    }

    this.sessionId.set(id);
    const session = await this.sessionService.getSession(id);

    if (!session) {
      this.notFound.set(true);
      return;
    }
    this.title.set(session.title);
    this.sessionTags.set(session.tags);
    this.items.set(session.items || []);
  }

  private async createNewSession() {
    const id = await this.sessionService.createSession(this.title());
    this.sessionId.set(id);
    this.router.navigate(['/sessions', id]);
  }

  async save(): Promise<void> {
    const id = this.sessionId();
    this.saving.set(true);
    try {
      if (!id){
        await this.createNewSession();
      } else {
        await this.sessionService.updateSession(id, {
          title: this.title(),
          tags: this.sessionTags(),
          items: this.items()
        });
      }
    } finally {
      this.saving.set(false);
      this.router.navigate(['/sessions']);
    }
  }

  addTagFromInput(event: Event) {
    event.preventDefault();
    const tag = this.tagQuery().trim();
    if (!tag) return;
    this.selectTag(tag);
  }

  selectTag(name: string) {
    if (this.sessionTags().includes(name)) {
      this.tagQuery.set('');
      return;
    }
    this.sessionTags.update(tags => [...tags, name]);

    const existsGlobally = this.tagService.tags().some(t => t.name === name);
    if (!existsGlobally) {
      this.tagService.createTag(name).catch(e => console.error('createTag error:', e));
    }
    this.tagQuery.set('');
    this.tagDropdownOpen.set(false);
  }

  onTagBlur() {
    setTimeout(() => this.tagDropdownOpen.set(false), 150);
  }

  removeTag(tag: string, event: Event) {
    event.stopPropagation();
    this.sessionTags.update(tags => tags.filter(t => t !== tag));
  }

  addItem(type: ItemType) {
    const newOrder = this.items().length;
    const newId = `item_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    
    if (type === 'section') {
      const newSection: SectionItem = {
        id: newId,
        type: 'section',
        order: newOrder,
        title: '',
        content: ''
      };
      this.items.update(items => [...items, newSection]);
      this.editingItemId.set(newId);
    } else if (type === 'comparison') {
      const newComparison: ComparisonItem = {
        id: newId,
        type: 'comparison',
        order: newOrder,
        items: []
      };
      this.items.update(items => [...items, newComparison]);
    } else if (type === 'scale') {
      const newScale: ScaleItem = {
        id: newId,
        type: 'scale',
        order: newOrder,
        config: {
          tuning: [],
          root: '',
          labelMode: 'note',
          colorMode: 'all',
          showChordDegrees: false,
          noteOpacity: 0.9,
          startFret: 0,
          endFret: 12
        },
        noteVisibility: {}
      };
      this.items.update(items => [...items, newScale]);
    } else if (type === 'arpeggio') {
      const newArpeggio: ArpeggioItem = {
        id: newId,
        type: 'arpeggio',
        order: newOrder,
        config: {
          tuning: [],
          root: '',
          labelMode: 'note',
          colorMode: 'all',
          showChordDegrees: false,
          noteOpacity: 0.9,
          startFret: 0,
          endFret: 12
        },
        noteVisibility: {}
      };
      this.items.update(items => [...items, newArpeggio]);
    } else if (type === 'chord') {
      const newChord: ChordItem = {
        id: newId,
        type: 'chord',
        order: newOrder,
        config: {
          tuning: [],
          root: '',
          labelMode: 'note',
          colorMode: 'all',
          showChordDegrees: false,
          noteOpacity: 0.9,
          startFret: 0,
          endFret: 12
        },
        noteVisibility: {}
      };
      this.items.update(items => [...items, newChord]);
    } else if (type === 'chordprogression') {
      const newChordProgression: ChordProgressionItem = {
        id: newId,
        type: 'chordprogression',
        order: newOrder,
        chords: []
      };
      this.items.update(items => [...items, newChordProgression]);
    }
  }

  updateSection(itemId: string, data: { title: string; content: string }) {
    this.items.update(items =>
      items.map(item => {
        if (item.id === itemId && item.type === 'section') {
          return { ...item, title: data.title, content: data.content } as SectionItem;
        }
        return item;
      })
    );
    this.editingItemId.set(null);
  }

  updateComparison(itemId: string, updatedComparison: ComparisonItem) {
    this.items.update(items =>
      items.map(item => {
        if (item.id === itemId && item.type === 'comparison') {
          return { ...updatedComparison, id: itemId };
        }
        return item;
      })
    );
  }

  updateScale(itemId: string, updatedItem: ScaleItem | ArpeggioItem | ChordItem) {
    this.items.update(items =>
      items.map(item => {
        if (item.id === itemId && (item.type === 'scale' || item.type === 'arpeggio' || item.type === 'chord')) {
          return { ...updatedItem, id: itemId };
        }
        return item;
      })
    );
  }

  updateChordProgression(itemId: string, updatedProgression: ChordProgressionItem) {
    this.items.update(items =>
      items.map(item => {
        if (item.id === itemId && item.type === 'chordprogression') {
          return { ...updatedProgression, id: itemId };
        }
        return item;
      })
    );
  }

  deleteItem(itemId: string) {
    this.confirmService.show(
      'Elimina elemento?',
      'Sei sicuro di voler eliminare questo elemento?',
      () => {
        this.items.update(items => {
          const filtered = items.filter(item => item.id !== itemId);
          return filtered.map((item, index) => ({ ...item, order: index }));
        });
        
        if (this.editingItemId() === itemId) {
          this.editingItemId.set(null);
        }
      }
    );
  }

  removeItemSilently(itemId: string) {
    this.items.update(items => {
      const filtered = items.filter(item => item.id !== itemId);
      return filtered.map((item, index) => ({ ...item, order: index }));
    });
    
    if (this.editingItemId() === itemId) {
      this.editingItemId.set(null);
    }
  }
}