import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { LucideChevronDown, LucideChevronRight, LucideTrash2 } from '@lucide/angular';
import { CircleOfFifthsItem } from '../../models/session.model';
import { Scale } from 'tonal';

type HarmonicMode = 'major' | 'minor';

@Component({
  selector: 'app-circle-of-fifths',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideTrash2, LucideChevronDown, LucideChevronRight],
  templateUrl: './circle-of-fifths.component.html',
  styleUrls: ['./circle-of-fifths.component.css']
})
export class CircleOfFifthsComponent {
  item = input<CircleOfFifthsItem | null>(null);

  update = output<CircleOfFifthsItem>();
  delete = output<void>();

  readonly majorKeys = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
  readonly relativeMinors = ['Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'D#m', 'Bbm', 'Fm', 'Cm', 'Gm', 'Dm'];
  private readonly selectedBlue: [number, number, number] = [37, 99, 235];
  private readonly complementaryOrange: [number, number, number] = [249, 115, 22];

  localItem = signal<CircleOfFifthsItem | null>(null);
  harmonicMode = signal<HarmonicMode>('major');
  readonly degreeLabels = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

  constructor() {
    effect(() => {
      const sourceItem = this.item();
      if (sourceItem) {
        const normalizedItem: CircleOfFifthsItem = {
          ...sourceItem,
          showRelativeMinor: true,
          highlightDistance: 2,
          zoomLevel: 130
        };

        this.localItem.set(normalizedItem);

        if (
          sourceItem.showRelativeMinor !== normalizedItem.showRelativeMinor ||
          sourceItem.highlightDistance !== normalizedItem.highlightDistance ||
          sourceItem.zoomLevel !== normalizedItem.zoomLevel
        ) {
          this.update.emit(normalizedItem);
        }
      }
    });
  }

  selectedIndex = computed(() => {
    const selectedKey = this.localItem()?.selectedKey || 'C';
    const index = this.majorKeys.indexOf(selectedKey);
    return index >= 0 ? index : 0;
  });

  selectedMajor = computed(() => this.majorKeys[this.selectedIndex()]);

  selectedMinor = computed(() => this.relativeMinors[this.selectedIndex()]);

  neighborsPlusOne = computed(() => {
    const center = this.selectedIndex();
    return [
      this.majorKeys[this.wrapIndex(center - 1)],
      this.majorKeys[this.wrapIndex(center + 1)]
    ];
  });

  neighborsPlusTwo = computed(() => {
    const center = this.selectedIndex();
    return [
      this.majorKeys[this.wrapIndex(center - 2)],
      this.majorKeys[this.wrapIndex(center + 2)]
    ];
  });

  zoomScale = computed(() => 118 / 100);

  isDetailsOpen = computed(() => this.localItem()?.detailsPanelOpen ?? true);

  showRelativeMinor = computed(() => true);

  highlightDistance = computed(() => 2);

  private getModeRoot(index: number, mode: HarmonicMode): string {
    if (mode === 'minor') {
      return this.relativeMinors[index].replace('m', '');
    }
    return this.majorKeys[index];
  }

  private getScaleNotes(root: string, mode: HarmonicMode): string[] {
    const scaleName = mode === 'minor' ? 'minor' : 'major';
    const notes = Scale.get(`${root} ${scaleName}`).notes;
    return notes.slice(0, 7);
  }

  scaleTriplet = computed(() => {
    const mode = this.harmonicMode();
    const selected = this.selectedIndex();
    const indices = [
      this.wrapIndex(selected - 1),
      selected,
      this.wrapIndex(selected + 1)
    ];

    return indices.map((index, position) => {
      const root = this.getModeRoot(index, mode);
      const notes = this.getScaleNotes(root, mode);
      const suffix = mode === 'minor' ? 'm' : '';
      const label = `${root}${suffix}`;

      return {
        label,
        notes,
        isSelected: position === 1
      };
    });
  });

  scaleRows = computed(() =>
    this.degreeLabels.map((degree, rowIndex) => ({
      degree,
      values: this.scaleTriplet().map(scale => scale.notes[rowIndex] ?? '-')
    }))
  );

  selectedScaleNoteSet = computed(() => {
    const selectedScale = this.scaleTriplet().find(scale => scale.isSelected);
    const notes = selectedScale?.notes ?? [];
    return new Set(notes.map(note => this.normalizeNote(note)));
  });

  private normalizeNote(note: string): string {
    return note.trim().toUpperCase();
  }

  isOutsideSelectedScale(note: string, columnIndex: number): boolean {
    // Non colorare la colonna selezionata o celle vuote.
    if (columnIndex === 1 || note === '-') return false;
    return !this.selectedScaleNoteSet().has(this.normalizeNote(note));
  }

  private emitUpdate(patch: Partial<CircleOfFifthsItem>) {
    const current = this.localItem();
    if (!current) return;

    const next: CircleOfFifthsItem = {
      ...current,
      ...patch
    };

    this.localItem.set(next);
    this.update.emit(next);
  }

  wrapIndex(index: number): number {
    return (index + this.majorKeys.length) % this.majorKeys.length;
  }

  getPoint(index: number, radius: number): { x: number; y: number } {
    const angle = (-90 + index * 30) * (Math.PI / 180);
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius
    };
  }

