import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SessionService } from '../../services/session.service';
import { ThemeService } from '../../services/theme.service';
import { LucideSun, LucideMoon, LucideCircleUser } from "@lucide/angular";
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'home-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterOutlet, LucideSun, LucideMoon, LucideCircleUser],
  templateUrl: './home.component.html'
})
export class HomePage implements OnInit {
  private authService = inject(AuthService);
  private sessionService = inject(SessionService);
  public themeService = inject(ThemeService);

  menuOpen = signal(false);

  userEmail = computed(() => this.authService.currentUser()?.email || 'User');


  async ngOnInit() {
    await this.sessionService.loadSessions();
  }

  toggleMenu() { this.menuOpen.update(v => !v); }
  closeMenu() { this.menuOpen.set(false); }

  async onLogout() {
    await this.authService.signOut();
  }
}