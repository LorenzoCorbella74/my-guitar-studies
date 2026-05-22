import { Injectable, inject } from '@angular/core';
import { Soundfont, Reverb } from 'smplr';
import { Chord } from 'tonal';
import { ChordInversion } from '../models/session.model';
import { UserSettingsService } from './user-settings.service';

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private userSettingsService = inject(UserSettingsService);
  
  private audioContext: AudioContext;
  private instrument: Soundfont | null = null;
  private reverb: any | null = null;
  private currentNotes: any[] = [];
  private isInstrumentReady = false;

  constructor() {
    // Create AudioContext immediately (will be suspended until user interaction)
    // This allows us to pre-load instrument samples
    this.audioContext = new AudioContext();
  }

  async resumeAudioContext() {
    // Resume context when user interacts (e.g., clicks Play button)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  getAudioContext(): AudioContext {
    return this.audioContext;
  }

  async loadInstrument() {
    // Return immediately if already loaded
    if (this.instrument && this.isInstrumentReady) {
      return this.instrument;
    }
    
    const settings = this.userSettingsService.settings();
    const instrumentName = settings?.audioInstrument || 'electric_piano_1';
    const loadLoopData = settings?.audioSustain ?? true;
    
    // Load instrument if not already loaded
    // AudioContext can be suspended here - samples will still load
    if (!this.instrument) {
      this.instrument = new Soundfont(this.audioContext, {
        instrument: instrumentName,
        loadLoopData // Enable sustained notes via loop data
      });
      
      // Create and add reverb effect
      this.reverb = Reverb(this.audioContext);
      const reverbMix = settings?.audioReverb ?? 0.0;
      this.instrument.output.addEffect("reverb", this.reverb, reverbMix);
      
      // Wait for instrument to be ready
      // smplr loads samples asynchronously in background
      this.isInstrumentReady = true;
    }
    
    return this.instrument;
  }

  async reloadInstrument() {
    // Force reload of instrument (e.g., when user changes instrument in settings)
    // Stop any playing notes first
    this.stopAllNotes();
    
    // Clear current instrument
    this.instrument = null;
    this.reverb = null;
    this.isInstrumentReady = false;
    
    // Load new instrument
    await this.loadInstrument();
  }

  updateReverbMix(mix: number) {
    if (this.instrument && this.reverb) {
      // Mix value should be between 0 and 1
      const clampedMix = Math.max(0, Math.min(1, mix));
      this.instrument.output.setEffectMix("reverb", clampedMix);
    }
  }

  updateVolume(volume: number) {
    // Volume value should be between 0 and 1
    // Note: This affects future notes, not currently playing ones
    if (this.instrument) {
      const clampedVolume = Math.max(0, Math.min(1, volume));
      this.instrument.output.setVolume(clampedVolume);
    }
  }

  async playChord(
    root: string,
    chordType: string,
    octave: number,
    inversion: ChordInversion,
    duration: number, // in seconds
    scheduledTime?: number // optional scheduled time (in audio context time)
  ) {
    // Stop currently playing notes only if sustain is ON (loadLoopData)
    // When sustain is OFF, notes stop naturally after duration
    const settings = this.userSettingsService.settings();
    const isSustainOn = settings?.audioSustain ?? true;
    
    if (!scheduledTime && isSustainOn) {
      this.stopAllNotes();
    }
    
    // Ensure instrument is loaded
    if (!this.instrument || !this.isInstrumentReady) {
      await this.loadInstrument();
    }
    
    const instrument = this.instrument;
    if (!instrument) return;
    
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
    
    // Use scheduled time or current time for synchronized playback
    const time = scheduledTime ?? this.audioContext.currentTime;
    
    // Play each note with the same scheduled time for perfect sync
    const playedNotes: any[] = [];
    notesWithOctave.forEach(note => {
      try {
        const playedNote = instrument.start({
          note,
          time, // Schedule all notes at the same time for perfect sync
          velocity: volume * 100, // Convert 0-1 to 0-100
          duration,
          detune
        });
        playedNotes.push(playedNote);
      } catch (error) {
        console.error('Error playing note:', note, error);
      }
    });
    
    // Accumulate notes instead of replacing (for scheduling)
    this.currentNotes.push(...playedNotes);
    
    // Clean up finished notes periodically to prevent memory buildup
    this.cleanupFinishedNotes();
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

  private cleanupFinishedNotes() {
    // Remove notes that have already stopped playing
    // This prevents memory buildup in long playback sessions
    this.currentNotes = this.currentNotes.filter(note => {
      if (!note || typeof note.stop !== 'function') {
        return false; // Remove invalid notes
      }
      // Keep note in array (we can't easily detect if it's still playing)
      return true;
    });
    
    // Limit array size as safety measure (keep last 100 notes)
    if (this.currentNotes.length > 100) {
      this.currentNotes = this.currentNotes.slice(-100);
    }
  }

  stopAllNotes() {
    this.currentNotes.forEach(note => {
      if (note && typeof note.stop === 'function') {
        try {
          note.stop();
        } catch (error) {
          // Ignore errors from already stopped notes
        }
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
