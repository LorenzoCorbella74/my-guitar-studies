import { Component, ChangeDetectionStrategy, input, output, signal, computed, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideChevronLeft, LucideChevronRight, LucidePlus, LucideTrash2, LucidePlay, LucideSquare } from '@lucide/angular';
import { TimelineItem, TimelineLayer, NoteDuration } from '../../models/session.model';
import { Chord, ChordType, Interval } from 'tonal';
import { DEGREE_COLOURS, NUM_FRETS } from '../scale-visualization/constants';
import { MetronomeService } from '../../services/metronome.service';
import { BeatIndicatorComponent } from '../beat-indicator/beat-indicator.component';

interface FretNote {
  string: number;
  fret: number;
  note: string;
  octave: number;
  isActive: boolean;
  degree?: string;
}

@Component({
  selector: 'app-timeline-visualization',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, LucideChevronLeft, LucideChevronRight, LucidePlus, LucideTrash2, LucidePlay, LucideSquare, BeatIndicatorComponent],
  templateUrl: './timeline-visualization.component.html',
  styles: `
    :host {
      display: block;
    }
  `
})
export class TimelineVisualizationComponent {
  timelineItem = input.required<TimelineItem>();
  update = output<TimelineItem>();
  delete = output<void>();
  
  private metronomeService = inject(MetronomeService);

  // State signals
  currentLayerIndex = signal(0);
  isPlaying = signal(false);
  currentBeat = signal(0); // 0-4 (0 = not playing, 1-4 = active beat)
  private playbackInterval: number | null = null;

  // Computed values
  layers = computed(() => this.timelineItem().layers);
  currentLayer = computed(() => this.layers()[this.currentLayerIndex()] || this.layers()[0]);
  bpm = computed(() => this.timelineItem().bpm);
  tuning = computed(() => this.timelineItem().tuning);

  // Chord information
  chordNotes = computed(() => {
    const layer = this.currentLayer();
    if (!layer) return [];
    const chord = Chord.get(`${layer.root}${layer.chordType}`);
    return chord.notes || [];
  });

  chordTypeOptions = ChordType.all().map(ct => ct.aliases[0] || ct.name);

  // Fretboard layout constants (same as scale-visualization)
  leftMargin = 40;
  rightMargin = 15;
  fretWidth = 80;
  stringSpacing = 28;
  fretboardWidth = computed(() => this.leftMargin + (NUM_FRETS * this.fretWidth) + this.rightMargin);
  fretboardHeight = computed(() => 60 + (this.strings.length - 1) * this.stringSpacing + 20);
  frets = Array.from({ length: NUM_FRETS + 1 }, (_, i) => i);
  strings = [0, 1, 2, 3, 4, 5];
  fretMarkers = [3, 5, 7, 9];

  // Fret notes computation
  fretNotes = computed(() => {
    const tuning = this.tuning();
    const layer = this.currentLayer();
    const chordNotes = this.chordNotes();
    const activeNotes = layer?.activeNotes || {};
    const notes: FretNote[] = [];

    if (tuning.length === 0) return notes;

    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    tuning.forEach((openNote, stringIndex) => {
      const noteName = openNote.replace(/\d+/, '');
      const octave = parseInt(openNote.match(/\d+/)?.[0] || '0');
      const baseNoteIndex = noteNames.indexOf(noteName);

      for (let fret = 0; fret <= NUM_FRETS; fret++) {
        const noteIndex = (baseNoteIndex + fret) % 12;
        const currentNote = noteNames[noteIndex];
        const currentOctave = octave + Math.floor((baseNoteIndex + fret) / 12);
        const key = `${stringIndex}-${fret}`;
        const isActive = activeNotes[key] === true;

        // Calculate interval degree for all notes relative to chord root
        let degree: string | undefined;
        const isChordNote = chordNotes.some(cn => cn.replace(/\d+/, '') === currentNote);
        if (layer.root) {
          const interval = Interval.distance(layer.root, currentNote);
          degree = interval;
        }

        notes.push({
          string: stringIndex,
          fret,
          note: currentNote,
          octave: currentOctave,
          isActive,
          degree
        });
      }
    });

    return notes;
  });

  // Duration labels
  durationLabels: Record<NoteDuration, string> = {
    1: 'Intero',
    0.5: '1/2',
    0.25: '1/4',
    0.125: '1/8'
  };

  durations: NoteDuration[] = [1, 0.5, 0.25, 0.125];

  // Navigation methods
  prevLayer() {
    if (this.isPlaying()) return;
    const index = this.currentLayerIndex();
    if (index > 0) {
      this.currentLayerIndex.set(index - 1);
    }
  }

  nextLayer() {
    if (this.isPlaying()) return;
    const index = this.currentLayerIndex();
    const maxIndex = this.layers().length - 1;
    if (index < maxIndex) {
      this.currentLayerIndex.set(index + 1);
    }
  }

  addLayer() {
    if (this.isPlaying()) return;
    const newLayer: TimelineLayer = {
      id: `layer_${Date.now()}`,
      root: 'C',
      chordType: 'major',
      duration: 0.25,
      activeNotes: {}
    };
    const updated: TimelineItem = {
      ...this.timelineItem(),
      layers: [...this.layers(), newLayer]
    };
    this.update.emit(updated);
    this.currentLayerIndex.set(this.layers().length);
  }

