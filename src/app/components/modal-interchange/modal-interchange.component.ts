import { Component, ChangeDetectionStrategy, input, output, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalInterchangeItem } from '../../models/session.model';
import { Mode } from 'tonal';
import { LucideTrash } from '@lucide/angular';

interface ModeRow {
    modeName: string;
    chords: string[];
    notes: string[];
}

@Component({
    selector: 'app-modal-interchange',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, FormsModule, LucideTrash],
    templateUrl: './modal-interchange.component.html',
    styleUrls: ['./modal-interchange.component.css']
})
export class ModalInterchangeComponent {
    item = input.required<ModalInterchangeItem>();
    updated = output<ModalInterchangeItem>();
    deleted = output<string>();

    availableRoots = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
    modeNames = ['major', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'];

    localRoot = signal<string>('C');
    localSelectedMode1 = signal<number | null>(null);
    localSelectedMode2 = signal<number | null>(null);

    modes = computed<ModeRow[]>(() => {
        const root = this.localRoot();

        return this.modeNames.map(modeName => {
            // Usa Mode.seventhChords per ottenere gli accordi del modo con la root specificata
            const chords = Mode.seventhChords(modeName, root);
            // Usa Mode.notes per ottenere le note del modo
            const notes = Mode.notes(modeName, root);
            
            return {
                modeName,
                chords,
                notes
            };
        });
    });

    comparisonData = computed(() => {
        const mode1Index = this.localSelectedMode1();
        const mode2Index = this.localSelectedMode2();

        if (mode1Index === null || mode2Index === null) {
            return null;
        }

        const modesData = this.modes();
        const mode1 = modesData[mode1Index];
        const mode2 = modesData[mode2Index];

        if (!mode1 || !mode2) {
            return null;
        }

        return {
            mode1: mode1.modeName,
            mode2: mode2.modeName,
            chords1: mode1.chords,
            chords2: mode2.chords,
            notes1: mode1.notes,
            notes2: mode2.notes
        };
    });

    constructor() {
        // Sync with input
        effect(() => {
            const itemData = this.item();
            this.localRoot.set(itemData.root || 'C');
            this.localSelectedMode1.set(itemData.selectedMode1);
            this.localSelectedMode2.set(itemData.selectedMode2);
        });
    }

    onRootChange() {
        this.emitUpdate();
    }

    selectMode(index: number) {
        const mode1 = this.localSelectedMode1();
        const mode2 = this.localSelectedMode2();

        // Se clicco sulla prima selezione, la rimuovo e sposto la seconda a prima
        if (mode1 === index) {
            this.localSelectedMode1.set(mode2);
            this.localSelectedMode2.set(null);
        }
        // Se clicco sulla seconda selezione, la rimuovo
        else if (mode2 === index) {
            this.localSelectedMode2.set(null);
        }
        // Se non c'è una prima selezione, la imposto
        else if (mode1 === null) {
            this.localSelectedMode1.set(index);
        }
        // Se c'è già una prima selezione ma non una seconda, imposto la seconda
        else if (mode2 === null) {
            this.localSelectedMode2.set(index);
        }
        // Se ci sono già due selezioni, sostituisco la seconda
        else {
            this.localSelectedMode2.set(index);
        }

        this.emitUpdate();
    }

    getRowClass(index: number): string {
        const mode1 = this.localSelectedMode1();
        const mode2 = this.localSelectedMode2();

        if (mode1 === index) {
            return 'cursor-pointer transition-all border-l-4 border-primary bg-primary/25 font-bold text-primary hover:bg-base-200';
        }
        if (mode2 === index) {
            return 'cursor-pointer transition-all border-l-4 border-secondary bg-secondary/25 font-bold text-secondary hover:bg-base-200';
        }
        return 'cursor-pointer transition-all border-l-4 border-transparent hover:bg-base-200';
    }

    isChordDifferent(index: number): boolean {
        const comparison = this.comparisonData();
        if (!comparison) return false;

        return comparison.chords1[index] !== comparison.chords2[index];
    }

    isNoteNotInFirstMode(noteIndex: number): boolean {
        const comparison = this.comparisonData();
        if (!comparison) return false;

        const note2 = comparison.notes2[noteIndex];
        return !comparison.notes1.includes(note2);
    }

    private emitUpdate() {
        this.updated.emit({
            ...this.item(),
            root: this.localRoot(),
            selectedMode1: this.localSelectedMode1(),
            selectedMode2: this.localSelectedMode2()
        });
    }

    confirmDelete() {
        this.deleted.emit(this.item().id);
    }
}
