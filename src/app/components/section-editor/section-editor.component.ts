import { Component, ChangeDetectionStrategy, input, output, effect, signal, OnDestroy } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { SectionItem } from '../../models/session.model';
import { LucideTrash2, LucideSave, LucidePencil } from '@lucide/angular';
import { Editor, NgxEditorModule, Toolbar } from 'ngx-editor';

@Component({
  selector: 'app-section-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ReactiveFormsModule, LucideTrash2, LucideSave, LucidePencil, NgxEditorModule],
  template: `
    <div class="card bg-base-100 shadow-md">
      <div class="card-body">
        <div class="flex justify-between items-start gap-4 mb-4">
          @if (editMode()) {
            <input
              type="text"
              class="input input-bordered flex-1"
              [(ngModel)]="localTitle"
              placeholder="Titolo sezione"
            />
          } @else {
            <h3 class="card-title flex-1">{{ section().title || 'Sezione senza titolo' }}</h3>
          }
          
          <div class="flex gap-2">
            @if (editMode()) {
              <button
                class="btn btn-sm btn-primary"
                (click)="saveSection()"
                aria-label="Salva sezione"
              >
                <svg lucideSave class="w-4 h-4"></svg>
              </button>
            } @else {
              <button
                class="btn btn-sm btn-ghost"
                (click)="startEdit()"
                aria-label="Modifica sezione"
              >
                <svg lucidePencil class="w-4 h-4"></svg>
              </button>
            }
            <button
              class="btn btn-sm btn-ghost"
              (click)="deleteSection()"
              aria-label="Elimina sezione"
            >
              <svg lucideTrash2 class="w-4 h-4"></svg>
            </button>
          </div>
        </div>

        @if (editMode()) {
          <div class="border border-base-300 rounded-lg overflow-hidden">
            @if (editor()) {
              <div class="NgxEditor__Wrapper">
                <ngx-editor-menu [editor]="editor()!" [toolbar]="toolbar"></ngx-editor-menu>
                <ngx-editor
                  [editor]="editor()!"
                  [formControl]="contentControl"
                  [placeholder]="'Scrivi il contenuto della sezione...'"
                ></ngx-editor>
              </div>
            }
          </div>
        } @else {
          <div class="prose max-w-none" [innerHTML]="section().content || 'Nessun contenuto'"></div>
        }
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    
    .NgxEditor__Wrapper {
      border: none;
    }
    
    ::ng-deep .NgxEditor {
      background: transparent;
    }
    
    ::ng-deep .NgxEditor__Content {
      min-height: 200px;
      padding: 1rem;
    }
    
    ::ng-deep .NgxEditor__MenuBar {
      background: hsl(var(--b2));
      border-bottom: 1px solid hsl(var(--bc) / 0.1);
      padding: 0.5rem;
    }
  `
})
export class SectionEditorComponent implements OnDestroy {
  section = input.required<SectionItem>();
  
  save = output<{ title: string; content: string }>();
  delete = output<void>();
  edit = output<void>();
  
  editMode = input(false);
  
  localTitle = '';
  editor = signal<Editor | null>(null);
  contentControl = new FormControl('');
  
  toolbar: Toolbar = [
    ['bold', 'italic', 'underline', 'strike'],
    ['ordered_list', 'bullet_list'],
    ['link'],
    ['text_color', 'background_color'],
    ['align_left', 'align_center', 'align_right', 'align_justify'],
  ];
  
  constructor() {
    // Inizializza/distruggi editor quando editMode cambia
    effect(() => {
      const isEditing = this.editMode();
      
      // Usa setTimeout per evitare loop infiniti
      setTimeout(() => {
        if (isEditing) {
          this.initEditor();
        } else {
          this.destroyEditor();
        }
      }, 0);
    }, { allowSignalWrites: true });
  }
  
  private initEditor() {
    // Distruggi editor esistente prima di crearne uno nuovo
    this.destroyEditor();
    
    const newEditor = new Editor();
    this.editor.set(newEditor);
    this.localTitle = this.section().title;
    this.contentControl.setValue(this.section().content);
  }
  
  private destroyEditor() {
    const currentEditor = this.editor();
    if (currentEditor) {
      currentEditor.destroy();
      this.editor.set(null);
    }
  }
  
  startEdit() {
    this.edit.emit();
  }
  
  saveSection() {
    this.save.emit({ 
      title: this.localTitle, 
      content: this.contentControl.value || '' 
    });
  }
  
  deleteSection() {
    this.delete.emit();
  }
  
  ngOnDestroy() {
    this.destroyEditor();
  }
}
