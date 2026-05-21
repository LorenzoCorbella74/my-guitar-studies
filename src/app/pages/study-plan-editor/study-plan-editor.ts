import { Component, ChangeDetectionStrategy, inject, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { CdkDrag, CdkDropList, CdkDragHandle, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { StudyPlanService } from '../../services/study-plan.service';
import { SessionService } from '../../services/session.service';
import { TagService } from '../../services/tag.service';
import { ConfirmService } from '../../services/confirm.service';
import { StudyPlan, PlanMilestone, PlanSessionItem } from '../../models/study-plan.model';
import { SessionSelectorModalComponent } from '../../components/session-selector-modal/session-selector-modal.component';
import { LucideArrowLeft, LucideSave, LucideX, LucideHeart, LucideTarget, LucidePlus, LucideGripVertical, LucideTrash, LucidePencil, LucideChevronDown, LucideChevronRight } from '@lucide/angular';
import { fadeSlideUp } from '../../animations';

@Component({
  selector: 'study-plan-editor-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FormsModule, DatePipe, CdkDrag, CdkDropList, CdkDragHandle, SessionSelectorModalComponent, LucideArrowLeft, LucideSave, LucideX, LucideHeart, LucideTarget, LucidePlus, LucideGripVertical, LucideTrash, LucidePencil, LucideChevronDown, LucideChevronRight],
  templateUrl: './study-plan-editor.component.html',
  animations: [fadeSlideUp],
  styles: [`
    :host {
      display: block;
    }
    
    .drag-handle {
      cursor: grab;
      display: flex;
      align-items: center;
      justify-content: center;
      color: oklch(var(--bc) / 0.4);
      transition: color 0.2s;
    }

    .drag-handle:hover {
      color: oklch(var(--bc) / 0.7);
    }

    .drag-handle:active {
      cursor: grabbing;
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

    .cdk-drop-list-dragging .milestone-item:not(.cdk-drag-placeholder) {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
  `]
})
export class StudyPlanEditorPage implements OnInit {
  // Milestone management component
  private studyPlanService = inject(StudyPlanService);
  private sessionService = inject(SessionService);
  private tagService = inject(TagService);
  private confirmService = inject(ConfirmService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  planId = signal<string>('');
  name = signal<string>('');
  description = signal<string>('');
  planTags = signal<string[]>([]);
  isFavorite = signal(false);
  milestones = signal<PlanMilestone[]>([]);
  
  saving = signal(false);
  notFound = signal(false);

  tagQuery = signal('');
  tagDropdownOpen = signal(false);
  
  expandedMilestoneId = signal<string | null>(null);
  editingMilestoneId = signal<string | null>(null);
  editingMilestoneName = signal<string>('');
  
  sessionSelectorOpen = signal(false);
  selectedMilestoneForSessions = signal<PlanMilestone | null>(null);

  canAddMilestone = computed(() => this.milestones().length < 10);

  tagSuggestions = computed(() => {
    const query = this.tagQuery().toLowerCase();
    const used = this.planTags();
    return this.tagService.tags().filter(
      t => !used.includes(t.name) && t.name.toLowerCase().includes(query)
    );
  });

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');

    await Promise.all([
      this.tagService.loadTags(),
      this.sessionService.loadSessions()
    ]);

    if (!id || id === 'new') {
      this.name.set('');
      return;
    }

    this.planId.set(id);
    const plan = await this.studyPlanService.getPlan(id);

    if (!plan) {
      this.notFound.set(true);
      return;
    }

    this.name.set(plan.name);
    this.description.set(plan.description || '');
    this.planTags.set(plan.tags);
    this.isFavorite.set(plan.isFavorite);
    this.milestones.set(plan.milestones || []);
  }

  private async createNewPlan() {
    const id = await this.studyPlanService.createPlan({
      name: this.name(),
      description: this.description(),
      tags: this.planTags(),
      isFavorite: this.isFavorite()
    });
    this.planId.set(id);
    this.router.navigate(['/study-plans', id]);
  }

  async save(): Promise<void> {
    const id = this.planId();
    this.saving.set(true);
    try {
      if (!id) {
        await this.createNewPlan();
      } else {
        await this.studyPlanService.updatePlan(id, {
          name: this.name(),
          description: this.description(),
          tags: this.planTags(),
          isFavorite: this.isFavorite(),
          milestones: this.milestones()
        });
      }
    } finally {
      this.saving.set(false);
      this.router.navigate(['/study-plans']);
    }
  }

  toggleFavorite() {
    this.isFavorite.update(v => !v);
  }

  addTagFromInput(event: Event) {
    event.preventDefault();
    const tag = this.tagQuery().trim();
    if (!tag) return;
    this.selectTag(tag);
  }

  selectTag(name: string) {
    if (this.planTags().includes(name)) {
      this.tagQuery.set('');
      return;
    }
    this.planTags.update(tags => [...tags, name]);

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
    this.planTags.update(tags => tags.filter(t => t !== tag));
  }

  // Milestone management
  toggleMilestone(milestoneId: string) {
    if (this.expandedMilestoneId() === milestoneId) {
      this.expandedMilestoneId.set(null);
    } else {
      this.expandedMilestoneId.set(milestoneId);
    }
  }

  addMilestone() {
    if (this.milestones().length >= 10) {
      alert('Puoi aggiungere massimo 10 milestone per piano');
      return;
    }

    const newMilestone: PlanMilestone = {
      id: crypto.randomUUID(),
      name: `Milestone ${this.milestones().length + 1}`,
      order: this.milestones().length,
      sessions: []
    };

    this.milestones.update(ms => [...ms, newMilestone]);
    this.expandedMilestoneId.set(newMilestone.id);
    this.editingMilestoneId.set(newMilestone.id);
    this.editingMilestoneName.set(newMilestone.name);
  }

  startEditMilestoneName(milestone: PlanMilestone) {
    this.editingMilestoneId.set(milestone.id);
    this.editingMilestoneName.set(milestone.name);
  }

  saveEditMilestoneName(milestoneId: string) {
    const newName = this.editingMilestoneName().trim();
    if (!newName) {
      this.cancelEditMilestoneName();
      return;
    }

    this.milestones.update(ms =>
      ms.map(m => m.id === milestoneId ? { ...m, name: newName } : m)
    );
    this.editingMilestoneId.set(null);
    this.editingMilestoneName.set('');
  }

  cancelEditMilestoneName() {
    this.editingMilestoneId.set(null);
    this.editingMilestoneName.set('');
  }

  deleteMilestone(milestone: PlanMilestone) {
    const sessionCount = milestone.sessions.length;
    const message = sessionCount > 0
      ? `Eliminare la milestone "${milestone.name}"? Contiene ${sessionCount} sessione/i.`
      : `Eliminare la milestone "${milestone.name}"?`;

    this.confirmService.show(
      'Elimina milestone?',
      message,
      () => {
        this.milestones.update(ms => ms.filter(m => m.id !== milestone.id));
        
        // Ricalcola l'ordine
        this.milestones.update(ms =>
          ms.map((m, idx) => ({ ...m, order: idx }))
        );

        if (this.expandedMilestoneId() === milestone.id) {
          this.expandedMilestoneId.set(null);
        }
      }
    );
  }

  onMilestoneDrop(event: CdkDragDrop<PlanMilestone[]>) {
    const milestonesCopy = [...this.milestones()];
    moveItemInArray(milestonesCopy, event.previousIndex, event.currentIndex);
    
    // Aggiorna l'ordine
    const reordered = milestonesCopy.map((m, idx) => ({ ...m, order: idx }));
    this.milestones.set(reordered);
  }

  // Session management
  openSessionSelector(milestone: PlanMilestone) {
    this.selectedMilestoneForSessions.set(milestone);
    this.sessionSelectorOpen.set(true);
  }

  closeSessionSelector() {
    this.sessionSelectorOpen.set(false);
    this.selectedMilestoneForSessions.set(null);
  }

  onSessionsSelected(sessionIds: string[]) {
    const milestone = this.selectedMilestoneForSessions();
    if (!milestone) return;

    const maxOrder = milestone.sessions.length > 0
      ? Math.max(...milestone.sessions.map(s => s.order))
      : -1;

    const newSessions: PlanSessionItem[] = sessionIds.map((sessionId, idx) => ({
      sessionId,
      order: maxOrder + 1 + idx,
      completionPercentage: 0,
      completed: false,
      completedAt: null
    }));

    this.milestones.update(ms =>
      ms.map(m => {
        if (m.id === milestone.id) {
          return {
            ...m,
            sessions: [...m.sessions, ...newSessions]
          };
        }
        return m;
      })
    );

    this.closeSessionSelector();
  }

  getSessionTitle(sessionId: string): string {
    const session = this.sessionService.sessions().find(s => s.id === sessionId);
    return session?.title || 'Sessione sconosciuta';
  }

  updateSessionCompletion(milestoneId: string, sessionId: string, percentage: number) {
    this.milestones.update(ms =>
      ms.map(m => {
        if (m.id === milestoneId) {
          return {
            ...m,
            sessions: m.sessions.map(s => {
              if (s.sessionId === sessionId) {
                const isCompleted = percentage === 100;
                const wasCompleted = s.completed;
                return {
                  ...s,
                  completionPercentage: percentage,
                  completed: isCompleted,
                  completedAt: isCompleted && !wasCompleted ? new Date() : (isCompleted ? s.completedAt : null)
                };
              }
              return s;
            })
          };
        }
        return m;
      })
    );
  }

  removeSessionFromMilestone(milestoneId: string, sessionId: string) {
    const milestone = this.milestones().find(m => m.id === milestoneId);
    if (!milestone) return;

    const sessionTitle = this.getSessionTitle(sessionId);
    
    this.confirmService.show(
      'Rimuovi sessione?',
      `Rimuovere "${sessionTitle}" da questa milestone?`,
      () => {
        this.milestones.update(ms =>
          ms.map(m => {
            if (m.id === milestoneId) {
              const filteredSessions = m.sessions.filter(s => s.sessionId !== sessionId);
              // Ricalcola l'ordine
              return {
                ...m,
                sessions: filteredSessions.map((s, idx) => ({ ...s, order: idx }))
              };
            }
            return m;
          })
        );
      }
    );
  }

  onMilestoneSessionDrop(event: CdkDragDrop<PlanSessionItem[]>, milestoneId: string) {
    this.milestones.update(ms =>
      ms.map(m => {
        if (m.id === milestoneId) {
          const sessionsCopy = [...m.sessions];
          moveItemInArray(sessionsCopy, event.previousIndex, event.currentIndex);
          // Aggiorna l'ordine
          const reordered = sessionsCopy.map((s, idx) => ({ ...s, order: idx }));
          return { ...m, sessions: reordered };
        }
        return m;
      })
    );
  }

  getMilestoneProgress(milestone: PlanMilestone): { completed: number; total: number; percentage: number } {
    const total = milestone.sessions.length;
    const completed = milestone.sessions.filter(s => s.completed).length;
    
    // Calcola la media delle percentuali di completamento
    const totalPercentage = milestone.sessions.reduce((sum, s) => sum + (s.completionPercentage || 0), 0);
    const percentage = total > 0 ? Math.round(totalPercentage / total) : 0;
    
    return { completed, total, percentage };
  }
}
