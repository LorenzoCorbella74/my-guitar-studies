import { Injectable, inject } from '@angular/core';
import { SplendidGrandPiano, Soundfont } from 'smplr';
import { Chord } from 'tonal';
import { ChordInversion } from '../models/session.model';
import { UserSettingsService } from './user-settings.service';

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private userSettingsService = inject(UserSettingsService);
  
  private audioContext: AudioContext | null = null;
  private instrument: Soundfont | null = null;
  private currentNotes: any[] = [];
  private isInstrumentReady = false;

  async initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    
    // Resume context if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    return this.audioContext;
  }

  async loadInstrument() {
    // Return immediately if already loaded
    if (this.instrument && this.isInstrumentReady) {
      return this.instrument;
    }
    
    const settings = this.userSettingsService.settings();
    const instrumentName = settings?.audioInstrument || 'string_ensemble_1';
    
    const context = await this.initAudioContext();
    
    // Load instrument if not already loaded
    if (!this.instrument) {
      this.instrument = new Soundfont(context, {
        instrument: instrumentName
      });
      
      // Wait for instrument to be ready
      // smplr loads samples asynchronously in background
      this.isInstrumentReady = true;
    }
    
    return this.instrument;
  }

  async playChord(
    root: string,
    chordType: string,
    octave: number,
    inversion: ChordInversion,
    duration: number // in seconds
  ) {
    // Stop any currently playing notes
    this.stopAllNotes();
    
    // Ensure instrument is loaded
    if (!this.instrument || !this.isInstrumentReady) {
      await this.loadInstrument();
    }
    
    const instrument = this.instrument;
    if (!instrument) return;
    
    const settings = this.userSettingsService.settings();
    
    // Get chord notes from Tonal
    const chord = Chord.get(`${root}${chordType}`);
    let notes = chord.notes;
    
    if (notes.length === 0) {
      console.warn(`No notes found for chord: ${root}${chordType}`);
      return;
    }
    
    // Apply inversion
    notes = this.applyInversion(notes, inversion);
    
    // Add octave to notes
    const notesWithOctave = notes.map((note, index) => {
      // Distribute notes across octaves naturally
      const noteOctave = octave + Math.floor(index / notes.length);
      return `${note}${noteOctave}`;
    });
    
    // Get audio settings
    const volume = settings?.audioVolume ?? 0.7;
    const detune = settings?.audioDetune ?? 0;
    const sustain = settings?.audioSustain ?? true;
    
    // Play each note synchronously
    const playedNotes: any[] = [];
    notesWithOctave.forEach(note => {
      try {
        const playedNote = instrument.start({
          note,
          velocity: volume * 100, // Convert 0-1 to 0-100
          duration: sustain ? duration : duration * 0.7, // Shorter duration if no sustain
          detune
        });
        playedNotes.push(playedNote);
      } catch (error) {
        console.error('Error playing note:', note, error);
      }
    });
    
    this.currentNotes = playedNotes;
  }

  private applyInversion(notes: string[], inversion: ChordInversion): string[] {
    if (notes.length === 0) return notes;
    
    const result = [...notes];
    
    switch (inversion) {
      case '1st':
        // Move root to the end
        result.push(result.shift()!);
        break;
      case '2nd':
        // Move root and third to the end
        result.push(result.shift()!);
        result.push(result.shift()!);
        break;
      case '3rd':
        // Move first three notes to the end (only for 4+ note chords)
        if (notes.length >= 4) {
          result.push(result.shift()!);
          result.push(result.shift()!);
          result.push(result.shift()!);
        }
        break;
      case 'root':
      default:
        // No change
        break;
    }
    
    return result;
  }

  stopAllNotes() {
    this.currentNotes.forEach(note => {
      if (note && typeof note.stop === 'function') {
        note.stop();
      }
    });
    this.currentNotes = [];
  }

  cleanup() {
    this.stopAllNotes();
    if (this.instrument) {
      // Cleanup instrument if needed
      this.instrument = null;
      this.isInstrumentReady = false;
    }
  }
}
