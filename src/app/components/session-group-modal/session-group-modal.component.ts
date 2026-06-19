import { Component, ChangeDetectionStrategy, input, output, signal, effect, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CdkDrag, CdkDropList, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { LucideX, LucideUnlink, LucideGripVertical, LucideHeart } from '@lucide/angular';
import { SessionGroup, Session } from '../../models/session.model';
import { TagService } from '../../services/tag.service';
import { AppRoutes } from '../../enums/routes.enum';
import { SessionService } from '../../services/session.service';

@Component({
  selector: 'app-session-group-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, CdkDrag, CdkDropList, LucideX, LucideUnlink, LucideGripVertical, LucideHeart],
  templateUrl: './session-group-modal.component.html',
  styles: [`
    :host {
      display: contents;
    }
    
    .cdk-drag-preview {
      opacity: 0.8;
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
      border-radius: 0.5rem;
    }

    .cdk-drag-placeholder {
      opacity: 0.3;
    }
  `]
})
export class SessionGroupModalComponent {

  private tagService = inject(TagService);
  private sessionService = inject(SessionService);
  
  isOpen = input.required<boolean>();
  group = input<SessionGroup | null>(null);
  sessions = input<Session[]>([]);
  
  close = output<void>();
  confirm = output<{ name: string; tags: string[]; sessions?: Session[] }>();
  unlinkSession = output<string>();
  
  routes = AppRoutes;
  
  groupName = signal('');
  groupTags = signal<string[]>([]);
  tagQuery = signal('');
  tagDropdownOpen = signal(false);
  localSessions = signal<Session[]>([]);
  hasReordered = signal(false);
  
  groupSessions = computed(() => {
    const local = this.localSessions();
    if (local.length > 0) return local;
    
    const grp = this.group();
    if (!grp) return [];
    return this.sessions()
      .filter(s => s.groupId === grp.id)
      .sort((a, b) => (a.groupOrder ?? 0) - (b.groupOrder ?? 0));
  });
  
  tagSuggestions = computed(() => {
    const query = this.tagQuery().toLowerCase();
    const used = this.groupTags();
    return this.tagService.tags().filter(
      t => !used.includes(t.name) && t.name.toLowerCase().includes(query)
    );
  });
  
  constructor() {
    effect(() => {
      const grp = this.group();
      if (grp) {
        this.groupName.set(grp.name);
        this.groupTags.set([...grp.tags]);
      } else {
        this.groupName.set('');
        this.groupTags.set([]);
      }
      this.tagQuery.set('');
      this.tagDropdownOpen.set(false);
      this.localSessions.set([]);
      this.hasReordered.set(false);
    });
  }
  
  onBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }
  
  addTagFromInput(event: Event) {
    event.preventDefault();
    const tag = this.tagQuery().trim();
    if (!tag) return;
    this.selectTag(tag);
  }
  
  selectTag(name: string) {
    if (this.groupTags().includes(name)) {
      this.tagQuery.set('');
      return;
    }
    this.groupTags.update(tags => [...tags, name]);
    
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
  
  removeTag(tag: string) {
    this.groupTags.update(tags => tags.filter(t => t !== tag));
  }
  
  onSessionDrop(event: CdkDragDrop<Session[]>) {
    const sessions = [...this.groupSessions()];
    moveItemInArray(sessions, event.previousIndex, event.currentIndex);
    this.localSessions.set(sessions);
    this.hasReordered.set(true);
  }
  
  onSessionClick() {
    // Chiudi la modale con un delay per permettere al router di navigare
    setTimeout(() => this.close.emit(), 50);
  }

    async toggleFavorite(id: string, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    await this.sessionService.toggleFavorite(id);
  }
  
  save() {
    const name = this.groupName().trim();
    if (!name) return;
    
    this.confirm.emit({
      name,
      tags: this.groupTags(),
      sessions: this.hasReordered() ? this.localSessions() : undefined
    });
  }
}
