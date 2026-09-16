import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideCircleUser, LucideMoon, LucideMusic2, LucideSun } from '@lucide/angular';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LucideCircleUser, LucideMoon, LucideMusic2, LucideSun],
  template: `
    <header class="sticky top-0 z-50 border-b border-base-300 bg-base-100/95 shadow-sm backdrop-blur-sm">
      <div class="mx-auto flex max-w-6xl min-w-0 items-center gap-2 px-4 py-3">
        <div class="flex min-w-0 items-center gap-3">
          <a routerLink="/sessions" class="flex shrink-0 items-center gap-2 font-bold leading-tight" aria-label="My Guitar Studies">
            <svg lucideMusic2 class="h-5 w-5 text-primary"></svg>
            <span class="hidden sm:inline">My Guitar Studies</span>
            <span class="sm:hidden">MGS</span>
          </a>
        </div>

        <div class="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-2 self-center">
          <ng-content />
        </div>

        <div class="flex shrink-0 items-center justify-end gap-1">
          <button type="button" class="btn btn-ghost btn-sm btn-square" (click)="themeService.toggleTheme()" aria-label="Cambia tema" title="Cambia tema">
            @if (themeService.theme() === 'dark') {
              <svg lucideSun class="h-4 w-4"></svg>
            } @else {
              <svg lucideMoon class="h-4 w-4"></svg>
            }
          </button>
          <div class="dropdown dropdown-end">
            <button type="button" class="btn btn-ghost btn-sm btn-square" (click)="toggleMenu()" aria-label="Menu utente" title="Menu utente">
              <svg lucideCircleUser class="h-5 w-5"></svg>
            </button>
            @if (menuOpen()) {
              <ul class="menu menu-sm dropdown-content z-50 mt-2 w-52 gap-1 rounded-box bg-base-100 p-2 shadow-lg">
                <li class="menu-title px-2 py-1"><span class="text-xs opacity-60">{{ userEmail() }}</span></li>
                <li><a routerLink="/sessions" (click)="closeMenu()">Sessioni</a></li>
                <li><a routerLink="/study-plans" (click)="closeMenu()">Piani di studio</a></li>
                <li><a routerLink="/settings" (click)="closeMenu()">Impostazioni</a></li>
                <li><button type="button" (click)="onLogout()">Esci</button></li>
              </ul>
            }
          </div>
        </div>
      </div>
    </header>
  `,
  styles: `
    /* display: contents removes the host box so the inner <header> containing
       block is the page wrapper (full scroll height), not this host element
       (which would otherwise be exactly header-height tall and break sticky). */
    :host { display: contents; }
  `
})
export class PageHeaderComponent {
  private authService = inject(AuthService);
  public themeService = inject(ThemeService);

  menuOpen = signal(false);
  userEmail = computed(() => this.authService.currentUser()?.email || 'User');

  toggleMenu(): void {
    this.menuOpen.update(open => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  async onLogout(): Promise<void> {
    this.closeMenu();
    await this.authService.signOut();
  }
}
