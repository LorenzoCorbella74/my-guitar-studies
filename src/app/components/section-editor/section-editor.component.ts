import { Component, ChangeDetectionStrategy, input, output, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SectionItem } from '../../models/session.model';
import { LucideTrash2 } from '@lucide/angular';
import { QuillEditorComponent } from 'ngx-quill';
import type Quill from 'quill';

@Component({
  selector: 'app-section-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, LucideTrash2, QuillEditorComponent],
  template: `
    <div class="card bg-base-100 shadow-md">
      <div class="card-body">
        <div class="flex justify-between items-start gap-4">
          <h4
            class="card-title flex-1 font-bold"
            contenteditable="true"
            role="textbox"
            aria-label="Titolo sezione"
            [attr.data-placeholder]="localTitle ? null : 'Titolo sezione'"
            (input)="onTitleInput($event)"
            (keydown.enter)="$event.preventDefault()"
          >{{ localTitle }}</h4>

            <button
              class="btn btn-sm btn-ghost"
              (click)="deleteSection()"
              aria-label="Elimina sezione"
            >
              <svg lucideTrash2 class="w-4 h-4"></svg>
            </button>
          
        </div>

        <div class="section-editor-container">
          <quill-editor
            [(ngModel)]="content"
            [modules]="modules"
            theme="snow"
            format="html"
            [sanitize]="true"
            [placeholder]="'Scrivi il contenuto della sezione...'"
              (onEditorCreated)="onEditorCreated($event)"
            (onContentChanged)="onContentChanged($event)"
            aria-label="Contenuto della sezione"
          ></quill-editor>
        </div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }

    .section-editor-container {
      min-width: 0;
      max-width: 100%;
      width: 100%;
      margin-bottom:0.5rem
    }

    quill-editor {
      display: block;
      width: 100%;
    }
    
    ::ng-deep .ql-container {
      min-height: 200px;
      background: transparent;
    }

    ::ng-deep .ql-editor {
      min-height: 200px;
      color: inherit;
    }
  `
})
export class SectionEditorComponent implements OnInit {
  section = input.required<SectionItem>();

  save = output<{ title: string; content: string }>();
  delete = output<void>();
  edit = output<void>();

  localTitle = '';
  content = '';
  private quillEditor: Quill | null = null;

  modules = {
    toolbar: {
      container: [
        ['bold', 'italic', 'underline', 'strike'],
        [{ header: [1, 2, 3, false] }],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['blockquote'],
        ['link'],
/*         [{ color: [] }, { background: [] }], */
        [{ align: [] }]
      ],
      handlers: {
        link: (value: boolean) => this.handleLink(value)
      }
    }
  };

  ngOnInit() {
    this.localTitle = this.section().title;
    this.content = this.section().content || '';
  }

  onContentChanged(event: { html: string | null }) {
    this.content = event.html || '';
    this.save.emit({ title: this.localTitle, content: this.normalizeLinks(this.content) });
  }

  onTitleInput(event: Event) {
    this.localTitle = (event.target as HTMLElement).textContent?.trim() || '';
    this.save.emit({ title: this.localTitle, content: this.normalizeLinks(this.content) });
  }

  private handleLink(value: boolean) {
    const editor = this.getQuillEditor();
    if (!editor) return;

    if (!value) {
      editor.format('link', false);
      return;
    }

    const range = editor.getSelection();
    if (!range) return;

    const currentLink = editor.getFormat(range)['link'];
    const input = window.prompt('Inserisci URL', typeof currentLink === 'string' ? currentLink : '');
    if (input === null) return;

    const url = this.normalizeUrl(input);
    if (url) {
      editor.format('link', url);
    } else {
      editor.format('link', false);
    }
  }

  onEditorCreated(editor: Quill) {
    this.quillEditor = editor;
  }

  private getQuillEditor(): Quill | null {
    return this.quillEditor;
  }

  private normalizeUrl(value: string): string {
    const url = value.trim();
    if (!url) return '';
    if (/^(?:https?:\/\/|mailto:|tel:|#|\/)/i.test(url)) return url;
    return `https://${url}`;
  }

  private normalizeLinks(html: string): string {
    if (!html || typeof DOMParser === 'undefined') return html;

    const document = new DOMParser().parseFromString(html, 'text/html');
    document.querySelectorAll<HTMLAnchorElement>('a[href]').forEach(anchor => {
      const href = anchor.getAttribute('href')?.trim() || '';
      const text = anchor.textContent?.trim() || '';
      const externalUrl = text.match(/^(?:https?:\/\/)?(?:www\.)[^\s]+$/i)?.[0];

      if (externalUrl) {
        const isResolvedLocalUrl = this.isResolvedLocalUrl(href, externalUrl);

        if (!/^[a-z][a-z\d+.-]*:/i.test(href) || isResolvedLocalUrl) {
          anchor.setAttribute('href', `https://${externalUrl.replace(/^https?:\/\//i, '')}`);
        }
      }
    });

    return document.body.innerHTML;
  }

  private isResolvedLocalUrl(href: string, externalUrl: string): boolean {
    if (typeof window === 'undefined' || !/^https?:\/\//i.test(href)) return false;

    try {
      const url = new URL(href);
      return url.origin === window.location.origin &&
        url.pathname.endsWith(`/${externalUrl.replace(/^https?:\/\//i, '')}`);
    } catch {
      return false;
    }
  }

  deleteSection() {
    this.delete.emit();
  }

}
