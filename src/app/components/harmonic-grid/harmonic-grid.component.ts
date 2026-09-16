import { ChangeDetectionStrategy, Component, computed, inject, input, OnDestroy, output, signal } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';
import { LucideCopy, LucideGripVertical, LucidePause, LucidePencil, LucidePlay, LucidePlus, LucideSettings, LucideSquare, LucideTrash2 } from '@lucide/angular';
import { HarmonicBar, HarmonicBeat, HarmonicGridItem, HarmonicSection } from '../../models/session.model';
import { AudioService } from '../../services/audio.service';
import { MetronomeService } from '../../services/metronome.service';
import { UserSettingsService } from '../../services/user-settings.service';
import { BeatIndicatorComponent } from '../beat-indicator/beat-indicator.component';
import { Dialog } from '@angular/cdk/dialog';
import { SequencerConfigModalComponent, SequencerConfigDialogData, SequencerConfigDialogResult } from '../sequencer-config-modal/sequencer-config-modal.component';
import { DrumGenre } from '../../data/drum-patterns';

@Component({
  selector: 'app-harmonic-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkDrag, CdkDragHandle, CdkDropList, FormsModule, BeatIndicatorComponent, LucideCopy, LucideGripVertical, LucidePause, LucidePencil, LucidePlay, LucidePlus, LucideSettings, LucideSquare, LucideTrash2],
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
  
  playbackState = signal<'stopped' | 'playing' | 'paused'>('stopped');
  isPlaying = computed(() => this.playbackState() === 'playing');
  isPaused = computed(() => this.playbackState() === 'paused');
  isPlaybackActive = computed(() => this.playbackState() !== 'stopped');

  currentBeat = signal(0);
  currentSectionIndex = signal(0);
  currentBarIndex = signal(0);
  currentBeatIndex = signal(0);

  private audioService = inject(AudioService);
  private metronomeService = inject(MetronomeService);
  private userSettingsService = inject(UserSettingsService);
  private dialog = inject(Dialog);
  private playbackInterval: number | null = null;

  get bpm(): number {
    return this.grid().bpm ?? 120;
  }

  ngOnDestroy(): void {
    this.stop();
  }

  toggleDisplayMode(): void {
    if (this.isPlaybackActive()) return;
    this.displayMode.set('edit');
  }

  saveNotation(): void {
    this.displayMode.set('notation');
  }

  updateBpm(value: number): void {
    const bpm = Number.isFinite(value) ? Math.max(40, Math.min(240, value)) : 120;
    this.update.emit({ ...this.grid(), bpm });
  }

  openConfigModal(): void {
    const dialogData: SequencerConfigDialogData = {
      title: 'Configura Sequencer Griglia Armonica',
      showFretboardSettings: false,
      sequencerConfig: this.grid().sequencerConfig
    };

    const dialogRef = this.dialog.open<SequencerConfigDialogResult, SequencerConfigDialogData>(
      SequencerConfigModalComponent,
      {
        data: dialogData,
        disableClose: false,
        hasBackdrop: true,
        width: '36rem',
        maxWidth: '92vw',
        maxHeight: '90vh'
      }
    );

    dialogRef.closed.subscribe(result => {
      if (result) {
        this.update.emit({
          ...this.grid(),
          sequencerConfig: result.sequencerConfig
        });
      }
    });
  }

  async play(): Promise<void> {
    if (this.isPlaying()) return;

    const isResuming = this.isPaused();

    await this.audioService.resumeAudioContext();
    await this.metronomeService.resumeAudioContext();

    const seqConfig = this.grid().sequencerConfig;
    const settings = this.userSettingsService.settings();
    const instName = seqConfig?.instrument || settings?.audioInstrument;
    const drumKit = seqConfig?.drumKit || settings?.audioDrumKit;

    await this.audioService.loadInstrument(instName);
    await this.audioService.loadDrumMachine(drumKit);

    this.playbackState.set('playing');

    if (!isResuming) {
      this.setPlaybackPosition(0);
    }
    this.playCurrentBeat();
    this.playbackInterval = window.setInterval(() => this.advancePlayback(), 60000 / this.bpm);
  }

  pause(): void {
    if (!this.isPlaying()) return;

    this.playbackState.set('paused');
    this.audioService.stopAllNotes();

    if (this.playbackInterval !== null) {
      clearInterval(this.playbackInterval);
      this.playbackInterval = null;
    }
  }

  stop(): void {
    this.playbackState.set('stopped');
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
    return this.isPlaybackActive()
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

    const seqConfig = this.grid().sequencerConfig;
    const settings = this.userSettingsService.settings();

    const drumGenre: DrumGenre = seqConfig?.drumGenre || settings?.audioDrumGenre || 'pop';
    const drumVolume = seqConfig?.drumVolume ?? (settings?.audioDrumVolume ?? 0.7);
    const instName = seqConfig?.instrument || settings?.audioInstrument || 'electric_piano_1';
    const instVolume = seqConfig?.instrumentVolume ?? (settings?.audioVolume ?? 0.7);
    const playMetronome = seqConfig?.playMetronome ?? (settings?.playMetronome ?? (drumGenre === 'metronome'));

    const audioContext = this.audioService.getAudioContext();
    const scheduledTime = audioContext.currentTime;
    const beatDuration = 60 / this.bpm;

    if (playMetronome) {
      this.metronomeService.playClick(current.beatIndex === 0, scheduledTime);
    }

    if (drumGenre !== 'metronome') {
      this.audioService.playDrumBeat(
        drumGenre,
        current.beatIndex,
        scheduledTime,
        beatDuration,
        drumVolume
      );
    }

    if (!current.beat.chord) return;
    const chord = this.parseChord(current.beat.chord);
    if (!chord) return;

    this.audioService.playChord(
      chord.root,
      chord.type,
      3,
      'root',
      this.getChordDuration(current),
      scheduledTime,
      instName,
      instVolume
    ).catch(error => console.error('Error playing harmonic grid chord:', error));
  }

  private getChordDuration(current: { sectionIndex: number; barIndex: number; beatIndex: number }): number {
    const positions = this.getPlaybackPositions();
    const currentIndex = positions.findIndex(item =>
      item.sectionIndex === current.sectionIndex
      && item.barIndex === current.barIndex
      && item.beatIndex === current.beatIndex
    );

    if (currentIndex < 0) {
      return 60 / this.bpm;
    }

    const currentBeat = positions[currentIndex]?.beat;
    if (!currentBeat?.chord) {
      return 60 / this.bpm;
    }

    let beats = 1;
    for (let index = currentIndex + 1; index < positions.length; index++) {
      const nextBeat = positions[index].beat;

      // In the harmonic-grid UI, any empty beat after an explicit chord is an implicit hold,
      // even when the beat has no `holdPrevious` flag. The chord should continue until a new
      // explicit chord appears or the sequence ends.
      if (nextBeat.chord) break;
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
    if (this.isPlaybackActive() || event.previousIndex === event.currentIndex) return;

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
