import { Injectable, inject } from '@angular/core';
import { Soundfont, Reverb, DrumMachine } from 'smplr';
import { Chord, Note } from 'tonal';
import { ChordInversion } from '../models/session.model';
import { UserSettingsService } from './user-settings.service';
import { DRUM_PATTERNS, DrumGenre } from '../data/drum-patterns';

/**
 * Servizio audio centrale per la sintesi e riproduzione polifonica.
 * Gestisce:
 * - Riproduzione accordi polifonici con campioni Soundfont GM (smplr)
 * - Schedulazione pattern di batteria con drum machine classiche (TR-808, LM-2, ecc.)
 * - Effetti di riverbero algoritmico (DattorroReverb)
 * - Controllo del volume indipendente per strumento armonico e drum kit
 */
@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private userSettingsService = inject(UserSettingsService);
  
  /** AudioContext condiviso per tutte le istanze audio */
  private audioContext: AudioContext;

  /** Istanza smplr Soundfont per gli accordi */
  private instrument: any | null = null;
  private currentInstrumentName: string | null = null;
  private currentSustain: boolean | null = null;
  private reverb: any | null = null;
  private currentNotes: any[] = [];
  private isInstrumentReady = false;
  private instrumentReadyPromise: Promise<void> | null = null;

  /** Istanza smplr DrumMachine per la batteria */
  private drumMachine: any | null = null;
  private currentDrumKit: string | null = null;
  private isDrumMachineReady = false;
  private drumMachineReadyPromise: Promise<void> | null = null;

  constructor() {
    this.audioContext = new AudioContext();
  }

  /**
   * Riattiva l'AudioContext se sospeso dalle policy di autoplay del browser.
   */
  async resumeAudioContext(): Promise<void> {
    if (this.audioContext.state === 'suspended' || (this.audioContext.state as string) === 'interrupted') {
      await this.audioContext.resume();
    }
  }

  /**
   * Restituisce il contesto Web Audio corrente.
   */
  getAudioContext(): AudioContext {
    return this.audioContext;
  }

  /**
   * Inizializza e carica i campioni dello strumento armonico Soundfont.
   * 
   * @param customInstrumentName Nome dell'instrument (es. 'electric_piano_1')
   * @param customSustain Se attivare il caricamento dei metadati di loop per il sustain
   */
  async loadInstrument(customInstrumentName?: string, customSustain?: boolean): Promise<any> {
    const settings = this.userSettingsService.settings();
    const instrumentName = customInstrumentName || settings?.audioInstrument || 'electric_piano_1';
    const loadLoopData = customSustain ?? (settings?.audioSustain ?? true);

    if (
      this.instrument &&
      this.isInstrumentReady &&
      this.currentInstrumentName === instrumentName &&
      this.currentSustain === loadLoopData
    ) {
      return this.instrument;
    }

    if (
      this.instrument &&
      (this.currentInstrumentName !== instrumentName || this.currentSustain !== loadLoopData)
    ) {
      this.stopAllNotes();
      this.instrument = null;
      this.reverb = null;
      this.isInstrumentReady = false;
      this.instrumentReadyPromise = null;
    }
    
    if (!this.instrument) {
      this.currentInstrumentName = instrumentName;
      this.currentSustain = loadLoopData;
      
      try {
        const factory = Soundfont as any;
        this.instrument = typeof factory === 'function'
          ? factory(this.audioContext, { instrument: instrumentName, loadLoopData })
          : new factory(this.audioContext, { instrument: instrumentName, loadLoopData });
      } catch (err) {
        console.error('Errore creazione Soundfont:', err);
        return null;
      }

      const inst = this.instrument;
      if (inst) {
        if (inst.output) {
          const userVol = settings?.audioVolume ?? 0.7;
          inst.output.volume = Math.round(userVol * 127);
        }

        try {
          this.reverb = Reverb(this.audioContext);
          const reverbMix = settings?.audioReverb ?? 0.0;
          if (inst.output?.addEffect) {
            inst.output.addEffect("reverb", this.reverb, reverbMix);
          }
        } catch (e) {
          console.warn('Reverb non disponibile:', e);
        }

        this.instrumentReadyPromise = Promise.resolve(inst.ready).then(() => {
          this.isInstrumentReady = true;
        }).catch(error => {
          console.error('Errore caricamento campioni strumento:', instrumentName, error);
          this.instrument = null;
          this.isInstrumentReady = false;
          this.instrumentReadyPromise = null;
          throw error;
        });
      }
    }

    if (this.instrumentReadyPromise) {
      await this.instrumentReadyPromise;
    }
    return this.instrument;
  }

  /**
   * Ricarica forzatamente lo strumento armonico.
   */
  async reloadInstrument(customInstrumentName?: string, customSustain?: boolean): Promise<void> {
    this.stopAllNotes();
    this.instrument = null;
    this.reverb = null;
    this.isInstrumentReady = false;
    this.instrumentReadyPromise = null;
    await this.loadInstrument(customInstrumentName, customSustain);
  }

  /**
   * Inizializza e carica i campioni del drum kit percussivo (smplr.DrumMachine).
   * 
   * @param kitName Nome del kit supportato (es. 'TR-808', 'Casio-RZ1', 'LM-2', 'MFB-512', 'Roland CR-8000')
   */
  async loadDrumMachine(kitName?: string): Promise<any> {
    const settings = this.userSettingsService.settings();
    const drumKit = kitName || settings?.audioDrumKit || 'TR-808';

    if (this.drumMachine && this.currentDrumKit === drumKit && this.isDrumMachineReady) {
      return this.drumMachine;
    }

    if (this.drumMachine && this.currentDrumKit !== drumKit) {
      this.drumMachine = null;
      this.isDrumMachineReady = false;
      this.drumMachineReadyPromise = null;
    }

    if (!this.drumMachine) {
      this.currentDrumKit = drumKit;
      try {
        const factory = DrumMachine as any;
        this.drumMachine = typeof factory === 'function'
          ? factory(this.audioContext, { instrument: drumKit })
          : new factory(this.audioContext, { instrument: drumKit });
      } catch (err) {
        console.error('Errore creazione DrumMachine:', err);
        return null;
      }

      const dm = this.drumMachine;
      if (dm) {
        if (dm.output) {
          const drumVol = settings?.audioDrumVolume ?? 0.7;
          dm.output.volume = Math.round(drumVol * 127);
        }

        this.drumMachineReadyPromise = Promise.resolve(dm.ready).then(() => {
          this.isDrumMachineReady = true;
        }).catch(error => {
          console.warn('Errore caricamento drum kit:', drumKit, error);
          this.drumMachine = null;
          this.isDrumMachineReady = false;
          this.drumMachineReadyPromise = null;
        });
      }
    }

    if (this.drumMachineReadyPromise) {
      await this.drumMachineReadyPromise;
    }
    return this.drumMachine;
  }

  /**
   * Ricarica forzatamente il kit di batteria.
   */
  async reloadDrumMachine(kitName?: string): Promise<void> {
    this.drumMachine = null;
    this.isDrumMachineReady = false;
    this.drumMachineReadyPromise = null;
    await this.loadDrumMachine(kitName);
  }

  /**
   * Aggiorna la mandata del riverbero (0..1) sullo strumento armonico.
   */
  updateReverbMix(mix: number): void {
    if (this.instrument && this.reverb && this.instrument.output?.setEffectMix) {
      const clampedMix = Math.max(0, Math.min(1, mix));
      this.instrument.output.setEffectMix("reverb", clampedMix);
    }
  }

  /**
   * Imposta il volume master dello strumento armonico (0..1).
   */
  updateVolume(volume: number): void {
    const midiVolume = Math.max(0, Math.min(127, Math.round(volume * 127)));
    if (this.instrument?.output) {
      this.instrument.output.volume = midiVolume;
    }
  }

  /**
   * Imposta il volume master del drum kit (0..1).
   */
  updateDrumVolume(volume: number): void {
    const midiVolume = Math.max(0, Math.min(127, Math.round(volume * 127)));
    if (this.drumMachine?.output) {
      this.drumMachine.output.volume = midiVolume;
    }
  }

  /**
   * Mappa il nome logico del colpo ritmico ('kick', 'snare', ecc.) sul nome reale del campione audio del kit.
   */
  private resolveDrumSample(logicalNote: string): string | null {
    if (!this.drumMachine) return null;

    const groupNames: string[] = typeof this.drumMachine.getGroupNames === 'function'
      ? this.drumMachine.getGroupNames()
      : [];
    const sampleNames: string[] = typeof this.drumMachine.getSampleNames === 'function'
      ? this.drumMachine.getSampleNames()
      : [];

    if (groupNames.includes(logicalNote)) return logicalNote;
    if (sampleNames.includes(logicalNote)) return logicalNote;

    const noteLower = logicalNote.toLowerCase();

    const candidateMap: Record<string, string[]> = {
      kick: ['kick', 'kick-alt', 'bd'],
      snare: ['snare', 'snare-m', 'snare-h', 'snare-l', 'sd'],
      hihat: ['hihat-close', 'hihat-closed', 'hhclosed', 'hhclosed-short', 'hhclosed-long', 'hihat', 'ch'],
      openhat: ['hihat-open', 'hhopen', 'openhat', 'oh00', 'oh'],
      rim: ['rimshot', 'stick-m', 'stick-h', 'stick-l', 'clave', 'rim', 'rs'],
      clap: ['clap', 'cp'],
      ride: ['ride', 'cymbal', 'cymball', 'crash'],
      crash: ['crash', 'cymbal', 'cymball', 'ride'],
      cowbell: ['cowbell', 'cb']
    };

    const candidates = candidateMap[noteLower] || [noteLower];

    for (const candidate of candidates) {
      const matchingGroup = groupNames.find(g => g.toLowerCase() === candidate.toLowerCase());
      if (matchingGroup) return matchingGroup;

      const matchingSample = sampleNames.find(s => s.toLowerCase().includes(candidate.toLowerCase()));
      if (matchingSample) return matchingSample;
    }

    return groupNames[0] || null;
  }

  /**
   * Esegue i colpi percussivi associati al quarto specificato nella battuta.
   *
   * @param genre Genere musicale (es. 'pop', 'rock', 'funk', 'blues', ecc.)
   * @param beatInBar Posizione del beat (0, 1, 2, 3)
   * @param scheduledTime Orario schedulato nell'AudioContext
   * @param beatDuration Durata del beat in secondi
   * @param drumVolume Volume dedicato per la batteria
   */
  playDrumBeat(
    genre: DrumGenre,
    beatInBar: number,
    scheduledTime: number,
    beatDuration: number,
    drumVolume?: number
  ): void {
    if (genre === 'metronome') return;

    const pattern = DRUM_PATTERNS[genre];
    if (!pattern || pattern.hits.length === 0) return;

    if (!this.drumMachine || !this.isDrumMachineReady) {
      this.loadDrumMachine().catch(() => {});
      return;
    }

    const settings = this.userSettingsService.settings();
    const effectiveVolume = drumVolume ?? (settings?.audioDrumVolume ?? 0.7);
    this.updateDrumVolume(effectiveVolume);

    const barDuration = beatDuration * 4;
    const beatStartOffset = beatInBar / 4;
    const beatEndOffset = (beatInBar + 1) / 4;

    const currentBeatHits = pattern.hits.filter(
      hit => hit.offset >= beatStartOffset - 0.0001 && hit.offset < beatEndOffset - 0.0001
    );

    const now = this.audioContext.currentTime;

    currentBeatHits.forEach(hit => {
      const sampleToPlay = this.resolveDrumSample(hit.note);
      if (!sampleToPlay) return;

      const timeWithinBeat = (hit.offset - beatStartOffset) * barDuration;
      const hitTime = Math.max(now, scheduledTime + timeWithinBeat);
      const velocity = hit.velocity ?? 100;

      try {
        this.drumMachine.start({
          note: sampleToPlay,
          time: hitTime,
          velocity
        });
      } catch {
        try {
          this.drumMachine.start(sampleToPlay);
        } catch (err) {
          console.warn('Errore trigger drum hit:', sampleToPlay, err);
        }
      }
    });
  }

  /**
   * Esegue la riproduzione polifonica di un accordo armonico con rivolti e scheduling preciso
   * sfruttando Tonal.Chord.degrees per la corretta determinazione di ottave e inversioni.
   *
   * @param root Tonica dell'accordo (es. 'C', 'G#', 'Eb')
   * @param chordType Tipo accordo (es. 'major', 'm7', 'maj7')
   * @param octave Ottava di riferimento (es. 3)
   * @param inversion Rivolto ('root', '1st', '2nd', '3rd')
   * @param duration Durata in secondi
   * @param scheduledTime Timestamp AudioContext programmato
   * @param customInstrument Strumento sonoro da utilizzare
   * @param customVolume Volume dello strumento
   */
  async playChord(
    root: string,
    chordType: string,
    octave: number,
    inversion: ChordInversion,
    duration: number,
    scheduledTime?: number,
    customInstrument?: string,
    customVolume?: number
  ): Promise<void> {
    const settings = this.userSettingsService.settings();
    const isSustainOn = settings?.audioSustain ?? true;
    
    if (!scheduledTime && isSustainOn) {
      this.stopAllNotes();
    }
    
    if (!this.instrument || !this.isInstrumentReady || (customInstrument && this.currentInstrumentName !== customInstrument)) {
      await this.loadInstrument(customInstrument);
    }
    
    const instrument = this.instrument;
    if (!instrument) return;

    const effectiveVolume = customVolume ?? (settings?.audioVolume ?? 0.7);
    this.updateVolume(effectiveVolume);
    
    // Calcola le note dell'accordo con ottava e rivolto tramite Tonal.Chord.degrees
    const notesWithOctave = this.applyInversion(root, chordType, octave, inversion);
    
    if (notesWithOctave.length === 0) {
      console.warn(`Nessuna nota trovata per l'accordo: ${root}${chordType}`);
      return;
    }
    
    const detune = settings?.audioDetune ?? 0;
    const now = this.audioContext.currentTime;
    const time = Math.max(now, scheduledTime ?? now);
    
    const playedNotes: any[] = [];
    notesWithOctave.forEach(noteName => {
      try {
        const midiNum = Note.midi(noteName);
        const playedNote = instrument.start({
          note: midiNum ?? noteName,
          time,
          velocity: 100,
          duration,
          detune
        });
        playedNotes.push(playedNote);
      } catch (error) {
        console.error('Errore riproduzione nota:', noteName, error);
      }
    });
    
    this.currentNotes.push(...playedNotes);
    this.cleanupFinishedNotes();
  }

  /**
   * Calcola le note con ottave dell'accordo e applica il rivolto specificato
   * utilizzando Tonal.Chord.degrees (https://tonaljs.github.io/tonal/docs/groups/chords#chorddegrees).
   *
   * @param root Tonica dell'accordo (es. 'C')
   * @param chordType Tipo accordo (es. 'major', 'm7', 'maj7')
   * @param octave Ottava di partenza (es. 3)
   * @param inversion Rivolto ('root', '1st', '2nd', '3rd')
   * @returns Array di note con ottava (es. ['E3', 'G3', 'B3', 'C4'] per 1° rivolto di C3maj7)
   */
  applyInversion(
    root: string,
    chordType: string,
    octave: number,
    inversion: ChordInversion
  ): string[] {
    let chord = Chord.get(`${root}${chordType}`);
    if (!chord.notes || chord.notes.length === 0) {
      chord = Chord.get(`${root} ${chordType}`);
    }

    const numNotes = chord.notes?.length || 0;
    if (numNotes === 0) {
      return [];
    }

    const tonicWithOctave = `${root}${octave}`;
    const resolvedType = chord.type || chord.aliases[0] || chordType || 'major';

    // Ottiene la funzione Chord.degrees di Tonal (1-indexed)
    let degreeFn = Chord.degrees(resolvedType, tonicWithOctave);
    if (!degreeFn(1)) {
      degreeFn = Chord.degrees(chordType, tonicWithOctave);
    }

    // Determina il grado di partenza in base al rivolto
    let startDegree = 1;
    switch (inversion) {
      case '1st':
        startDegree = numNotes >= 2 ? 2 : 1;
        break;
      case '2nd':
        startDegree = numNotes >= 3 ? 3 : 1;
        break;
      case '3rd':
        startDegree = numNotes >= 4 ? 4 : 1;
        break;
      case 'root':
      default:
        startDegree = 1;
        break;
    }

    // Genera l'array di gradi (es. per 1st inv a 4 voci: [2, 3, 4, 5])
    const degreeIndices = Array.from({ length: numNotes }, (_, i) => startDegree + i);
    const notesWithOctave = degreeIndices.map(d => degreeFn(d)).filter(n => Boolean(n));

    if (notesWithOctave.length === numNotes) {
      return notesWithOctave;
    }

    // Fallback nel caso la definizione dell'accordo non sia registrata nel dizionario di Chord.degrees
    const notes = [...chord.notes];
    const offset = startDegree - 1;
    for (let i = 0; i < offset; i++) {
      notes.push(notes.shift()!);
    }
    return notes.map((note, index) => {
      const noteOctave = octave + Math.floor(index / numNotes);
      return `${note}${noteOctave}`;
    });
  }

  /**
   * Rimuove le note terminate per mantenere pulita la memoria.
   */
  private cleanupFinishedNotes(): void {
    this.currentNotes = this.currentNotes.filter(note => {
      if (!note || typeof note.stop !== 'function') {
        return false;
      }
      return true;
    });
    
    if (this.currentNotes.length > 100) {
      this.currentNotes = this.currentNotes.slice(-100);
    }
  }

  /**
   * Ferma immediatamente tutte le note in esecuzione.
   */
  stopAllNotes(): void {
    this.currentNotes.forEach(note => {
      if (note && typeof note.stop === 'function') {
        try {
          note.stop();
        } catch {
          // Ignora errori da note già fermate
        }
      }
    });
    this.currentNotes = [];
  }

  /**
   * Pulisce e rilascia le risorse audio caricate.
   */
  cleanup(): void {
    this.stopAllNotes();
    if (this.instrument) {
      this.instrument = null;
      this.isInstrumentReady = false;
      this.instrumentReadyPromise = null;
    }
    if (this.drumMachine) {
      this.drumMachine = null;
      this.isDrumMachineReady = false;
      this.drumMachineReadyPromise = null;
    }
  }
}
