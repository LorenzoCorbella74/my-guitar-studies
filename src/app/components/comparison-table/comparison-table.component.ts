import { Component, ChangeDetectionStrategy, input, output, computed, signal, inject } from '@angular/core';
import { ComparisonItem } from '../../models/session.model';
import { LucideTrash2, LucidePlus, LucideX } from '@lucide/angular';
import { Chord, ChordType, Interval, Scale, ScaleType } from 'tonal';
import { FormsModule } from '@angular/forms';
import { ConfirmService } from '../../services/confirm.service';
import { NOTES_WITH_FLATS } from '../scale-visualization/constants';

interface ComparisonElement {
  type: 'scale' | 'arpeggio' | 'chord';
  root: string;
  name: string;
  notes: string[];
  degrees: { note: string; degree: string }[];
}

interface TransposedRow {
  elementName: string;
  root: string;
  degreeValues: (string | null)[];
  notesForDegree: (string | null)[];
  isFirstElement: boolean;
  notePresentInFirst: boolean[];
}

@Component({
  selector: 'app-comparison-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideTrash2, LucidePlus, LucideX, FormsModule],
  template: `
    <div class="card bg-base-100 shadow-md">
      <div class="card-body">
        <div class="flex justify-between items-start gap-4 mb-4">
          <h3 class="card-title flex-1">Confronto</h3>
          
          <div class="flex gap-2">
            <button
              class="btn btn-sm btn-primary"
              (click)="addElement()"
              aria-label="Aggiungi elemento"
            >
              <svg lucidePlus class="w-4 h-4"></svg>
            </button>
            <button
              class="btn btn-sm btn-ghost"
              (click)="deleteComparison()"
              aria-label="Elimina confronto"
            >
              <svg lucideTrash2 class="w-4 h-4"></svg>
            </button>
          </div>
        </div>

        @if (showAddForm()) {
          <div class="border border-base-300 rounded-lg p-4 mb-4 bg-base-200">
            <h4 class="font-semibold mb-3">Aggiungi elemento al confronto</h4>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div class="form-control">
                <label class="label">
                  <span class="label-text">Tipo</span>
                </label>
                <select class="select select-bordered select-sm" [(ngModel)]="newElementType">
                  <option value="scale">Scala</option>
                  <option value="chord">Accordo</option>
                </select>
              </div>
              <div class="form-control">
                <label class="label">
                  <span class="label-text">Tonica</span>
                </label>
                <select class="select select-bordered select-sm" [(ngModel)]="newElementRoot">
                  @for (note of chromaticNotes; track note) {
                    <option [value]="note">{{ note }}</option>
                  }
                </select>
              </div>
              <div class="form-control">
                <label class="label">
                  <span class="label-text">Nome</span>
                </label>
                <input
                  type="text"
                  class="input input-bordered input-sm"
                  [(ngModel)]="newElementName"
                  list="nameOptions"
                  [placeholder]="newElementType() === 'scale' ? 'Es: major, minor' : 'Es: maj7, m7'"
                />
                <datalist id="nameOptions">
                  @for (name of availableNames(); track name) {
                    <option [value]="name">{{ name }}</option>
                  }
                </datalist>
              </div>
              <div class="form-control">
                <label class="label">
                  <span class="label-text">&nbsp;</span>
                </label>
                <div class="flex gap-2">
                  <button class="btn btn-primary btn-sm flex-1" (click)="confirmAddElement()">
                    Aggiungi
                  </button>
                  <button class="btn btn-ghost btn-sm" (click)="cancelAddElement()">
                    <svg lucideX class="w-4 h-4"></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        }

        @if (elements().length === 0) {
          <div class="text-center py-8 text-base-content/60">
            <p>Nessun elemento da confrontare.</p>
            <p class="text-sm mt-2">Aggiungi scale, arpeggi o accordi per iniziare il confronto.</p>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="table table-zebra w-full">
              <thead>
                <tr>
                  <th class="sticky left-0 bg-base-200 z-10">Elemento</th>
                  @for (degreeHeader of degreeHeaders(); track degreeHeader) {
                    <th class="text-center">{{ degreeHeader }}</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (row of transposedRows(); track $index; let rowIndex = $index) {
                  <tr>
                    <td class="sticky left-0 bg-base-200 z-10">
                      <div class="flex items-center justify-between gap-2">
                        <span class="font-semibold">{{ row.elementName }}</span>
                        <button
                          class="btn btn-ghost btn-xs"
                          (click)="removeElement($index)"
                        >
                          <svg lucideX class="w-3 h-3"></svg>
                        </button>
                      </div>
                    </td>
                    @for (note of row.notesForDegree; track $index; let noteIndex = $index) {
                      <td class="text-center">
                        @if (note) {
                          <span 
                            class="note-badge"
                            [class.note-not-present]="!row.isFirstElement && !row.notePresentInFirst[noteIndex]"
                          >
                            {{ note }}
                          </span>
                        } @else {
                          <span class="text-base-content/20">—</span>
                        }
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    
    .table th {
      position: relative;
    }
    
    .note-badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      font-weight: 500;
      background-color: hsl(var(--n) / 0.2);
      color: hsl(var(--nc));
    }
    
    .note-not-present {
      background-color: red !important;
      color: white !important;
      border: 2px solid darken(red, 20%) !important;
      font-weight: 600 !important;
    }
  `
})
export class ComparisonTableComponent {
  private confirmService = inject(ConfirmService);
  
