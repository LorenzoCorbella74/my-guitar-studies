import { Component, ChangeDetectionStrategy, output, signal } from '@angular/core';
import { LucidePlus, LucideFileText, LucideMusic, LucideGitBranch, LucideGrid3x3, LucideGuitar, LucideClock, LucideTable2 } from '@lucide/angular';

export type ItemType = 'section' | 'scale' | 'arpeggio' | 'chord' | 'comparison' | 'chordprogression' | 'timeline' | 'modalinterchange';

@Component({
  selector: 'app-item-selector',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucidePlus, LucideFileText, LucideMusic, LucideGitBranch, LucideGrid3x3, LucideGuitar, LucideClock, LucideTable2],
  template: `
    <div class="relative">
      <button
        type="button"
        class="btn btn-dash btn-primary btn-block btn-sm"
        (click)="toggleDropdown()"
        (blur)="onBlur()"
        aria-label="Aggiungi elemento"
      >
        <svg lucidePlus class="w-5 h-5"></svg>
        Aggiungi elemento
      </button>
      
      @if (isOpen()) {
        <ul class="absolute left-0 right-0 menu bg-base-100 rounded-box z-10 shadow-lg mt-2">
          <li>
            <button type="button" (mousedown)="selectItem('section')">
              <svg lucideFileText class="w-4 h-4"></svg>
              Sezione testuale
            </button>
          </li>
          <li>
            <button type="button" (mousedown)="selectItem('comparison')">
              <svg lucideGrid3x3 class="w-4 h-4"></svg>
              Confronti note
            </button>
          </li>
          <li>
            <button type="button" (mousedown)="selectItem('scale')">
              <svg lucideMusic class="w-4 h-4"></svg>
              Scala
            </button>
          </li>
          <li>
            <button type="button" (mousedown)="selectItem('arpeggio')">
              <svg lucideGitBranch class="w-4 h-4"></svg>
              Arpeggio
            </button>
          </li>
          <li>
            <button type="button" (mousedown)="selectItem('chord')">
              <svg lucideMusic class="w-4 h-4"></svg>
              Accordo (scala)
            </button>
          </li> 
          <li>
            <button type="button" (mousedown)="selectItem('chordprogression')">
              <svg lucideGuitar class="w-4 h-4"></svg>
              Progressione accordi
            </button>
          </li>
          <li>
            <button type="button" (mousedown)="selectItem('timeline')">
              <svg lucideClock class="w-4 h-4"></svg>
              Timeline
            </button>
          </li>
          <li>
            <button type="button" (mousedown)="selectItem('modalinterchange')">
              <svg lucideTable2 class="w-4 h-4"></svg>
              Modal interchange
            </button>
          </li>
        </ul>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
  `
})
export class ItemSelectorComponent {
  itemSelected = output<ItemType>();
  
  isOpen = signal(false);
  
  toggleDropdown() {
    this.isOpen.update(v => !v);
  }
  
  onBlur() {
    setTimeout(() => this.isOpen.set(false), 150);
  }
  
  selectItem(type: ItemType) {
    this.itemSelected.emit(type);
    this.isOpen.set(false);
  }
}
