import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { FRETBOARD_STYLES } from '../../scale-visualization/constants';
import { UserSettingsService } from '../../../services/user-settings.service';
import { AudioService } from '../../../services/audio.service';

// Available instruments from smplr Soundfont library
export const AVAILABLE_INSTRUMENTS = [
  { value: 'bright_acoustic_piano', label: 'Bright Acoustic Piano' },
  { value: 'drawbar_organ', label: 'Drawbar Organ' },
  { value: 'electric_piano_1', label: 'Electric Piano 1' },
  { value: 'electric_grand_piano', label: 'Electric Grand Piano' },
  { value: 'electric_guitar_jazz', label: 'Electric Jazz Guitar' },
  { value: 'lead_1_square', label: 'Lead 1 (Square)' },
  { value: 'lead_3_calliope', label: 'Lead 3 (Calliope)' },
  { value: 'lead_4_chiff', label: 'Lead 4 (Chiff)' },
  { value: 'pad_2_warm', label: 'Pad 2 (Warm)' },
  { value: 'pad_3_polysynth', label: 'Pad 3 (Polysynth)' },
  { value: 'pad_5_bowed', label: 'Pad 5 (Bowed)' },
  { value: 'pad_7_halo', label: 'Pad 7 (Halo)' },
  { value: 'pad_8_sweep', label: 'Pad 8 (Sweep)' },
  { value: 'piccolo', label: 'Piccolo' },
  { value: 'reed_organ', label: 'Reed Organ' },
  { value: 'rock_organ', label: 'Rock Organ' },
  { value: 'string_ensemble_1', label: 'String Ensemble 1' },
  { value: 'string_ensemble_2', label: 'String Ensemble 2' },
  { value: 'synth_brass_1', label: 'Synth Brass 1' },
  { value: 'synth_brass_2', label: 'Synth Brass 2' },
  { value: 'synth_choir', label: 'Synth Choir' },
  { value: 'synth_strings_1', label: 'Synth Strings 1' },
  { value: 'synth_strings_2', label: 'Synth Strings 2' }
];

export interface DisplayTimelineConfigDialogData {
  colorMode: 'monocolor' | 'triads' | 'all' | 'octaves';
  fretboardColor: string;
}

export interface DisplayTimelineConfigDialogResult {
  colorMode: 'monocolor' | 'triads' | 'all' | 'octaves';
  fretboardColor: string;
  audioSettings?: {
    instrument: string;
    volume: number;
    reverb: number;
    detune: number;
    sustain: boolean;
    playMetronome: boolean;
  };
}

@Component({
  selector: 'app-display-timeline-config-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
      templateUrl: './display-timeline-config-dialog.component.html',
  styles: `
    :host {
      display: block;
    }
  `
})
export class DisplayTimelineConfigDialogComponent implements OnInit {
  dialogRef = inject<DialogRef<DisplayTimelineConfigDialogResult>>(DialogRef);
  data = inject<DisplayTimelineConfigDialogData>(DIALOG_DATA);
  userSettingsService = inject(UserSettingsService);
  audioService = inject(AudioService);

  fretboardStyles = FRETBOARD_STYLES;
  instruments = AVAILABLE_INSTRUMENTS;

  colorMode = signal(this.data.colorMode);
  fretboardColor = signal(this.data.fretboardColor);
  
  // Audio settings from UserSettings
  settings = this.userSettingsService.settings;
  
  // Store initial values to detect changes that require instrument reload
  private initialInstrument!: string;
  private initialSustain!: boolean;
  
  // Initialize signals with default values (will be updated in ngOnInit)
  instrument = signal('electric_piano_1');
  volume = signal(0.7);
  reverb = signal(0.3);
  detune = signal(0);
  sustain = signal(true);
  playMetronome = signal(true);

  ngOnInit() {
    // Read current settings when modal opens
    const currentSettings = this.settings();
    
    this.initialInstrument = currentSettings?.audioInstrument ?? 'electric_piano_1';
    this.initialSustain = currentSettings?.audioSustain ?? true;
    
    // Update signals with current values
    this.instrument.set(this.initialInstrument);
    this.volume.set(currentSettings?.audioVolume ?? 0.7);
    this.reverb.set(currentSettings?.audioReverb ?? 0.3);
    this.detune.set(currentSettings?.audioDetune ?? 0);
    this.sustain.set(this.initialSustain);
    this.playMetronome.set(currentSettings?.playMetronome ?? true);
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    
    // Check if changes require instrument reload
    const instrumentChanged = this.instrument() !== this.initialInstrument;
    const sustainChanged = this.sustain() !== this.initialSustain;
    const needsReload = instrumentChanged || sustainChanged;
    
    // Save audio settings to UserSettings
    await this.userSettingsService.updateSettings({
      audioInstrument: this.instrument(),
      audioVolume: this.volume(),
      audioReverb: this.reverb(),
      audioDetune: this.detune(),
      audioSustain: this.sustain(),
      playMetronome: this.playMetronome()
    });
    
    // Reload instrument if instrument or sustain changed (both affect Soundfont initialization)
    if (needsReload) {
      await this.audioService.reloadInstrument();
    } else {
      // Update runtime settings without reload
      this.audioService.updateReverbMix(this.reverb());
      this.audioService.updateVolume(this.volume());
    }
    
    const result: DisplayTimelineConfigDialogResult = {
      colorMode: this.colorMode(),
      fretboardColor: this.fretboardColor(),
      audioSettings: {
        instrument: this.instrument(),
        volume: this.volume(),
        reverb: this.reverb(),
        detune: this.detune(),
        sustain: this.sustain(),
        playMetronome: this.playMetronome()
      }
    };

    this.dialogRef.close(result);
  }
}
