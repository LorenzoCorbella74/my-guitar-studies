import { Component, ChangeDetectionStrategy, input, output, signal, computed, effect, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideChevronLeft, LucideChevronRight, LucidePlus, LucideTrash2, LucidePlay, LucideSquare, LucideSettings, LucideCopy } from '@lucide/angular';
import { TimelineItem, TimelineLayer, NoteDuration, OverlayItem } from '../../models/session.model';
import { Chord, ChordType, Interval, Note } from 'tonal';
import { DEGREE_COLOURS, NUM_FRETS, NOTES_WITH_FLATS, FRETBOARD_STYLES, OCTAVE_COLOURS } from '../scale-visualization/constants';
import { MetronomeService } from '../../services/metronome.service';
import { BeatIndicatorComponent } from '../beat-indicator/beat-indicator.component';
import { Dialog } from '@angular/cdk/dialog';
import { DisplayTimelineConfigDialogComponent, DisplayTimelineConfigDialogData, DisplayTimelineConfigDialogResult } from './dialog/display-timeline-config-dialog.component';
import { fade } from '../../animations';

interface FretNote {
  string: number;
  fret: number;
  note: string;
  octave: number;
  isActive: boolean;
  degree?: string;
  scaleIndex?: number;
  isOverlay?: boolean;
  opacity?: number; // For transition animations
  isFromNextLayer?: boolean; // To distinguish during transitions
}

@Component({
  selector: 'app-timeline-visualization',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, LucideChevronLeft, LucideChevronRight, LucidePlus, LucideTrash2, LucidePlay, LucideSquare, BeatIndicatorComponent, LucideSettings, LucideCopy],
  templateUrl: './timeline-visualization.component.html',
  animations: [fade],
  styles: `
    :host {
      display: block;
    }
  `
})
export class TimelineVisualizationComponent implements OnInit {
  timelineItem = input.required<TimelineItem>();
  update = output<TimelineItem>();
  delete = output<void>();
  
  private metronomeService = inject(MetronomeService);
  private dialog = inject(Dialog);

  ngOnInit() {
    // Initialize signals from current layer
    const layer = this.currentLayer();
    if (layer) {
      this.overlays.set(layer.overlays || []);
      this.layerRoot.set(layer.root);
      this.layerChordType.set(layer.chordType);
      this.layerDuration.set(layer.duration);
    }
  }

  // State signals
  currentLayerIndex = signal(0);
  isPlaying = signal(false);
  currentBeat = signal(0); // 0-4 (0 = not playing, 1-4 = active beat)
  private playbackInterval: number | null = null;
  overlays = signal<OverlayItem[]>([]);
  
  // Transition state
  isTransitioning = signal(false);
  transitionProgress = signal(0); // 0-1, where 0 = full current layer, 1 = full next layer
  nextLayerIndex = signal<number | null>(null);
  private transitionAnimationFrame: number | null = null;
  private transitionCheckInterval: number | null = null;
  
  // Layer-specific signals for form binding
  layerRoot = signal<string>('C');
  layerChordType = signal<string>('major');
  layerDuration = signal<NoteDuration>(0.25);

  // Computed values
  layers = computed(() => this.timelineItem().layers);
  currentLayer = computed(() => this.layers()[this.currentLayerIndex()] || this.layers()[0]);
  bpm = computed(() => this.timelineItem().bpm);
  tuning = computed(() => this.timelineItem().tuning);
  colorMode = computed(() => this.timelineItem().colorMode || 'all');
  fretboardColor = computed(() => this.timelineItem().fretboardColor || '#fff');
  
  // Fretboard colors based on current config
  fretboardColors = computed(() => {
    const color = this.fretboardColor();
    const style = FRETBOARD_STYLES.find(s => s.fretboard === color) || FRETBOARD_STYLES[0];
    return {
      frets: style.frets,
      nut: style.nut,
      strings: style.strings,
      inlays: style.inlays
    };
  });

  // Chord information
  chordNotes = computed(() => {
    const layer = this.currentLayer();
    if (!layer) return [];
    const chord = Chord.get(`${layer.root}${layer.chordType}`);
    return chord.notes || [];
  });

  // Notes with degrees for the current chord (like scale-visualization)
  chordNotesWithDegrees = computed(() => {
    const layer = this.currentLayer();
    if (!layer) return [];
    const notes = this.chordNotes();
    const root = layer.root;
    
    return notes.map(note => {
      const noteName = note.replace(/[0-9]/g, '');
      const degree = Interval.distance(root, noteName);
      return {
        note: noteName,
        degree: degree || '1P'
      };
    });
  });

