import { Component, ChangeDetectionStrategy, inject, OnInit, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SessionService } from '../../services/session.service';
import { AppRoutes } from '../../enums/routes.enum';
import { TagService } from '../../services/tag.service';
import { FormsModule } from '@angular/forms';
import { CdkDrag, CdkDropList, CdkDragHandle, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { LucideX, LucideSave, LucideGripVertical, LucideArrowLeft } from '@lucide/angular';
import { SessionItem, SectionItem, ComparisonItem, ScaleItem, ArpeggioItem, ChordItem, ChordProgressionItem, TimelineItem, TimelineLayer, ModalInterchangeItem } from '../../models/session.model';
import { SectionEditorComponent } from '../../components/section-editor/section-editor.component';
import { ItemSelectorComponent, ItemType } from '../../components/item-selector/item-selector.component';
import { ComparisonTableComponent } from '../../components/comparison-table/comparison-table.component';
import { ScaleVisualizationComponent } from '../../components/scale-visualization/scale-visualization.component';
import { ChordProgressionComponent } from '../../components/chord-progression/chord-progression.component';
import { TimelineVisualizationComponent } from '../../components/timeline-visualization/timeline-visualization.component';
import { ModalInterchangeComponent } from '../../components/modal-interchange/modal-interchange.component';
import { ChordProgressionNameDialogComponent } from '../../components/section-editor/dialogs/chord-progression-name-dialog.component';
import { ConfirmService } from '../../services/confirm.service';
import { fadeSlideUp } from '../../animations';

@Component({
  selector: 'session-editor-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, CdkDrag, CdkDropList, CdkDragHandle, LucideX, LucideSave, LucideGripVertical, LucideArrowLeft, SectionEditorComponent, ItemSelectorComponent, ComparisonTableComponent, ScaleVisualizationComponent, ChordProgressionComponent, TimelineVisualizationComponent, ModalInterchangeComponent, ChordProgressionNameDialogComponent],
  templateUrl: './session-editor.component.html',
  animations: [fadeSlideUp],
  styles: [`
    .drag-item-wrapper {
      position: relative;
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .drag-handle {
      cursor: grab;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.5rem;
      color: oklch(var(--bc) / 0.4);
      transition: color 0.2s;
      flex-shrink: 0;
      margin-top: 0.5rem;
    }

    .drag-handle:hover {
      color: oklch(var(--bc) / 0.7);
    }

    .drag-handle:active {
      cursor: grabbing;
    }

    .item-content {
      flex: 1;
      min-width: 0;
    }

    .cdk-drag-preview {
      opacity: 0.8;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      border-radius: 0.5rem;
    }

    .cdk-drag-placeholder {
      opacity: 0.3;
      border: 2px dashed oklch(var(--bc) / 0.3);
      border-radius: 0.5rem;
      background: oklch(var(--b1));
    }

    .cdk-drag-animating {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }

    .cdk-drop-list-dragging .drag-item-wrapper:not(.cdk-drag-placeholder) {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
  `]
})
export class SessionEditorPage implements OnInit {
  private sessionService = inject(SessionService);
  private tagService = inject(TagService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private confirmService = inject(ConfirmService);

  @ViewChild('itemsContainer') itemsContainer?: ElementRef<HTMLDivElement>;

  routes = AppRoutes;

  sessionId = signal<string>('');
  groupId = signal<string | undefined>(undefined);
  title = signal<string>('');
  sessionTags = signal<string[]>([]);
  items = signal<SessionItem[]>([]);
  editingItemId = signal<string | null>(null);
  saving = signal(false);
  notFound = signal(false);

  tagQuery = signal('');
  tagDropdownOpen = signal(false);
  chordProgressionDialogOpen = signal(false);

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
    this.groupId.set(session.groupId);
    this.sessionTags.set(session.tags);
    this.items.set(session.items || []);
  }

  private async createNewSession() {
    const id = await this.sessionService.createSession(this.title());
    this.sessionId.set(id);
    
    // Salva anche i tag e gli items se presenti
    if (this.sessionTags().length > 0 || this.items().length > 0) {
      await this.sessionService.updateSession(id, {
        tags: this.sessionTags(),
        items: this.items()
      });
    }
    
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
      this.navigateBack();
    }
  }

  goBack() {
    this.navigateBack();
  }

  private navigateBack() {
    const groupId = this.groupId();
    if (groupId) {
      this.router.navigate(['/sessions'], { queryParams: { openGroup: groupId } });
    } else {
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
      // Apri la modale per chiedere il nome
      this.chordProgressionDialogOpen.set(true);
    } else if (type === 'timeline') {
      const defaultLayer: TimelineLayer = {
        id: `layer_${Date.now()}`,
        root: 'C',
        chordType: 'major',        octave: 3,
        inversion: 'root',        duration: 0.25,
        activeNotes: {}
      };
      const newTimeline: TimelineItem = {
        id: newId,
        type: 'timeline',
        order: newOrder,
        bpm: 30,
        tuning: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
        layers: [defaultLayer]
      };
      this.items.update(items => [...items, newTimeline]);
    } else if (type === 'modalinterchange') {
      const newModalInterchange: ModalInterchangeItem = {
        id: newId,
        type: 'modalinterchange',
        order: newOrder,
        root: 'C',
        selectedMode1: null,
        selectedMode2: null
      };
      this.items.update(items => [...items, newModalInterchange]);
    }
    
    // Scroll to the newly added item
    /* setTimeout(() => { */
      const container = this.itemsContainer?.nativeElement;
      if (container && container.lastElementChild) {
        container.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
  /*   }, 150); */
  }

  handleChordProgressionNameConfirm(title: string) {
    const newOrder = this.items().length;
    const newId = `item_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    
    const newChordProgression: ChordProgressionItem = {
      id: newId,
      type: 'chordprogression',
      order: newOrder,
      title: title,
      chords: []
    };
    this.items.update(items => [...items, newChordProgression]);
    this.chordProgressionDialogOpen.set(false);
    
    // Scroll to the newly added item
    setTimeout(() => {
      const container = this.itemsContainer?.nativeElement;
      if (container && container.lastElementChild) {
        container.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 150);
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
  updateTimelineItem(itemId: string, updatedTimeline: TimelineItem) {
    this.items.update(items =>
      items.map(item => {
        if (item.id === itemId && item.type === 'timeline') {
          return updatedTimeline;
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

  cloneScale(clonedItem: ScaleItem | ArpeggioItem | ChordItem) {
    const newId = `item_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const newOrder = this.items().length;
    
    const newItem = {
      ...clonedItem,
      id: newId,
      order: newOrder
    };
    
    this.items.update(items => [...items, newItem]);
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

  updateModalInterchange(itemId: string, updatedModalInterchange: ModalInterchangeItem) {
    this.items.update(items =>
      items.map(item => {
        if (item.id === itemId && item.type === 'modalinterchange') {
          return { ...updatedModalInterchange, id: itemId };
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

  onItemDrop(event: CdkDragDrop<SessionItem[]>) {
    const itemsArray = [...this.items()];
    moveItemInArray(itemsArray, event.previousIndex, event.currentIndex);
    
    // Recalculate order field for all items
    const reorderedItems = itemsArray.map((item, index) => ({
      ...item,
      order: index * 10
    }));
    
    this.items.set(reorderedItems);
  }
}