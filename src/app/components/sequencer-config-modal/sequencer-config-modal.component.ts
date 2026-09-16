import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { FRETBOARD_STYLES } from '../scale-visualization/constants';
import { UserSettingsService } from '../../services/user-settings.service';
import { AudioService } from '../../services/audio.service';
import { AVAILABLE_SOUNDFONT_INSTRUMENTS } from '../../data/soundfont-instruments';
import { AVAILABLE_DRUM_KITS, DRUM_GENRES, DrumGenre } from '../../data/drum-patterns';
import { SequencerConfig } from '../../models/session.model';

export interface SequencerConfigDialogData {
  title?: string;
  showFretboardSettings?: boolean;
  colorMode?: 'monocolor' | 'triads' | 'all' | 'octaves';
  fretboardColor?: string;
  sequencerConfig?: SequencerConfig;
}

export interface SequencerConfigDialogResult {
  colorMode?: 'monocolor' | 'triads' | 'all' | 'octaves';
  fretboardColor?: string;
  sequencerConfig: SequencerConfig;
}

@Component({
  selector: 'app-sequencer-config-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './sequencer-config-modal.component.html',
  styles: `
    :host {
      display: block;
    }
  `
})
export class SequencerConfigModalComponent implements OnInit {
  dialogRef = inject<DialogRef<SequencerConfigDialogResult>>(DialogRef);
  data = inject<SequencerConfigDialogData>(DIALOG_DATA);
  userSettingsService = inject(UserSettingsService);
  audioService = inject(AudioService);

  fretboardStyles = FRETBOARD_STYLES;
  instruments = AVAILABLE_SOUNDFONT_INSTRUMENTS;
  drumGenres = DRUM_GENRES;
  drumKits = AVAILABLE_DRUM_KITS;

  // Visual settings (if enabled)
  showFretboardSettings = signal(this.data.showFretboardSettings ?? false);
  colorMode = signal(this.data.colorMode ?? 'all');
  fretboardColor = signal(this.data.fretboardColor ?? '#fff');

  // Harmonic instrument settings
  instrument = signal('electric_piano_1');
  instrumentVolume = signal(0.7);
  reverb = signal(0.3);
  detune = signal(0);
  sustain = signal(true);

  // Drum & Metronome settings
  drumGenre = signal<DrumGenre>('pop');
  drumKit = signal('TR-808');
  drumVolume = signal(0.7);
  playMetronome = signal(true);

  // Option to also persist to global user settings
  saveAsDefault = signal(false);

  // Selected genre description helper
  selectedGenreDescription = () => {
    const genre = this.drumGenres.find(g => g.value === this.drumGenre());
    return genre ? genre.description : '';
  };

  ngOnInit() {
    const globalSettings = this.userSettingsService.settings();
    const itemConfig = this.data.sequencerConfig;

    // Resolve initial values: item configuration overrides global user settings defaults
    this.instrument.set(itemConfig?.instrument || globalSettings?.audioInstrument || 'electric_piano_1');
    this.instrumentVolume.set(itemConfig?.instrumentVolume ?? (globalSettings?.audioVolume ?? 0.7));
    this.reverb.set(itemConfig?.reverb ?? (globalSettings?.audioReverb ?? 0.3));
    this.detune.set(globalSettings?.audioDetune ?? 0);
    this.sustain.set(globalSettings?.audioSustain ?? true);

    this.drumGenre.set(itemConfig?.drumGenre || globalSettings?.audioDrumGenre || 'pop');
    this.drumKit.set(itemConfig?.drumKit || globalSettings?.audioDrumKit || 'TR-808');
    this.drumVolume.set(itemConfig?.drumVolume ?? (globalSettings?.audioDrumVolume ?? 0.7));
    this.playMetronome.set(itemConfig?.playMetronome ?? (globalSettings?.playMetronome ?? true));

    // Preload drum kit in background
    this.audioService.loadDrumMachine(this.drumKit()).catch(() => {});
  }

  async onDrumKitChange(kit: string) {
    this.drumKit.set(kit);
    await this.audioService.loadDrumMachine(kit);
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();

    const sequencerConfig: SequencerConfig = {
      instrument: this.instrument(),
      instrumentVolume: this.instrumentVolume(),
      reverb: this.reverb(),
      drumGenre: this.drumGenre(),
      drumKit: this.drumKit(),
      drumVolume: this.drumVolume(),
      playMetronome: this.playMetronome()
    };

    // If user asked to save as default, update Firestore UserSettings
    if (this.saveAsDefault()) {
      await this.userSettingsService.updateSettings({
        audioInstrument: this.instrument(),
        audioVolume: this.instrumentVolume(),
        audioReverb: this.reverb(),
        audioDetune: this.detune(),
        audioSustain: this.sustain(),
        audioDrumGenre: this.drumGenre(),
        audioDrumKit: this.drumKit(),
        audioDrumVolume: this.drumVolume(),
        playMetronome: this.playMetronome()
      });
    }

    // Apply audio service updates
    await this.audioService.loadInstrument(this.instrument(), this.sustain());
    await this.audioService.loadDrumMachine(this.drumKit());
    this.audioService.updateReverbMix(this.reverb());
    this.audioService.updateVolume(this.instrumentVolume());

    const result: SequencerConfigDialogResult = {
      colorMode: this.showFretboardSettings() ? this.colorMode() : undefined,
      fretboardColor: this.showFretboardSettings() ? this.fretboardColor() : undefined,
      sequencerConfig
    };

    this.dialogRef.close(result);
  }
}
