import { Component, ChangeDetectionStrategy, input, output, computed, signal, inject } from '@angular/core';
import { ComparisonItem } from '../../models/session.model';
import { LucideTrash2, LucidePlus, LucideX } from '@lucide/angular';
import { Chord, ChordType, Interval, Scale, ScaleType } from 'tonal';
import { FormsModule } from '@angular/forms';
import { ConfirmService } from '../../services/confirm.service';
import { NOTES_WITH_FLATS } from '../scale-visualization/constants';

import { Note } from "tonal";


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
  templateUrl: './comparison-table.component.html',
  styleUrls: ['./comparison-table.component.css']
})
export class ComparisonTableComponent {
  private confirmService = inject(ConfirmService);

  comparison = input.required<ComparisonItem>();

  deleted = output<void>();
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

    const firstElementNotes = els.length > 0 ? els[0].notes : [];
    const tonica = firstElementNotes.length > 0 ? firstElementNotes[0] : null;

    const allDegrees = new Set<string>();
    els.forEach((el,index) => {
      if(index == 0){
      el.degrees.forEach(d => allDegrees.add(d.degree));
      } else {
        el.degrees.forEach(d => {
          const degree = Interval.distance(tonica!, d.note);
          allDegrees.add(degree);
        });
      }
    });

    const degreeOrder = ['1P', '2m', '2M', '3m', '3M', '4P', '4A','5d', '5P', '5A','6m', '6M', '7m', '7M'];
    let p = Array.from(allDegrees).sort((a, b) => {
      const indexA = degreeOrder.indexOf(a);
      const indexB = degreeOrder.indexOf(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
    return p;
  });

  transposedRows = computed<TransposedRow[]>(() => {
    const els = this.elements();
    const headers = this.degreeHeaders();

    const firstElementNotes = els.length > 0 ? els[0].notes : [];
    const tonica = firstElementNotes.length > 0 ? firstElementNotes[0] : null;

    return els.map((el, indexLoop) => {
      const notesForDegree = headers.map(degree => {

        if (indexLoop === 0) {
          const foundDegree = el.degrees.find(d => d.degree === degree);
          return foundDegree ? foundDegree.note : null;
        } else {
          el.degrees = el.degrees.map(d => {
            return {
              note: d.note,
              degree: Interval.distance(tonica!, d.note)
            }
          });
          const foundDegree = el.degrees.find(d => d.degree === degree);
          return foundDegree ? foundDegree.note : null;
        }
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
        isFirstElement: indexLoop === 0,
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
    /*  this.confirmService.show(
       'Elimina tabella di confronto?',
       'Sei sicuro di voler eliminare questa tabella di confronto?',
       () => { */
    this.deleted.emit();
    /*     } */
    /*   ); */
  }
}
