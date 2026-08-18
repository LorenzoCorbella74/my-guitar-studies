import { ChangeDetectionStrategy, Component, inject, input, OnDestroy, output, signal } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';
import { LucideCopy, LucideGripVertical, LucidePencil, LucidePlay, LucidePlus, LucideSquare, LucideTrash2 } from '@lucide/angular';
import { HarmonicBar, HarmonicBeat, HarmonicGridItem, HarmonicSection } from '../../models/session.model';
import { AudioService } from '../../services/audio.service';
import { MetronomeService } from '../../services/metronome.service';
import { UserSettingsService } from '../../services/user-settings.service';
import { BeatIndicatorComponent } from '../beat-indicator/beat-indicator.component';

@Component({
  selector: 'app-harmonic-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkDrag, CdkDragHandle, CdkDropList, FormsModule, BeatIndicatorComponent, LucideCopy, LucideGripVertical, LucidePencil, LucidePlay, LucidePlus, LucideSquare, LucideTrash2],
  templateUrl: './harmonic-grid.component.html',
  styles: `
    :host { display: block; }
  `
})
export class HarmonicGridComponent implements OnDestroy {
  grid = input.required<HarmonicGridItem>();
  update = output<HarmonicGridItem>();
  delete = output<void>();
  displayMode = signal<'edit' | 'notation'>('notation');
  isPlaying = signal(false);
  currentBeat = signal(0);
  currentSectionIndex = signal(0);
  currentBarIndex = signal(0);
  currentBeatIndex = signal(0);

  private audioService = inject(AudioService);
  private metronomeService = inject(MetronomeService);
  private userSettingsService = inject(UserSettingsService);
  private playbackInterval: number | null = null;

  get bpm(): number {
    return this.grid().bpm ?? 120;
  }

  ngOnDestroy(): void {
    this.stop();
  }

  toggleDisplayMode(): void {
    this.displayMode.set('edit');
  }

  saveNotation(): void {
    this.displayMode.set('notation');
  }

  updateBpm(value: number): void {
    const bpm = Number.isFinite(value) ? Math.max(40, Math.min(240, value)) : 120;
    this.update.emit({ ...this.grid(), bpm });
  }

  async play(): Promise<void> {
    if (this.isPlaying()) return;

    await this.audioService.resumeAudioContext();
    await this.metronomeService.resumeAudioContext();
    await this.audioService.loadInstrument();

    this.isPlaying.set(true);
    this.setPlaybackPosition(0);
    this.playCurrentBeat();
    this.playbackInterval = window.setInterval(() => this.advancePlayback(), 60000 / this.bpm);
  }

  stop(): void {
    this.isPlaying.set(false);
    this.currentBeat.set(0);
    this.currentSectionIndex.set(0);
    this.currentBarIndex.set(0);
    this.currentBeatIndex.set(0);
    this.audioService.stopAllNotes();

    if (this.playbackInterval !== null) {
      clearInterval(this.playbackInterval);
      this.playbackInterval = null;
    }
  }

  isActiveBeat(sectionIndex: number, barIndex: number, beatIndex: number): boolean {
    return this.isPlaying()
      && this.currentSectionIndex() === sectionIndex
      && this.currentBarIndex() === barIndex
      && this.currentBeatIndex() === beatIndex;
  }

  private advancePlayback(): void {
    const position = this.getPlaybackPositions();
    const currentIndex = position.findIndex(item =>
      item.sectionIndex === this.currentSectionIndex()
      && item.barIndex === this.currentBarIndex()
      && item.beatIndex === this.currentBeatIndex()
    );
    const nextIndex = (currentIndex + 1) % position.length;
    this.setPlaybackPosition(nextIndex);
    this.playCurrentBeat();
  }

  private setPlaybackPosition(index: number): void {
    const position = this.getPlaybackPositions()[index];
    if (!position) return;
    this.currentSectionIndex.set(position.sectionIndex);
    this.currentBarIndex.set(position.barIndex);
    this.currentBeatIndex.set(position.beatIndex);
    this.currentBeat.set(position.beatIndex + 1);
  }

  private getPlaybackPositions(): Array<{ sectionIndex: number; barIndex: number; beatIndex: number; beat: HarmonicBeat }> {
    return this.grid().sections.flatMap((section, sectionIndex) =>
      section.bars.flatMap((bar, barIndex) =>
        bar.beats.map((beat, beatIndex) => ({ sectionIndex, barIndex, beatIndex, beat }))
      )
    );
  }

  private playCurrentBeat(): void {
    const current = this.getPlaybackPositions().find(item =>
      item.sectionIndex === this.currentSectionIndex()
      && item.barIndex === this.currentBarIndex()
      && item.beatIndex === this.currentBeatIndex()
    );
    if (!current) return;

    const settings = this.userSettingsService.settings();
    if (settings?.playMetronome ?? true) {
      this.metronomeService.playClick(current.beatIndex === 0);
    }

    if (!current.beat.chord) return;
    const chord = this.parseChord(current.beat.chord);
    if (!chord) return;

    this.audioService.playChord(
      chord.root,
      chord.type,
      3,
      'root',
      this.getChordDuration(current)
    ).catch(error => console.error('Error playing harmonic grid chord:', error));
  }

