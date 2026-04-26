import { Component, ChangeDetectionStrategy, input, output, signal, computed, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideChevronLeft, LucideChevronRight, LucidePlus, LucideTrash2, LucidePlay, LucideSquare } from '@lucide/angular';
import { TimelineItem, TimelineLayer, NoteDuration } from '../../models/session.model';
import { Chord, ChordType, Interval } from 'tonal';
import { DEGREE_COLOURS, NUM_FRETS } from '../scale-visualization/constants';

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
  imports: [FormsModule, LucideChevronLeft, LucideChevronRight, LucidePlus, LucideTrash2, LucidePlay, LucideSquare],
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

  // State signals
  currentLayerIndex = signal(0);
  isPlaying = signal(false);
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
  play() {
    if (this.isPlaying()) return;
    this.isPlaying.set(true);
    this.currentLayerIndex.set(0);
    this.startPlayback();
  }

  stop() {
    this.isPlaying.set(false);
    if (this.playbackInterval !== null) {
      clearInterval(this.playbackInterval);
      this.playbackInterval = null;
    }
    this.currentLayerIndex.set(0);
  }

  private startPlayback() {
    const calculateInterval = () => {
      const layer = this.currentLayer();
      const bpm = this.bpm();
      const beatDuration = 60000 / bpm; // milliseconds per beat
      return beatDuration * (layer.duration / 0.25); // duration relative to quarter note
    };

    const advance = () => {
      if (!this.isPlaying()) return;

      const nextIndex = this.currentLayerIndex() + 1;
      if (nextIndex >= this.layers().length) {
        // Loop back to start
        this.currentLayerIndex.set(0);
      } else {
        this.currentLayerIndex.set(nextIndex);
      }

      // Recalculate interval for new layer
      if (this.playbackInterval !== null) {
        clearInterval(this.playbackInterval);
      }
      this.playbackInterval = window.setInterval(advance, calculateInterval());
    };

    this.playbackInterval = window.setInterval(advance, calculateInterval());
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
