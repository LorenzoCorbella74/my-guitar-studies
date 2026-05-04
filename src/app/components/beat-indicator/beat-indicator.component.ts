import { Component, ChangeDetectionStrategy, input, effect } from '@angular/core';

@Component({
  selector: 'app-beat-indicator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="flex items-center gap-1 px-2 py-1 bg-base-200 rounded">
      @for (beat of beats; track beat) {
        <div 
          class="w-2 h-8 rounded transition-all duration-100 border"
          [class.bg-primary]="beat <= currentBeat()"
          [class.border-primary]="beat <= currentBeat()"
          [class.bg-base-300]="beat > currentBeat()"
          [class.border-base-300]="beat > currentBeat()"
          [class.shadow-lg]="beat === currentBeat()"
        ></div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
  `
})
export class BeatIndicatorComponent {
  currentBeat = input<number>(0); // 0-4, dove 0 = nessun beat attivo
  beats = [1, 2, 3, 4];
  
  constructor() {
    effect(() => {
      console.log('🎵 BeatIndicator - currentBeat:', this.currentBeat());
    });
  }
}
