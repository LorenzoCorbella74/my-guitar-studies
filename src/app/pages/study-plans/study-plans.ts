import { Component, ChangeDetectionStrategy, inject, OnInit, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { StudyPlanService } from '../../services/study-plan.service';
import { StudyPlan, PlanSortBy } from '../../models/study-plan.model';
import { LucidePlus, LucideHeart, LucideTrash, LucideX, LucideCalendar, LucideArrowUp, LucideArrowDown, LucideArrowDownAZ, LucideArrowUpAZ, LucideList, LucideGrid, LucideTarget, LucideClipboardList } from "@lucide/angular";
import { TagService } from '../../services/tag.service';
import { ConfirmService } from '../../services/confirm.service';
import { fadeSlideUp, listStagger } from '../../animations';

@Component({
  selector: 'study-plans-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LucidePlus, LucideHeart, LucideTrash, LucideX, LucideCalendar, LucideArrowUp, LucideArrowDown, LucideArrowDownAZ, LucideArrowUpAZ, LucideList, LucideGrid, LucideTarget, LucideClipboardList],
  templateUrl: './study-plans.component.html',
  animations: [fadeSlideUp, listStagger],
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class StudyPlansListPage implements OnInit {
  studyPlanService = inject(StudyPlanService);
  tagService = inject(TagService);
  confirmService = inject(ConfirmService);
  router = inject(Router);

  filterTags = signal<string[]>([]);
  tagSearchQuery = signal<string>('');
  tagDropdownOpen = signal(false);
  filterFavorites = signal(false);
  sortBy = signal<PlanSortBy>('updatedAt_desc');
  viewMode = signal<'card' | 'table'>('card');

  filteredPlans = signal<StudyPlan[]>([]);

  isDateSort = computed(() => this.sortBy() === 'updatedAt_desc' || this.sortBy() === 'updatedAt_asc');
  isTitleSort = computed(() => this.sortBy() === 'name_asc' || this.sortBy() === 'name_desc');
  isProgressSort = computed(() => this.sortBy() === 'progress_asc' || this.sortBy() === 'progress_desc');

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
      this.studyPlanService.loadPlans(),
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
      this.sortBy.set('name_asc');
    } else {
      this.sortBy.update(s => s === 'name_asc' ? 'name_desc' : 'name_asc');
    }
    this.updateFiltered();
  }

  toggleProgressSort() {
    if (!this.isProgressSort()) {
      this.sortBy.set('progress_desc');
    } else {
      this.sortBy.update(s => s === 'progress_desc' ? 'progress_asc' : 'progress_desc');
    }
    this.updateFiltered();
  }

  updateFiltered() {
    let plans = this.studyPlanService.plans();
    const tags = this.filterTags();
    const favorites = this.filterFavorites();
    const sort = this.sortBy();

    if (tags.length > 0) {
      plans = plans.filter(p => tags.every(t => p.tags.includes(t)));
    }
    if (favorites) {
      plans = plans.filter(p => p.isFavorite);
    }

    if (sort === 'name_asc') {
      plans = [...plans].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'name_desc') {
      plans = [...plans].sort((a, b) => b.name.localeCompare(a.name));
    } else if (sort === 'updatedAt_asc') {
      plans = [...plans].sort((a, b) => (a.updatedAt?.getTime() || 0) - (b.updatedAt?.getTime() || 0));
    } else if (sort === 'progress_asc') {
      plans = [...plans].sort((a, b) => {
        const progA = this.studyPlanService.getPlanProgress(a.id).percentage;
        const progB = this.studyPlanService.getPlanProgress(b.id).percentage;
        return progA - progB;
      });
    } else if (sort === 'progress_desc') {
      plans = [...plans].sort((a, b) => {
        const progA = this.studyPlanService.getPlanProgress(a.id).percentage;
        const progB = this.studyPlanService.getPlanProgress(b.id).percentage;
        return progB - progA;
      });
    } else {
      plans = [...plans].sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0));
    }

    this.filteredPlans.set(plans);
  }

  async toggleFavorite(id: string, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    await this.studyPlanService.toggleFavorite(id);
    this.loadData();
  }

  confirmDelete(plan: StudyPlan, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    
    this.confirmService.show(
      'Elimina piano?',
      `Sei sicuro di voler eliminare "${plan.name}"?`,
      async () => {
        await this.studyPlanService.deletePlan(plan.id);
        this.loadData();
      }
    );
  }

  createNewPlan() {
    this.router.navigate(['/study-plans', 'new']);
  }

  getPlanProgress(planId: string) {
    return this.studyPlanService.getPlanProgress(planId);
  }
}
