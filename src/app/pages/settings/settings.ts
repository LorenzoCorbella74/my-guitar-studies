import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'settings-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="settings-page">
      <div class="settings-header">
        <a routerLink="/" class="back-link">← Torna alla home</a>
        <h1 class="settings-title">Impostazioni</h1>
      </div>
      
      <div class="settings-content">
        <p>Pagina delle impostazioni utente.</p>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .settings-page {
      background-color: #f2f0eb;
      min-height: 100vh;
      padding: var(--space-4, 2.4rem);
    }

    .settings-header {
      margin-bottom: var(--space-5, 2.4rem);
    }

    .back-link {
      font-family: "Inter", "Helvetica Neue", Helvetica, Arial, sans-serif;
      font-size: 1.4rem;
      color: #00754A;
      text-decoration: none;
      display: inline-block;
      margin-bottom: var(--space-3, 1.6rem);
    }

    .back-link:hover {
      text-decoration: underline;
    }

    .settings-title {
      font-family: "Inter", "Helvetica Neue", Helvetica, Arial, sans-serif;
      font-size: 2.4rem;
      font-weight: 600;
      color: #006241;
      letter-spacing: -0.16px;
    }

    .settings-content {
      font-family: "Inter", "Helvetica Neue", Helvetica, Arial, sans-serif;
      font-size: 1.6rem;
      color: rgba(0,0,0,0.87);
    }
  `,
})
export class SettingsPage {}