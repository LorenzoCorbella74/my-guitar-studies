import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MetronomeService {
  private audioContext: AudioContext | null = null;
  private clickGain: GainNode | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      this.audioContext = new AudioContext();
      this.clickGain = this.audioContext.createGain();
      this.clickGain.connect(this.audioContext.destination);
      this.clickGain.gain.value = 0.3; // Volume del click
    }
  }

  /**
   * Emette un suono di click (beat)
   * @param isAccent - Se true, suono più acuto per l'accento (primo beat)
   */
  playClick(isAccent: boolean = false): void {
    if (!this.audioContext || !this.clickGain) return;

    const oscillator = this.audioContext.createOscillator();
    const envelope = this.audioContext.createGain();

    oscillator.connect(envelope);
    envelope.connect(this.clickGain);

    // Frequenza: più alta per l'accento, più bassa per gli altri beat
    oscillator.frequency.value = isAccent ? 1200 : 800;
    
    // Envelope: attacco rapido, decadimento veloce
    const now = this.audioContext.currentTime;
    envelope.gain.setValueAtTime(0.5, now);
    envelope.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    oscillator.start(now);
    oscillator.stop(now + 0.05);
  }

  /**
   * Imposta il volume del metronomo (0-1)
   */
  setVolume(volume: number): void {
    if (!this.clickGain) return;
    this.clickGain.gain.value = Math.max(0, Math.min(1, volume));
  }

  /**
   * Resume AudioContext se in stato suspended (richiesto da alcuni browser)
   */
  async resumeAudioContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }
}
