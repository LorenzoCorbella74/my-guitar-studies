import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { NOTES_WITH_FLATS } from '../scale-visualization/constants';
import { FormsModule } from '@angular/forms';
import { LucidePencil, LucidePlus, LucideTrash2 } from '@lucide/angular';

import { Key } from "tonal";
import { KeyProgressionItem } from '../../models/session.model';

@Component({
  selector: 'app-key-progression',
  imports: [LucideTrash2, FormsModule, LucidePlus, LucidePencil],
  templateUrl: './key-progression.html',
  styleUrls: ['./key-progression.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KeyProgressionComponent {

  keyProgressionItem = input<null | KeyProgressionItem>();
  keyProgressionItemFromUI = signal<null | KeyProgressionItem>(this.keyProgressionItem() || null);

  constructor() {
    effect(() => {
      const item = this.keyProgressionItem();
      if (item) {
        this.keyProgressionItemFromUI.set(item);
      }
    });
  }


  showAddForm = computed(() => {
    const item = this.keyProgressionItemFromUI()?.tonic;
    return item ? false : true;
  });

  data = computed(() => {
    const item = this.keyProgressionItemFromUI();
    if (!item) {
      return null;
    }
    const { tonic, keyType } = item;
    if (!tonic || !keyType) {
      return null;
    }
    const { triads, chords, intervals, grades, chordsHarmonicFunction, secondaryDominants, chordScales } = keyType === 'major' ?
      Key.majorKey(tonic!) :
      Key.minorKey(tonic!)[keyType as 'natural' | 'harmonic' | 'melodic'];
    return {
      tonic,
      keyType,
      triads,
      chords,
      grades, intervals, chordsHarmonicFunction,secondaryDominants, chordScales
    };
  });

  newRoot = signal('C');
  newType = signal('major');

  typeOptions = [
    { label: 'Maggiore', value: 'major' },
    { label: 'Minore Naturale', value: 'natural' },
    { label: 'Minore Armonica', value: 'harmonic' },
    { label: 'Minore Melodica', value: 'melodic' },
  ];

  chromaticNotes = NOTES_WITH_FLATS;

  delete = output<void>();
  update = output<KeyProgressionItem>();

  addKey() {
    const newKey = {
      tonic: this.newRoot(),
      keyType: this.newType()
    };
    const currentItem = this.keyProgressionItem();
    this.keyProgressionItemFromUI.set({
      type: 'keyprogression',
      id: currentItem?.id!,
      order: currentItem?.order!,
      ...newKey
    });
    this.update.emit(this.keyProgressionItemFromUI()!);
  }

  deleteKey() {
    this.delete.emit();
  }

  editKey(){
      this.newRoot.set(this.keyProgressionItemFromUI()?.tonic || 'C');
      this.newType.set(this.keyProgressionItemFromUI()?.keyType || 'major');
      this.keyProgressionItemFromUI.set(null);
  }

  functionColor(func: string): string {
    switch (func) {
      case 'T':
        return 'black';
      case 'SD':
        return 'blue';
      case 'D':
        return 'red';
      default:
        return 'black';   
    }
  }

}
