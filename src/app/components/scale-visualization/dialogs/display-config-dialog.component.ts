import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { FRETBOARD_STYLES } from '../constants';

export interface DisplayConfigDialogData {
  noteOpacity: number;
  labelMode: 'note' | 'degree' | 'none';
  colorMode: 'monocolor' | 'triads' | 'all' | 'octaves';
  startFret: number;
  endFret: number;
  fretboardColor: string;
}

export interface DisplayConfigDialogResult {
  noteOpacity: number;
  labelMode: 'note' | 'degree' | 'none';
  colorMode: 'monocolor' | 'triads' | 'all' | 'octaves';
  startFret: number;
  endFret: number;
  fretboardColor: string;
}

@Component({
  selector: 'app-display-config-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './display-config-dialog.component.html',
  styles: `
    :host {
      display: block;
    }
  `
})
export class DisplayConfigDialogComponent {
  dialogRef = inject<DialogRef<DisplayConfigDialogResult>>(DialogRef);
  data = inject<DisplayConfigDialogData>(DIALOG_DATA);

  fretboardStyles = FRETBOARD_STYLES;

  opacity = signal(this.data.noteOpacity);
  labelMode = signal(this.data.labelMode);
  colorMode = signal(this.data.colorMode);
  startFret = signal(this.data.startFret);
  endFret = signal(this.data.endFret);
  fretboardColor = signal(this.data.fretboardColor);

  onSubmit(event: Event): void {
    event.preventDefault();
    
    const result: DisplayConfigDialogResult = {
      noteOpacity: this.opacity(),
      labelMode: this.labelMode(),
      colorMode: this.colorMode(),
      startFret: this.startFret(),
      endFret: this.endFret(),
      fretboardColor: this.fretboardColor()
    };

    this.dialogRef.close(result);
  }
}
