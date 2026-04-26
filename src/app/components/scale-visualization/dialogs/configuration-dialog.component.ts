import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { ScaleType, ChordType } from 'tonal';
import { STANDARD_TUNINGS, NOTES } from '../constants';

export interface ConfigurationDialogData {
  itemType: 'scale' | 'arpeggio' | 'chord';
  currentConfig?: {
    tuning?: string[];
    root?: string;
    scaleName?: string;
    chordType?: string;
  };
}

export interface ConfigurationDialogResult {
  tuning: string[];
  root: string;
  scaleName?: string;
  chordType?: string;
}

@Component({
  selector: 'app-configuration-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './configuration-dialog.component.html',
  styles: `
    :host {
      display: block;
    }
  `
})
export class ConfigurationDialogComponent {
  dialogRef = inject<DialogRef<ConfigurationDialogResult>>(DialogRef);
  data = inject<ConfigurationDialogData>(DIALOG_DATA);

  tuningNames = Object.keys(STANDARD_TUNINGS);
  notes = NOTES;
  scaleNames = ScaleType.names();
  chordTypes = ChordType.names();

  tuningName = signal(this.getTuningName() || 'Standard (E)');
  root = signal(this.data.currentConfig?.root || 'C');
  scaleName = signal(this.data.currentConfig?.scaleName || 'major');
  chordType = signal(this.data.currentConfig?.chordType || 'maj7');

  private getTuningName(): string | null {
    if (!this.data.currentConfig?.tuning) return null;
    
    const tuningStr = this.data.currentConfig.tuning.join(',');
    for (const [name, tuning] of Object.entries(STANDARD_TUNINGS)) {
      if (tuning.join(',') === tuningStr) {
        return name;
      }
    }
    return null;
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    
    const tuning = STANDARD_TUNINGS[this.tuningName() as keyof typeof STANDARD_TUNINGS];
    
    const result: ConfigurationDialogResult = {
      tuning,
      root: this.root()
    };

    if (this.data.itemType === 'scale') {
      result.scaleName = this.scaleName();
    } else {
      result.chordType = this.chordType();
    }

    this.dialogRef.close(result);
  }
}
