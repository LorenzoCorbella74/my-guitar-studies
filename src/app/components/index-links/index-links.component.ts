import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { LucideList } from '@lucide/angular';
import {
  ArpeggioItem,
  ChordItem,
  ChordProgressionItem,
  FretboardItem,
  HarmonicGridItem,
  ScaleItem,
  SectionItem,
  SessionItem,
  TabItem
} from '../../models/session.model';

@Component({
  selector: 'app-index-links',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideList],
  template: `
    @if (links().length) {
      <div class="relative z-40">
        <button
          type="button"
          class="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-content shadow-lg transition-transform hover:scale-105"
          [attr.aria-label]="isOpen() ? 'Chiudi indice' : 'Apri indice'"
          [title]="isOpen() ? 'Chiudi indice' : 'Apri indice'"
          (click)="toggleOpen()"
        >
          <svg lucideList class="h-5 w-5"></svg>
        </button>

        @if (isOpen()) {
          <nav
            aria-label="Indice della sessione"
            class="absolute right-14 top-0 w-56 rounded-box border border-base-300 bg-base-100/95 p-2 shadow-xl backdrop-blur-sm"
          >
            <p class="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-base-content/60">
              Indice
            </p>
            <ul class="max-h-[70vh] space-y-1 overflow-y-auto">
              @for (link of links(); track link.id) {
                <li>
                  <button
                    type="button"
                    class="w-full rounded-md px-2 py-1.5 text-left text-xs text-base-content/80 transition hover:bg-base-200 hover:text-base-content focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    (click)="scrollTo(link.id)"
                    [title]="link.label"
                  >
                    {{ link.label }}
                  </button>
                </li>
              }
            </ul>
          </nav>
        }
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `
  ]
})
export class IndexLinksComponent {
  items = input.required<SessionItem[]>();
  isOpen = signal(false);

  links = computed(() =>
    this.items()
      .map((item, index) => ({ id: item.id, label: this.getItemLabel(item, index) }))
      .filter(link => link.label.trim().length > 0)
  );

  toggleOpen(): void {
    this.isOpen.update(open => !open);
  }

  scrollTo(id: string): void {
    const element = document.getElementById(id);
    if (!element) return;

    this.isOpen.set(false);

    const header = document.querySelector('header');
    const offset = header ? header.getBoundingClientRect().height + 16 : 88;

    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.scrollBy({ top: -offset, behavior: 'auto' });
  }

  private getItemLabel(item: SessionItem, index: number): string {
    switch (item.type) {
      case 'section': {
        const section = item as SectionItem;
        return section.title?.trim() || 'Sezione';
      }
      case 'scale':
      case 'arpeggio':
      case 'chord': {
        const visualItem = item as ScaleItem | ArpeggioItem | ChordItem;
        const configTitle = visualItem.config?.title?.trim();
        if (configTitle) return configTitle;

        const scaleName = visualItem.config?.scaleName?.trim();
        if (scaleName) return scaleName;

        return item.type === 'scale' ? 'Scala' : item.type === 'arpeggio' ? 'Arpeggio' : 'Accordo';
      }
      case 'comparison':
        return 'Confronto';
      case 'chordprogression': {
        const progression = item as ChordProgressionItem;
        return progression.title?.trim() || 'Progressione';
      }
      case 'harmonicgrid': {
        const grid = item as HarmonicGridItem;
        return grid.title?.trim() || 'Griglia armonica';
      }
      case 'keyprogression':
        return 'Progressione di tonalità';
      case 'timeline':
        return 'Timeline';
      case 'modalinterchange':
        return 'Modal interchange';
      case 'fretboard': {
        const fretboard = item as FretboardItem;
        return fretboard.title?.trim() || 'Tastiera';
      }
      case 'tab': {
        const tab = item as TabItem;
        return tab.title?.trim() || 'Tab';
      }
      case 'circleoffifths':
        return 'Circle of fifths';
      default:
        return `Elemento ${index + 1}`;
    }
  }
}
