import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoadingComponent } from './components/loading/loading.component';
import { ToastContainerComponent } from './components/toast/toast.component';
import { UserSettingsService } from './services/user-settings.service';
import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';
import { ConfirmService } from './services/confirm.service';

@Component({
  standalone: true,
  selector: 'app-root',
  imports: [RouterOutlet, LoadingComponent, ToastContainerComponent, ConfirmDialogComponent],
  template: `
    <app-loading />
    <app-toast-container />
    <app-confirm-dialog
      [isOpen]="confirmService.isOpen()"
      [title]="confirmService.title()"
      [message]="confirmService.message()"
      (confirm)="confirmService.confirm()"
      (cancel)="confirmService.cancel()"
    />
    <router-outlet />
  `,
  styleUrl: './app.css'
})
export class App {

  confirmService = inject(ConfirmService);
  userSettingsService = inject(UserSettingsService); // Initialize user settings

}