import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LoadingService } from '../../services/loading.service';
import { ThemeService } from '../../services/theme.service';
import { AppRoutes } from '../../enums/routes.enum';

@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './login.component.html'
})
export class LoginPage {
  private authService = inject(AuthService);
  protected loading = inject(LoadingService).loading;
  private router = inject(Router);
  protected themeService = inject(ThemeService);

  email = '';
  password = '';

  errorMessage = signal('');
  resetSent = signal(false);

  async onSignIn() {
    this.errorMessage.set('');
    this.resetSent.set(false);

    try {
      await this.authService.signIn(this.email, this.password);
      this.router.navigate([AppRoutes.Home]);
    } catch (error: unknown) {
      const authError = error as { code?: string; message?: string };
      if (authError.code === 'auth/invalid-credential') {
        this.errorMessage.set('Email o password non validi');
      } else {
        this.errorMessage.set(authError.message || "Errore durante l'accesso");
      }
    }
  }

  async onSignUp() {
    this.errorMessage.set('');
    this.resetSent.set(false);

    try {
      await this.authService.signUp(this.email, this.password);
      this.router.navigate([AppRoutes.Home]);
    } catch (error: unknown) {
      const authError = error as { code?: string; message?: string };
      if (authError.code === 'auth/email-already-in-use') {
        this.errorMessage.set('Esiste già un account con questa email');
      } else if (authError.code === 'auth/invalid-email') {
        this.errorMessage.set('Email non valida');
      } else if (authError.code === 'auth/weak-password') {
        this.errorMessage.set('La password deve essere di almeno 6 caratteri');
      } else {
        this.errorMessage.set(authError.message || 'Errore durante la registrazione');
      }
    }
  }

  async onResetPassword() {
    if (!this.email) {
      this.errorMessage.set('Inserisci la tua email per resettare la password');
      return;
    }
    this.errorMessage.set('');

    try {
      await this.authService.resetPassword(this.email);
      this.resetSent.set(true);
    } catch {
      this.errorMessage.set('Errore durante il reset della password');
    }
  }
}