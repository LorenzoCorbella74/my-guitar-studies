import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { FRETBOARD_STYLES } from '../../scale-visualization/constants';
import { UserSettingsService } from '../../../services/user-settings.service';

export interface DisplayTimelineConfigDialogData {
  colorMode: 'monocolor' | 'triads' | 'all' | 'octaves';
  fretboardColor: string;
}

export interface DisplayTimelineConfigDialogResult {
  colorMode: 'monocolor' | 'triads' | 'all' | 'octaves';
  fretboardColor: string;
  audioSettings?: {
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
export class DisplayTimelineConfigDialogComponent {
  dialogRef = inject<DialogRef<DisplayTimelineConfigDialogResult>>(DialogRef);
  data = inject<DisplayTimelineConfigDialogData>(DIALOG_DATA);
  userSettingsService = inject(UserSettingsService);

  fretboardStyles = FRETBOARD_STYLES;

  colorMode = signal(this.data.colorMode);
  fretboardColor = signal(this.data.fretboardColor);
  
  // Audio settings from UserSettings
  settings = this.userSettingsService.settings;
  
  volume = signal(this.settings()?.audioVolume ?? 0.7);
  reverb = signal(this.settings()?.audioReverb ?? 0.3);
  detune = signal(this.settings()?.audioDetune ?? 0);
  sustain = signal(this.settings()?.audioSustain ?? true);
  playMetronome = signal(this.settings()?.playMetronome ?? true);

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    
    // Save audio settings to UserSettings
    await this.userSettingsService.updateSettings({
      audioVolume: this.volume(),
      audioReverb: this.reverb(),
      audioDetune: this.detune(),
      audioSustain: this.sustain(),
      playMetronome: this.playMetronome()
    });
    
    const result: DisplayTimelineConfigDialogResult = {
      colorMode: this.colorMode(),
      fretboardColor: this.fretboardColor(),
      audioSettings: {
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
