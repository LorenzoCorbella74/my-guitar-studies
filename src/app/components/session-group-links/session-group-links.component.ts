import { Component, ChangeDetectionStrategy, input, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LucideFolderOpen } from '@lucide/angular';

@Component({
  selector: 'app-session-group-links',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideFolderOpen],
  templateUrl: './session-group-links.component.html',
  styles: `
    :host {
      display: block;
    }
  `
})
export class SessionGroupLinksComponent {
  private router = inject(Router);

  // Input signals
  groupId = input.required<string>();
  groupName = input.required<string>();
  currentSessionId = input.required<string>();
  groupSessions = input.required<{ id: string; title: string }[]>();

  // State
  isHovered = signal(false);

  // Computed: filtra la sessione corrente
  otherSessions = computed(() => {
    const currentId = this.currentSessionId();
    return this.groupSessions().filter(s => s.id !== currentId);
  });

  // Mostra il componente solo se ci sono altre sessioni nel gruppo
  shouldShow = computed(() => this.otherSessions().length > 0);

  navigateToSession(sessionId: string) {
    this.router.navigate(['/sessions', sessionId]);
  }
}
