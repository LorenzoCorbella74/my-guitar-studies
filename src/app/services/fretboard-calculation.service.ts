import { Injectable } from '@angular/core';
import { Chord, Interval, Note } from 'tonal';
import { TimelineLayer } from '../models/session.model';
import { NUM_FRETS } from '../components/scale-visualization/constants';

/**
 * Represents a single note position on the fretboard
 */
export interface FretNote {
  string: number;
  fret: number;
  note: string;
  octave: number;
  isActive: boolean;
  degree?: string;
  scaleIndex?: number;
  isOverlay?: boolean;
  opacity?: number;
  isFromNextLayer?: boolean;
}

/**
 * Service responsible for fretboard calculations and note positioning.
 * Provides pure functions for computing fret notes, degrees, and colors.
 * 
 * This service handles:
 * - Note calculation for each fret position
 * - Chord degree mapping
 * - Octave calculations across strings
 * - Transition blending between layers
 */
@Injectable({
  providedIn: 'root'
})
export class FretboardCalculationService {
  private readonly noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  /**
   * Compute all fret notes for a single layer.
   * 
   * @param layer - Timeline layer containing chord information
   * @param tuning - Guitar tuning (e.g., ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'])
   * @returns Array of FretNote objects for all string/fret positions
   */
  computeNotesForLayer(layer: TimelineLayer | undefined, tuning: string[]): FretNote[] {
    const notes: FretNote[] = [];
    if (!layer || tuning.length === 0) return notes;

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
      const baseNoteIndex = this.noteNames.indexOf(noteName);

      for (let fret = 0; fret <= NUM_FRETS; fret++) {
        const noteIndex = (baseNoteIndex + fret) % 12;
        const currentNote = this.noteNames[noteIndex];
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

  /**
   * Blend notes from current and next layer during transition.
   * 
   * @param currentLayer - Currently playing layer
   * @param nextLayer - Next layer to transition to
   * @param tuning - Guitar tuning
   * @param transitionProgress - Progress from 0 (full current) to 1 (full next)
   * @returns Combined array of FretNote objects with transition opacity
   */
  blendLayerTransition(
    currentLayer: TimelineLayer,
    nextLayer: TimelineLayer,
    tuning: string[],
    transitionProgress: number
  ): FretNote[] {
    const currentNotes = this.computeNotesForLayer(currentLayer, tuning);
    const nextNotes = this.computeNotesForLayer(nextLayer, tuning);

    // Create maps for quick lookup of active notes
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
  }

  /**
   * Get chord notes for a layer.
   * 
   * @param layer - Timeline layer
   * @returns Array of chord note names (e.g., ['C', 'E', 'G'])
   */
  getChordNotes(layer: TimelineLayer): string[] {
    const chord = Chord.get(`${layer.root}${layer.chordType}`);
    return chord.notes || [];
  }

  /**
   * Get chord notes with their degree intervals.
   * 
   * @param layer - Timeline layer
   * @returns Array of notes with their degree relative to root
   */
  getChordNotesWithDegrees(layer: TimelineLayer): { note: string; degree: string }[] {
    const notes = this.getChordNotes(layer);
    const root = layer.root;

    return notes.map(note => {
      const noteName = note.replace(/[0-9]/g, '');
      const degree = Interval.distance(root, noteName);
      return {
        note: noteName,
        degree: degree || '1P'
      };
    });
  }
}
