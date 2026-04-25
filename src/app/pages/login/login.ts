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
  template: `
    <div class="min-h-screen bg-base-200 flex items-center justify-center p-4">
      
      <div class="card bg-base-100 shadow-xl w-full max-w-md">
        <div class="card-body">
          <h2 class="card-title text-primary text-2xl justify-center mb-4">Accedi</h2>
          
          @if (errorMessage()) {
            <div class="alert alert-error mb-4">
              <svg lucide-alert-circle class="w-5 h-5"></svg>
              <span>{{ errorMessage() }}</span>
            </div>
          }

          <form (ngSubmit)="onSignIn()" class="space-y-4">
            <fieldset class="fieldset">
              <label class="fieldset-label">Email</label>
              <input
                type="email"
                class="input input-bordered w-full"
                [(ngModel)]="email"
                name="email"
                required
                placeholder="email@example.com"
              />
            </fieldset>

            <fieldset class="fieldset">
              <label class="fieldset-label">Password</label>
              <input
                type="password"
                class="input input-bordered w-full"
                [(ngModel)]="password"
                name="password"
                required
                placeholder="password"
              />
            </fieldset>

            <button type="submit" class="btn btn-primary w-full" [disabled]="loading()">
              {{ loading() ? 'Accesso in corso...' : 'Accedi' }}
            </button>
          </form>

          <div class="divider">oppure</div>

          <button type="button" class="btn btn-outline w-full" (click)="onSignUp()" [disabled]="loading()">
            Registrati
          </button>

          <button type="button" class="btn btn-link w-full mt-2" (click)="onResetPassword()" [disabled]="loading()">
            Password dimenticata?
          </button>

          @if (resetSent()) {
            <div class="alert alert-success mt-2">
              <svg lucide-check-circle class="w-5 h-5"></svg>
              <span>Controlla la tua email per le istruzioni di reset.</span>
            </div>
          }
        </div>
      </div>
    </div>
  `
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