  deleteLayer() {
    if (this.isPlaying()) return;
    const layers = this.layers();
    if (layers.length <= 1) return; // Keep at least one layer

    const index = this.currentLayerIndex();
    const newLayers = layers.filter((_, i) => i !== index);
    const updated: TimelineItem = {
      ...this.timelineItem(),
      layers: newLayers
    };
    this.update.emit(updated);

    // Adjust current index if needed
    if (index >= newLayers.length) {
      this.currentLayerIndex.set(newLayers.length - 1);
    }
  }

  // Editing methods
  updateChordRoot(root: string) {
    if (this.isPlaying()) return;
    this.updateCurrentLayer({ root });
  }

  updateChordType(chordType: string) {
    if (this.isPlaying()) return;
    this.updateCurrentLayer({ chordType });
  }

  updateDuration(duration: NoteDuration) {
    if (this.isPlaying()) return;
    this.updateCurrentLayer({ duration });
  }

  updateBpm(bpm: number) {
    if (this.isPlaying()) return;
    const updated: TimelineItem = {
      ...this.timelineItem(),
      bpm: Math.max(40, Math.min(240, bpm))
    };
    this.update.emit(updated);
  }

  toggleNote(stringIndex: number, fret: number) {
    if (this.isPlaying()) return;
    const key = `${stringIndex}-${fret}`;
    const layer = this.currentLayer();
    const currentValue = layer.activeNotes[key] || false;

    this.updateCurrentLayer({
      activeNotes: {
        ...layer.activeNotes,
        [key]: !currentValue
      }
    });
  }

  private updateCurrentLayer(updates: Partial<TimelineLayer>) {
    const index = this.currentLayerIndex();
    const layers = this.layers();
    const updatedLayer = { ...layers[index], ...updates };
    const newLayers = layers.map((layer, i) => i === index ? updatedLayer : layer);

    const updated: TimelineItem = {
      ...this.timelineItem(),
      layers: newLayers
    };
    this.update.emit(updated);
  }

  // Playback methods
  async play() {
    if (this.isPlaying()) return;
    
    console.log('▶️ Starting playback...');
    
    // Resume AudioContext (required by some browsers)
    await this.metronomeService.resumeAudioContext();
    
    this.isPlaying.set(true);
    this.currentLayerIndex.set(0);
    this.currentBeat.set(0);
    
    console.log('isPlaying:', this.isPlaying(), 'currentBeat:', this.currentBeat());
    
    this.startPlayback();
  }

  stop() {
    console.log('⏹️ Stopping playback...');
    this.isPlaying.set(false);
    this.currentBeat.set(0);
    if (this.playbackInterval !== null) {
      clearInterval(this.playbackInterval);
      this.playbackInterval = null;
    }
    this.currentLayerIndex.set(0);
  }

  private startPlayback() {
    const bpm = this.bpm();
    const beatDuration = 60000 / bpm; // milliseconds per quarter note beat
    let globalBeatCounter = 0; // Counter for beats across all measures (for beat indicator 1-4)
    let layerBeatCounter = 0; // Counter for beats within current layer
    
    console.log(`🎵 BPM: ${bpm}, Beat duration: ${beatDuration}ms`);
    
    // Play first beat immediately
    this.metronomeService.playClick(true); // Accent on first beat
    this.currentBeat.set(1);
    // console.log('Beat 1 - Layer 0 - currentBeat:', this.currentBeat());
    
    const tick = () => {
      if (!this.isPlaying()) return;
      
      globalBeatCounter++;
      layerBeatCounter++;
      const currentBeatNumber = (globalBeatCounter % 4) + 1; // 1-4 for visual indicator
      
      // Update beat indicator
      this.currentBeat.set(currentBeatNumber);
      
      // Play click (accent on beat 1 of each measure)
      this.metronomeService.playClick(currentBeatNumber === 1);
      
      // Calculate how many beats the current layer should last
      const currentLayer = this.layers()[this.currentLayerIndex()];
      const beatsForLayer = currentLayer.duration * 4; // Convert duration to beats
      
      // console.log(`Beat ${currentBeatNumber} - Layer ${this.currentLayerIndex()} - layerBeat ${layerBeatCounter}/${beatsForLayer}`);
      
      // Advance layer when we've played all beats for current layer
      if (layerBeatCounter >= beatsForLayer) {
        layerBeatCounter = 0; // Reset layer beat counter
        const nextIndex = this.currentLayerIndex() + 1;
        if (nextIndex >= this.layers().length) {
          // Loop back to start
          this.currentLayerIndex.set(0);
          globalBeatCounter = 0; // Reset to sync beat indicator
          this.currentBeat.set(1); // Start from beat 1 again
        } else {
          this.currentLayerIndex.set(nextIndex);
        }
      }
    };
    
    this.playbackInterval = window.setInterval(tick, beatDuration);
  }

  // SVG helper methods (reused from scale-visualization)
  getFretX(fret: number): number {
    return this.leftMargin + fret * this.fretWidth;
  }

  getStringY(stringIndex: number): number {
    // Invert string order: E grave (index 0) at bottom, E acute (index 5) at top
    const invertedIndex = (this.strings.length - 1) - stringIndex;
    return this.stringSpacing + (invertedIndex * this.stringSpacing);
  }

  getNoteX(fret: number): number {
    if (fret === 0) {
      // Open strings: to the left of the nut
      return this.getFretX(0) - 20;
    } else {
      // Fretted notes: centered between two frets
      return this.getFretX(fret - 1) + this.fretWidth / 2;
    }
  }

  getNoteColor(degree?: string): string {
    if (!degree) return '#cccccc'; // Gray for non-chord notes
    return DEGREE_COLOURS[degree as keyof typeof DEGREE_COLOURS] || DEGREE_COLOURS['1P'];
  }

  handleDelete() {
    this.delete.emit();
  }
}