  private getChordDuration(current: { sectionIndex: number; barIndex: number; beatIndex: number }): number {
    const positions = this.getPlaybackPositions();
    const currentIndex = positions.findIndex(item =>
      item.sectionIndex === current.sectionIndex
      && item.barIndex === current.barIndex
      && item.beatIndex === current.beatIndex
    );
    let beats = 1;
    for (let index = currentIndex + 1; index < positions.length; index++) {
      if (positions[index].beat.chord) break;
      beats++;
    }
    return (60 / this.bpm) * beats;
  }

  private parseChord(value: string): { root: string; type: string } | null {
    const match = value.trim().match(/^([A-Ga-g](?:#|b)?)(.*)$/);
    if (!match) return null;
    return { root: match[1].charAt(0).toUpperCase() + match[1].slice(1), type: match[2] || 'major' };
  }

  getBeatLabel(beat: HarmonicBeat, beatIndex: number): string {
    if (beat.chord) return beat.chord;
    if (beat.holdPrevious || beatIndex > 0) return '/';
    return '-';
  }

  private createBeat(): HarmonicBeat {
    return { chord: null, holdPrevious: false };
  }

  private createBar(): HarmonicBar {
    return {
      id: this.createId('bar'),
      beats: [this.createBeat(), this.createBeat(), this.createBeat(), this.createBeat()]
    };
  }

  private createId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private emitGrid(sections: HarmonicSection[]): void {
    this.update.emit({ ...this.grid(), sections });
  }

  updateGrid(changes: Partial<HarmonicGridItem>): void {
    this.update.emit({ ...this.grid(), ...changes });
  }

  updateSection(sectionIndex: number, changes: Partial<HarmonicSection>): void {
    const sections = this.grid().sections.map((section, index) =>
      index === sectionIndex ? { ...section, ...changes } : section
    );
    this.emitGrid(sections);
  }

  onSectionDrop(event: CdkDragDrop<HarmonicSection[]>): void {
    if (this.isPlaying() || event.previousIndex === event.currentIndex) return;

    const sections = [...this.grid().sections];
    moveItemInArray(sections, event.previousIndex, event.currentIndex);
    this.emitGrid(sections);
  }

  addSection(): void {
    const nextLabel = String.fromCharCode(65 + this.grid().sections.length);
    const section: HarmonicSection = {
      id: this.createId('section'),
      label: nextLabel,
      bars: [this.createBar()]
    };
    this.emitGrid([...this.grid().sections, section]);
  }

  removeSection(sectionIndex: number): void {
    if (this.grid().sections.length === 1) return;
    this.emitGrid(this.grid().sections.filter((_, index) => index !== sectionIndex));
  }

  duplicateSection(sectionIndex: number): void {
    const source = this.grid().sections[sectionIndex];
    const copy: HarmonicSection = {
      ...source,
      id: this.createId('section'),
      label: String.fromCharCode(65 + this.grid().sections.length),
      bars: source.bars.map(bar => ({
        ...bar,
        id: this.createId('bar'),
        beats: bar.beats.map(beat => ({ ...beat })) as HarmonicBar['beats']
      }))
    };
    const sections = [...this.grid().sections];
    sections.splice(sectionIndex + 1, 0, copy);
    this.emitGrid(sections);
  }

  addBar(sectionIndex: number): void {
    const sections = this.grid().sections.map((section, index) =>
      index === sectionIndex ? { ...section, bars: [...section.bars, this.createBar()] } : section
    );
    this.emitGrid(sections);
  }

  removeBar(sectionIndex: number, barIndex: number): void {
    const sections = this.grid().sections.map((section, index) => {
      if (index !== sectionIndex || section.bars.length === 1) return section;
      return { ...section, bars: section.bars.filter((_, currentIndex) => currentIndex !== barIndex) };
    });
    this.emitGrid(sections);
  }

  duplicateBar(sectionIndex: number, barIndex: number): void {
    const sections = this.grid().sections.map((section, index) => {
      if (index !== sectionIndex) return section;
      const source = section.bars[barIndex];
      const copy: HarmonicBar = {
        ...source,
        id: this.createId('bar'),
        beats: source.beats.map(beat => ({ ...beat })) as HarmonicBar['beats']
      };
      const bars = [...section.bars];
      bars.splice(barIndex + 1, 0, copy);
      return { ...section, bars };
    });
    this.emitGrid(sections);
  }

  setBeat(sectionIndex: number, barIndex: number, beatIndex: number, changes: Partial<HarmonicBeat>): void {
    const sections = this.grid().sections.map((section, currentSectionIndex) => {
      if (currentSectionIndex !== sectionIndex) return section;
      const bars = section.bars.map((bar, currentBarIndex) => {
        if (currentBarIndex !== barIndex) return bar;
        const beats = bar.beats.map((beat, currentBeatIndex) =>
          currentBeatIndex === beatIndex ? { ...beat, ...changes } : beat
        ) as HarmonicBar['beats'];
        return { ...bar, beats };
      });
      return { ...section, bars };
    });
    this.emitGrid(sections);
  }

  toggleHold(sectionIndex: number, barIndex: number, beatIndex: number): void {
    const beat = this.grid().sections[sectionIndex]?.bars[barIndex]?.beats[beatIndex];
    if (!beat) return;
    this.setBeat(sectionIndex, barIndex, beatIndex, beat.holdPrevious
      ? { holdPrevious: false, chord: null }
      : { holdPrevious: true, chord: null });
  }
}
