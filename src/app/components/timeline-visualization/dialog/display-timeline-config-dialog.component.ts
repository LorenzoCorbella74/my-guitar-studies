import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { FRETBOARD_STYLES } from '../../scale-visualization/constants';
import { UserSettingsService } from '../../../services/user-settings.service';
import { AudioService } from '../../../services/audio.service';
import { AVAILABLE_SOUNDFONT_INSTRUMENTS } from '../../../data/soundfont-instruments';

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
  instruments = AVAILABLE_SOUNDFONT_INSTRUMENTS;

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