  comparison = input.required<ComparisonItem>();
  
  delete = output<void>();
  update = output<ComparisonItem>();
  
  showAddForm = signal(false);
  newElementType = signal<'scale' | 'chord'>('scale');
  newElementRoot = signal('C');
  newElementName = signal('major');
  
  chromaticNotes = NOTES_WITH_FLATS;
  
  availableNames = computed(() => {
    if (this.newElementType() === 'scale') {
      return ScaleType.names();
    } else {
      return ChordType.names();
    }
  });
  
  elements = computed<ComparisonElement[]>(() => {
    const items = this.comparison().items || [];
    return items.map(item => this.getElementNotes(item));
  });
  
  degreeHeaders = computed(() => {
    const els = this.elements();
    if (els.length === 0) return [];
    
    const allDegrees = new Set<string>();
    els.forEach(el => {
      el.degrees.forEach(d => allDegrees.add(d.degree));
    });
    
    const degreeOrder = ['1P', '2m', '2M', '3m', '3M', '4P', '5d', '5P', '6m', '6M', '7m', '7M'];
    return Array.from(allDegrees).sort((a, b) => {
      const indexA = degreeOrder.indexOf(a);
      const indexB = degreeOrder.indexOf(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  });
  
  transposedRows = computed<TransposedRow[]>(() => {
    const els = this.elements();
    const headers = this.degreeHeaders();
    
    const firstElementNotes = els.length > 0 ? els[0].notes : [];
    
    return els.map((el, index) => {
      const notesForDegree = headers.map(degree => {
        const found = el.degrees.find(d => d.degree === degree);
        return found ? found.note : null;
      });
      
      const notePresentInFirst = notesForDegree.map(note => {
        if (!note) return true;
        return firstElementNotes.includes(note);
      });
      
      return {
        elementName: el.name,
        root: el.root,
        degreeValues: headers,
        notesForDegree,
        isFirstElement: index === 0,
        notePresentInFirst
      };
    });
  });
  
  firstElementName = computed(() => {
    const els = this.elements();
    return els.length > 0 ? els[0].name : '';
  });
  
  isNoteInFirst(note: string): boolean {
    const els = this.elements();
    if (els.length === 0) return false;
    return els[0].notes.includes(note);
  }
  
  private getElementNotes(item: { type: 'scale' | 'arpeggio' | 'chord'; config: any }): ComparisonElement {
    const root = item.config.root || 'C';
    let notes: string[] = [];
    let name = '';
    
    if (item.type === 'scale' || item.type === 'arpeggio') {
      const scaleName = item.config.scaleName || 'major';
      const scaleString = root + ' ' + scaleName;
      const scale = Scale.get(scaleString);
      notes = scale.notes || [];
      name = root + ' ' + scaleName;
    } else {
      const chordType = item.config.chordType || 'major';
      const chordString = root + chordType;
      const chord = Chord.get(chordString);
      notes = chord.notes || [];
      name = root + chordType;
    }
    
    const degrees = notes.map(note => ({
      note,
      degree: this.getDegree(root, note)
    }));
    
    return {
      type: item.type,
      root,
      name,
      notes,
      degrees
    };
  }
  
  private getDegree(root: string, note: string): string {
    const interval = Interval.distance(root, note);
    
    const intervalMap: Record<string, string> = {
      '1P': '1P',
      '2m': '2m',
      '2M': '2M',
      '3m': '3m',
      '3M': '3M',
      '4P': '4P',
      '5d': '5d',
      '5P': '5P',
      '6m': '6m',
      '6M': '6M',
      '7m': '7m',
      '7M': '7M'
    };
    
    return intervalMap[interval] || interval;
  }
  
  addElement() {
    this.showAddForm.update(v => !v);
  }
  
  confirmAddElement() {
    const root = this.newElementRoot().trim();
    const name = this.newElementName().trim();
    
    if (!root || !name) {
      alert('Inserisci tonica e nome');
      return;
    }
    
    const currentItems = this.comparison().items || [];
    const config: any = {
      tuning: ['E', 'A', 'D', 'G', 'B', 'E'],
      root,
      labelMode: 'note' as const,
      colorMode: 'monocolor' as const,
      showChordDegrees: false
    };
    
    if (this.newElementType() === 'scale') {
      config.scaleName = name;
    } else {
      config.chordType = name;
    }
    
    const newItem = {
      type: this.newElementType() as 'scale' | 'chord',
      config
    };
    
    this.update.emit({
      ...this.comparison(),
      items: [...currentItems, newItem]
    });
    
    this.showAddForm.set(false);
    this.newElementRoot.set('C');
    this.newElementName.set('major');
  }
  
  cancelAddElement() {
    this.showAddForm.set(false);
    this.newElementRoot.set('C');
    this.newElementName.set('major');
  }
  
  removeElement(index: number) {
    this.confirmService.show(
      'Elimina elemento?',
      'Sei sicuro di voler eliminare questo elemento dal confronto?',
      () => {
        const currentItems = this.comparison().items || [];
        const newItems = currentItems.filter((_, i) => i !== index);
        
        this.update.emit({
          ...this.comparison(),
          items: newItems
        });
      }
    );
  }
  
  deleteComparison() {
    this.confirmService.show(
      'Elimina tabella di confronto?',
      'Sei sicuro di voler eliminare questa tabella di confronto?',
      () => {
        this.delete.emit();
      }
    );
  }
}