  chordTypeOptions = ChordType.all().map(ct => ct.aliases[0] || ct.name);
  noteOptions = NOTES_WITH_FLATS;

  // Fretboard layout constants (same as scale-visualization)
  leftMargin = 40;
  rightMargin = 15;
  fretWidth = 80;
  stringSpacing = 38;
  fretboardWidth = computed(() => this.leftMargin + (NUM_FRETS * this.fretWidth) + this.rightMargin);
  fretboardHeight = computed(() => 60 + (this.strings.length - 1) * this.stringSpacing + 20);
  frets = Array.from({ length: NUM_FRETS + 1 }, (_, i) => i);
  strings = [0, 1, 2, 3, 4, 5];
  fretMarkers = [3, 5, 7, 9];

  // Helper to compute notes for a specific layer
  private computeNotesForLayer(layer: TimelineLayer | undefined, tuning: string[]): FretNote[] {
    const notes: FretNote[] = [];
    if (!layer || tuning.length === 0) return notes;

    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const chord = Chord.get(`${layer.root}${layer.chordType}`);
    const chordNotes = chord.notes || [];
    const activeNotes = layer.activeNotes || {};
    
    // Create a map from chroma to the correct chord note name and its index
    const chromaToChordInfo = new Map<number, { noteName: string; index: number }>();
    chordNotes.forEach((cn, idx) => {
      const noteName = cn.replace(/\d+/, '');
      const chroma = Note.chroma(noteName);
      if (chroma !== undefined) {
        chromaToChordInfo.set(chroma, { noteName, index: idx });
      }
    });

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

        // Get the chroma of the current fret note
        const currentChroma = Note.chroma(currentNote);
        
        // Get chord info (note name and index)
        const chordInfo = currentChroma !== undefined ? chromaToChordInfo.get(currentChroma) : undefined;

        // Calculate interval degree for ALL notes relative to root
        let degree: string | undefined;
        let scaleIndex: number | undefined;
        
        if (layer.root && currentChroma !== undefined) {
          const noteForInterval = chordInfo ? chordInfo.noteName : currentNote;
          const interval = Interval.distance(layer.root, noteForInterval);
          degree = interval;
          
          if (chordInfo) {
            scaleIndex = chordInfo.index;
          }
        }

        notes.push({
          string: stringIndex,
          fret,
          note: currentNote,
          octave: currentOctave,
          isActive,
          degree,
          scaleIndex,
          opacity: 1
        });
      }
    });

    return notes;
  }

  // Fret notes computation with transition support
  fretNotes = computed(() => {
    const tuning = this.tuning();
    const layer = this.currentLayer();
    const isTransitioning = this.isTransitioning();
    const transitionProgress = this.transitionProgress();
    const nextLayerIdx = this.nextLayerIndex();

    if (tuning.length === 0) return [];

    // If not transitioning, return normal notes
    if (!isTransitioning || nextLayerIdx === null) {
      return this.computeNotesForLayer(layer, tuning);
    }

    // During transition: combine current and next layer notes
    const currentNotes = this.computeNotesForLayer(layer, tuning);
    const nextLayer = this.layers()[nextLayerIdx];
    const nextNotes = this.computeNotesForLayer(nextLayer, tuning);

    // Create a map for quick lookup
    const currentActiveMap = new Map<string, FretNote>();
    const nextActiveMap = new Map<string, FretNote>();

    currentNotes.forEach(note => {
      if (note.isActive) {
        const key = `${note.string}-${note.fret}`;
        currentActiveMap.set(key, note);
      }
    });

    nextNotes.forEach(note => {
      if (note.isActive) {
        const key = `${note.string}-${note.fret}`;
        nextActiveMap.set(key, note);
      }
    });

    // Build combined notes with transition opacity
    const combinedNotes: FretNote[] = [];
    const processedKeys = new Set<string>();

    // Process all fret positions
    currentNotes.forEach(note => {
      const key = `${note.string}-${note.fret}`;
      processedKeys.add(key);

      const isCurrentActive = currentActiveMap.has(key);
      const isNextActive = nextActiveMap.has(key);

      if (isCurrentActive && isNextActive) {
        // Note is active in both layers - keep it solid (morph effect)
        combinedNotes.push({ ...note, isActive: true, opacity: 1 });
      } else if (isCurrentActive) {
        // Note fading out
        combinedNotes.push({ ...note, isActive: true, opacity: 1 - transitionProgress });
      } else if (isNextActive) {
        // Note fading in - use next layer's data for correct degree/color
        const nextNote = nextActiveMap.get(key);
        if (nextNote) {
          combinedNotes.push({ 
            ...nextNote, 
            isActive: true, 
            opacity: transitionProgress,
            isFromNextLayer: true
          });
        }
      } else {
        // Note not active in either layer
        combinedNotes.push({ ...note, isActive: false, opacity: 1 });
      }
    });

    return combinedNotes;
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
      this.syncLayerSignals();
    }
  }

  nextLayer() {
    if (this.isPlaying()) return;
    const index = this.currentLayerIndex();
    const maxIndex = this.layers().length - 1;
    if (index < maxIndex) {
      this.currentLayerIndex.set(index + 1);
      this.syncLayerSignals();
    }
  }

  private syncLayerSignals() {
    const layer = this.currentLayer();
    if (layer) {
      this.layerRoot.set(layer.root);
      this.layerChordType.set(layer.chordType);
      this.layerDuration.set(layer.duration);
      this.overlays.set(layer.overlays || []);
    }
  }

  addLayer() {
    if (this.isPlaying()) return;
    const newLayer: TimelineLayer = {
      id: `layer_${Date.now()}`,
      root: 'C',
      chordType: 'major',
      duration: 0.25,
      activeNotes: {},
      overlays: []
    };
    const updated: TimelineItem = {
      ...this.timelineItem(),
      layers: [...this.layers(), newLayer]
    };
    this.update.emit(updated);
    this.currentLayerIndex.set(this.layers().length);
    // Sync with new layer values
    this.layerRoot.set(newLayer.root);
    this.layerChordType.set(newLayer.chordType);
    this.layerDuration.set(newLayer.duration);
    this.overlays.set(newLayer.overlays || []);
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
    let newIndex = index;
    if (index >= newLayers.length) {
      newIndex = newLayers.length - 1;
      this.currentLayerIndex.set(newIndex);
    }
    
    // Sync with the layer we're now on
    setTimeout(() => this.syncLayerSignals(), 0);
  }

  // Editing methods
  updateChordRoot(root: string) {
    if (this.isPlaying()) return;
    this.layerRoot.set(root);
    this.updateCurrentLayer({ root });
  }

  updateChordType(chordType: string) {
    if (this.isPlaying()) return;
    this.layerChordType.set(chordType);
    this.updateCurrentLayer({ chordType });
  }

  updateDuration(duration: NoteDuration) {
    if (this.isPlaying()) return;
    this.layerDuration.set(duration);
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
    
    // Resume AudioContext (required by some browsers)
    await this.metronomeService.resumeAudioContext();
    
    this.isPlaying.set(true);
    this.currentLayerIndex.set(0);
    this.syncLayerSignals(); // Sync with layer 0 at start
    this.currentBeat.set(0);
    
    this.startPlayback();
  }

  stop() {
    this.isPlaying.set(false);
    this.currentBeat.set(0);
    if (this.playbackInterval !== null) {
      clearInterval(this.playbackInterval);
      this.playbackInterval = null;
    }
    if (this.transitionCheckInterval !== null) {
      clearInterval(this.transitionCheckInterval);
      this.transitionCheckInterval = null;
    }
    if (this.transitionAnimationFrame !== null) {
      cancelAnimationFrame(this.transitionAnimationFrame);
      this.transitionAnimationFrame = null;
    }
    this.isTransitioning.set(false);
    this.transitionProgress.set(0);
    this.nextLayerIndex.set(null);
    this.currentLayerIndex.set(0);
    this.syncLayerSignals(); // Sync back to layer 0
  }

  private startPlayback() {
    const bpm = this.bpm();
    const beatDuration = 60000 / bpm; // milliseconds per quarter note beat
    
    let globalBeatCounter = 0; // Counter for beats across all measures (for beat indicator 1-4)
    let layerBeatCounter = 0; // Counter for beats within current layer
    let layerStartTime = Date.now(); // Track when current layer started
    
    // Play first beat immediately
    this.metronomeService.playClick(true); // Accent on first beat
    this.currentBeat.set(1);
    
    // High-frequency check for transitions (every 50ms for precise timing)
    this.transitionCheckInterval = window.setInterval(() => {
      if (!this.isPlaying() || this.isTransitioning()) return;
      
      const currentLayer = this.layers()[this.currentLayerIndex()];
      const beatsForLayer = currentLayer.duration * 4;
      const layerDurationMs = beatsForLayer * beatDuration;
      
      // Calculate transition duration (proportional to layer duration, max 800ms, min 400ms)
      const transitionDuration = Math.max(400, Math.min(800, layerDurationMs * 0.3));
      
      const elapsedInLayer = Date.now() - layerStartTime;
      const timeUntilNextLayer = layerDurationMs - elapsedInLayer;
      
      // Start transition if we're within transition duration of the next layer
      if (timeUntilNextLayer <= transitionDuration && timeUntilNextLayer > 0) {
        const nextIndex = this.currentLayerIndex() + 1;
        const nextLayerIdx = nextIndex >= this.layers().length ? 0 : nextIndex;
        this.startTransition(nextLayerIdx, transitionDuration);
      }
    }, 50); // Check every 50ms for smooth timing
    
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
      
      // Advance layer when we've played all beats for current layer
      if (layerBeatCounter >= beatsForLayer) {
        layerBeatCounter = 0; // Reset layer beat counter
        layerStartTime = Date.now(); // Reset layer start time for next layer
        
        const nextIndex = this.currentLayerIndex() + 1;
        if (nextIndex >= this.layers().length) {
          // Loop back to start
          this.currentLayerIndex.set(0);
          this.syncLayerSignals();
          globalBeatCounter = 0; // Reset to sync beat indicator
          this.currentBeat.set(1); // Start from beat 1 again
        } else {
          this.currentLayerIndex.set(nextIndex);
          this.syncLayerSignals();
        }
        
        // End transition after layer change is complete
        this.endTransition();
      }
    };
    
    this.playbackInterval = window.setInterval(tick, beatDuration);
  }

  private startTransition(nextLayerIndex: number, duration: number) {
    this.isTransitioning.set(true);
    this.nextLayerIndex.set(nextLayerIndex);
    this.transitionProgress.set(0);
    
    const startTime = Date.now();
    
    const animate = () => {
      if (!this.isTransitioning()) {
        return;
      }
      
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-in-out function for smoother animation
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      
      this.transitionProgress.set(eased);
      
      if (progress < 1) {
        this.transitionAnimationFrame = requestAnimationFrame(animate);
      }
    };
    
    this.transitionAnimationFrame = requestAnimationFrame(animate);
  }

  private endTransition() {
    this.isTransitioning.set(false);
    this.transitionProgress.set(0);
    this.nextLayerIndex.set(null);
    
    if (this.transitionAnimationFrame !== null) {
      cancelAnimationFrame(this.transitionAnimationFrame);
      this.transitionAnimationFrame = null;
    }
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

  getNoteColor(degree?: string, noteName?: string, octave?: number, scaleIndex?: number): string {
    const colorMode = this.colorMode();
    
    // If no degree calculated, use default yellow
    if (!degree) return DEGREE_COLOURS['1P'];
    
    if (colorMode === 'monocolor') {
      return DEGREE_COLOURS['1P'];
    }
    
    if (colorMode === 'octaves') {
      if (octave === undefined) return DEGREE_COLOURS['1P'];
      return OCTAVE_COLOURS[octave] || DEGREE_COLOURS['1P'];
    }
    
    if (colorMode === 'triads') {
      // For triads: highlight root, third, and fifth with specific colors
      // All other notes (including other chord tones like 7th, 9th, etc.) get blue
      
      // Root (1P) = yellow
      if (degree === '1P') return DEGREE_COLOURS['1P'];
      
      // Third (3M or 3m) = orange  
      if (degree === '3M' || degree === '3m') {
        return DEGREE_COLOURS[degree as keyof typeof DEGREE_COLOURS];
      }
      
      // Fifth (5P, 5d, or 5A) = red
      if (degree === '5P' || degree === '5d' || degree === '5A') {
        return DEGREE_COLOURS[degree as keyof typeof DEGREE_COLOURS] || DEGREE_COLOURS['5P'];
      }
      
      // All other notes = blue
      return '#3b82f6';
    }
    
    // 'all' mode - color by degree using DEGREE_COLOURS (same as scale-visualization)
    // Use the actual degree for proper color mapping
    const color = DEGREE_COLOURS[degree as keyof typeof DEGREE_COLOURS];
    return color || DEGREE_COLOURS['1P'];
  }

  handleNoteClick(fretNote: FretNote, event: MouseEvent) {
    if (this.isPlaying()) return;
    
    // Ctrl+click or Cmd+click: toggle overlay
    if (event.ctrlKey || event.metaKey) {
      this.toggleOverlayNote(fretNote.string, fretNote.fret);
    } else {
      // Normal click: toggle active note
      this.toggleNote(fretNote.string, fretNote.fret);
    }
  }

  toggleOverlayNote(stringIndex: number, fret: number) {
    const currentLayer = this.currentLayer();
    const overlays = currentLayer.overlays || [];
    
    // Find or create overlay for timeline positions
    let overlay = overlays.find(o => o.type === 'notes');
    const positions = overlay?.notes || [];
    
    // Create position key (e.g., "0-3" for string 0, fret 3)
    const positionKey = `${stringIndex}-${fret}`;
    
    // Toggle position visibility
    const positionIndex = positions.indexOf(positionKey);
    let updatedPositions: string[];
    if (positionIndex >= 0) {
      updatedPositions = positions.filter((_, i) => i !== positionIndex);
    } else {
      updatedPositions = [...positions, positionKey];
    }
    
    const updatedOverlay: OverlayItem = {
      type: 'notes',
      notes: updatedPositions,
      visible: true
    };
    
    const updatedOverlays = overlay
      ? overlays.map(o => o.type === 'notes' ? updatedOverlay : o)
      : [...overlays, updatedOverlay];
    
    // Update the current layer with new overlays
    const layerIndex = this.currentLayerIndex();
    const layers = this.layers();
    const updatedLayer = {
      ...currentLayer,
      overlays: updatedOverlays
    };
    const newLayers = layers.map((layer, i) => i === layerIndex ? updatedLayer : layer);
    
    const updated: TimelineItem = {
      ...this.timelineItem(),
      layers: newLayers
    };
    this.update.emit(updated);
    
    // Sync local overlays signal
    this.overlays.set(updatedOverlays);
  }

  isOverlayNote(fretNote: FretNote): boolean {
    const overlays = this.overlays();
    const positionKey = `${fretNote.string}-${fretNote.fret}`;
    
    return overlays.some(overlay => {
      if (!overlay.visible && overlay.visible !== undefined) return false;
      if (overlay.type === 'notes' && overlay.notes) {
        return overlay.notes.includes(positionKey);
      }
      return false;
    });
  }

  openConfigModal(): void {
    const dialogData: DisplayTimelineConfigDialogData = {
      colorMode: this.colorMode(),
      fretboardColor: this.fretboardColor()
    };

    const dialogRef = this.dialog.open<DisplayTimelineConfigDialogResult, DisplayTimelineConfigDialogData>(
      DisplayTimelineConfigDialogComponent,
      {
        data: dialogData,
        disableClose: false,
        hasBackdrop: true,
        width: '48rem',
        maxWidth: '90vw',
        maxHeight: '90vh'
      }
    );

    dialogRef.closed.subscribe(result => {
      if (result) {
        const updated: TimelineItem = {
          ...this.timelineItem(),
          colorMode: result.colorMode,
          fretboardColor: result.fretboardColor
        };
        this.update.emit(updated);
      }
    });
  }

  cloneLayer() {
    if (this.isPlaying()) return;
    const currentLayer = this.currentLayer();
    const clonedLayer: TimelineLayer = {
      ...currentLayer,
      id: `layer_${Date.now()}`,
      activeNotes: { ...currentLayer.activeNotes },
      overlays: currentLayer.overlays ? [...currentLayer.overlays] : []
    };
    const updated: TimelineItem = {
      ...this.timelineItem(),
      layers: [...this.layers(), clonedLayer]
    };
    this.update.emit(updated);
    this.currentLayerIndex.set(this.layers().length);
    // Sync with cloned layer values (same as current)
    this.layerRoot.set(clonedLayer.root);
    this.layerChordType.set(clonedLayer.chordType);
    this.layerDuration.set(clonedLayer.duration);
    this.overlays.set(clonedLayer.overlays || []);
  }

  handleDelete() {
    this.delete.emit();
  }
}