  getDistanceFromSelected(index: number): number {
    const total = this.majorKeys.length;
    const selected = this.selectedIndex();
    const direct = Math.abs(index - selected);
    return Math.min(direct, total - direct);
  }

  isSelected(index: number): boolean {
    return index === this.selectedIndex();
  }

  isHighlighted(index: number): boolean {
    const distance = this.getDistanceFromSelected(index);
    return distance > 0 && distance <= this.highlightDistance();
  }

  getComplementRatio(index: number): number {
    const maxDistance = this.majorKeys.length / 2;
    const distance = this.getDistanceFromSelected(index);
    return distance / maxDistance;
  }

  private mixRgb(
    from: [number, number, number],
    to: [number, number, number],
    ratio: number
  ): [number, number, number] {
    const safeRatio = Math.max(0, Math.min(1, ratio));
    return [
      Math.round(from[0] + (to[0] - from[0]) * safeRatio),
      Math.round(from[1] + (to[1] - from[1]) * safeRatio),
      Math.round(from[2] + (to[2] - from[2]) * safeRatio)
    ];
  }

  private rgbToCss(rgb: [number, number, number]): string {
    return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
  }

  nodeFill(index: number): string {
    const ratio = this.getComplementRatio(index);
    const mixed = this.mixRgb(this.selectedBlue, this.complementaryOrange, ratio);
    return this.rgbToCss(mixed);
  }

  nodeStroke(index: number): string {
    const ratio = this.getComplementRatio(index);
    const mixed = this.mixRgb(this.selectedBlue, this.complementaryOrange, ratio);
    const darkened = this.mixRgb(mixed, [17, 24, 39], 0.35);
    return this.rgbToCss(darkened);
  }

  nodeStrokeWidth(index: number): number {
    return this.isSelected(index) ? 2.4 : 1.8;
  }

  selectKey(key: string) {
    this.emitUpdate({ selectedKey: key });
  }

  toggleDetails() {
    this.emitUpdate({ detailsPanelOpen: !this.isDetailsOpen() });
  }

  onHarmonicModeChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.harmonicMode.set(value === 'minor' ? 'minor' : 'major');
  }

  onNodeKeyDown(event: KeyboardEvent, key: string) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.selectKey(key);
    }
  }

  majorLabelFill(index: number): string {
    return '#f9fafb';
  }

  minorLabelFill(index: number): string {
    return '#f3f4f6';
  }

  labelStroke(index: number): string {
    return '#111827';
  }
}
