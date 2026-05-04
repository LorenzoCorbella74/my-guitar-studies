import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoadingComponent } from './components/loading/loading.component';
import { ToastContainerComponent } from './components/toast/toast.component';
import { LoginPage } from "./pages/login/login";
import { AuthService } from './services/auth.service';
import { UserSettingsService } from './services/user-settings.service';
import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';
import { ConfirmService } from './services/confirm.service';

@Component({
  standalone: true,
  selector: 'app-root',
  imports: [RouterOutlet, LoadingComponent, ToastContainerComponent, LoginPage, ConfirmDialogComponent],
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
    @if(this.authService.isAuthenticated()){
      <router-outlet />
    } @else {
      <app-login/>
    }
  `,
  styleUrl: './app.css'
})
export class App {

  authService = inject(AuthService);
  confirmService = inject(ConfirmService);
  userSettingsService = inject(UserSettingsService); // Initialize user settings

}