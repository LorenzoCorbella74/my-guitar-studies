import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'settings-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './settings.component.html',
  styles: `
    :host {
      display: block;
    }
  `,
})
export class SettingsPage { }