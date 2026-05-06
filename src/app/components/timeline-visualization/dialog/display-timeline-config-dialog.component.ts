import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { FRETBOARD_STYLES } from '../../scale-visualization/constants';

export interface DisplayTimelineConfigDialogData {
  colorMode: 'monocolor' | 'triads' | 'all' | 'octaves';
  fretboardColor: string;
}

export interface DisplayTimelineConfigDialogResult {
  colorMode: 'monocolor' | 'triads' | 'all' | 'octaves';
  fretboardColor: string;
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

  fretboardStyles = FRETBOARD_STYLES;

  colorMode = signal(this.data.colorMode);
  fretboardColor = signal(this.data.fretboardColor);

  onSubmit(event: Event): void {
    event.preventDefault();
    
    const result: DisplayTimelineConfigDialogResult = {
      colorMode: this.colorMode(),
      fretboardColor: this.fretboardColor()
    };

    this.dialogRef.close(result);
  }
}
