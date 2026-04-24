import { Component } from '@angular/core';
import { LucideAngularModule, FileIcon } from 'lucide-angular';

@Component({
  standalone: true,
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
  imports: [LucideAngularModule]
})
export class App {
  readonly FileIcon = FileIcon;
}