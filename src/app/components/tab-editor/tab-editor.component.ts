import { Component, ChangeDetectionStrategy, input, output, signal, OnInit, AfterViewInit, ViewChild, ElementRef, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucidePencil, LucideTrash2, LucideCheck } from '@lucide/angular';
import { TabItem } from '../../models/session.model';
import { VexTab, Artist } from 'vextab';
import { Renderer } from 'vexflow';

@Component({
  selector: 'app-tab-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, LucidePencil, LucideTrash2, LucideCheck],
  templateUrl: './tab-editor.component.html',
  styles: [`
    :host {
      display: block;
    }
    
    .textarea {
      line-height: 1.5;
    }
  `]
})
export class TabEditorComponent implements OnInit, AfterViewInit {
  tabItem = input.required<TabItem>();
  update = output<Partial<TabItem>>();
  delete = output<void>();

  @ViewChild('tabContainer') tabContainer?: ElementRef<HTMLDivElement>;

  editMode = signal(false);
  editNotation = '';
  editTitle = '';
  errorMessage = signal('');
  hasRendered = signal(false);

  constructor() {
    // Re-render when notation changes and not in edit mode
    effect(() => {
      const item = this.tabItem();
      if (!this.editMode() && item.notation && this.tabContainer) {
        this.renderTab();
      }
    });
  }

  ngOnInit() {
    const item = this.tabItem();
    if (!item.notation) {
      // If no notation yet, open edit mode immediately
      this.editMode.set(true);
      this.editNotation = 'tabstave notation=true key=C time=4/4\nnotes :q =|: (5/2.5/3.7/4) :8 7-5/3 5h6-7/5 ^3^ :q 7V/4';
      this.editTitle = item.title || '';
    } else {
      this.hasRendered.set(true);
    }
  }

  ngAfterViewInit() {
    // Render after view init if we have notation
    if (this.tabItem().notation && !this.editMode()) {
      this.renderTab();
    }
  }

  toggleEditMode() {
    const currentEditMode = this.editMode();
    if (!currentEditMode) {
      // Entering edit mode
      this.editNotation = this.tabItem().notation;
      this.editTitle = this.tabItem().title || '';
      this.errorMessage.set('');
    }
    this.editMode.set(!currentEditMode);
  }

  cancelEdit() {
    this.editMode.set(false);
    this.errorMessage.set('');
  }

  applyChanges() {
    if (!this.editNotation.trim()) {
      this.errorMessage.set('La notazione non può essere vuota');
      return;
    }

    // Try to validate by attempting to render
    try {
      const testDiv = document.createElement('div');
      testDiv.style.visibility = 'hidden';
      document.body.appendChild(testDiv);
      
      const renderer = new Renderer(testDiv, Renderer.Backends.SVG);
      const artist = new Artist(10, 10, 600, { scale: 1.0 });
      const tab = new VexTab(artist);
      tab.parse(this.editNotation);
      artist.render(renderer);
      
      document.body.removeChild(testDiv);
      
      // If we get here, the notation is valid
      this.errorMessage.set('');
      this.editMode.set(false);
      this.hasRendered.set(true);
      
      this.update.emit({
        notation: this.editNotation,
        title: this.editTitle.trim() || undefined
      });
      
      // Render the tab after a short delay to ensure DOM updates
      setTimeout(() => this.renderTab(), 50);
    } catch (error) {
      this.errorMessage.set(`Errore di sintassi: ${error instanceof Error ? error.message : 'Notazione non valida'}`);
    }
  }

  onDelete() {
    this.delete.emit();
  }

  private renderTab() {
    if (!this.tabContainer?.nativeElement) return;
    
    const container = this.tabContainer.nativeElement;
    const notation = this.tabItem().notation;
    
    if (!notation) return;

    try {
      // Clear previous content
      container.innerHTML = '';
      
      // Get container width for responsive rendering
      const containerWidth = container.clientWidth || 600;
      
      // Create renderer
      const renderer = new Renderer(container, Renderer.Backends.SVG);
      
      // Parse and render
      const artist = new Artist(10, 10, containerWidth, { scale: 1.0 });
      const tab = new VexTab(artist);
      tab.parse(notation);
      artist.render(renderer);
      
      this.errorMessage.set('');
      this.hasRendered.set(true);
    } catch (error) {
      console.error('Error rendering tab:', error);
      this.errorMessage.set(`Errore nel rendering: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    }
  }
}
