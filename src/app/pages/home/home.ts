import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SessionService } from '../../services/session.service';

@Component({
  selector: 'home-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
  templateUrl: './home.component.html'
})
export class HomePage implements OnInit {
  private sessionService = inject(SessionService);


  async ngOnInit() {
    await this.sessionService.loadSessions();
  }

}