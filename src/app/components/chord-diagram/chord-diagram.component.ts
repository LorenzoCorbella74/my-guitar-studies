import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { ChordDefinition } from '../../models/session.model';
import { LucidePencil, LucideTrash2 } from '@lucide/angular';

@Component({
  selector: 'app-chord-diagram',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucidePencil, LucideTrash2],
  template: `
    <div class="flex flex-col items-center p-1 bg-base-100 rounded-lg border border-base-300 hover:shadow-md transition-shadow">
      <!-- Chord Name -->
      <h4 class="font-semibold text-lg mb-2">{{ chord().name || 'Unnamed' }}</h4>
      
      <!-- SVG Chord Diagram -->
      <svg [attr.viewBox]="'0 0 ' + width + ' ' + height" class="w-32">
        <!-- String labels (E A D G B E) -->
        @for (stringLabel of stringLabels; track $index; let i = $index) {
          <text
            [attr.x]="getStringX(i)"
            [attr.y]="15"
            text-anchor="middle"
            class="text-xs fill-base-content"
          >
            {{ stringLabel }}
          </text>
        }
        
        <!-- Open/Muted markers -->
        @for (stringValue of chord().strings; track $index; let i = $index) {
          @if (stringValue === 'o') {
            <circle
              [attr.cx]="getStringX(i)"
              [attr.cy]="30"
              r="5"
              class="fill-none stroke-base-content"
              stroke-width="2"
            />
          } @else if (stringValue === 'x') {
            <g>
              <line
                [attr.x1]="getStringX(i) - 4"
                [attr.y1]="26"
                [attr.x2]="getStringX(i) + 4"
                [attr.y2]="34"
                class="stroke-base-content"
                stroke-width="2"
              />
              <line
                [attr.x1]="getStringX(i) - 4"
                [attr.y1]="34"
                [attr.x2]="getStringX(i) + 4"
                [attr.y2]="26"
                class="stroke-base-content"
                stroke-width="2"
              />
            </g>
          }
        }
        
        <!-- Fret indicator (if not open position) -->
        @if (chord().startFret > 0) {
          <text
            x="5"
            [attr.y]="fretStartY + fretSpacing / 2"
            class="text-xs fill-base-content"
          >
            {{ chord().startFret }}fr
          </text>
        }
        
        <!-- Frets (horizontal lines) -->
        @for (fret of [0, 1, 2, 3, 4, 5]; track fret) {
          <line
            [attr.x1]="stringStartX"
            [attr.y1]="fretStartY + fret * fretSpacing"
            [attr.x2]="stringEndX"
            [attr.y2]="fretStartY + fret * fretSpacing"
            class="stroke-base-content"
            [attr.stroke-width]="fret === 0 && chord().startFret === 0 ? 3 : 1"
          />
        }
        
        <!-- Strings (vertical lines) -->
        @for (string of [0, 1, 2, 3, 4, 5]; track string) {
          <line
            [attr.x1]="getStringX(string)"
            [attr.y1]="fretStartY"
            [attr.x2]="getStringX(string)"
            [attr.y2]="fretStartY + 5 * fretSpacing"
            class="stroke-base-content"
            stroke-width="1"
          />
        }
        
        <!-- Barres -->
        @if (chord().barres) {
          @for (fret of [1, 2, 3, 4, 5]; track fret) {
            @for (barreGroup of getBarreGroupsForFret(fret); track $index) {
              <rect
                [attr.x]="getStringX(barreGroup.fromString) - 4"
                [attr.y]="fretStartY + (fret - 0.5) * fretSpacing - 4"
                [attr.width]="getStringX(barreGroup.toString) - getStringX(barreGroup.fromString) + 8"
                [attr.height]="8"
                class="fill-primary"
                rx="4"
              />
            }
          }
        }
        
        <!-- Finger positions -->
        @for (stringValue of chord().strings; track $index; let i = $index) {
          @if (typeof stringValue === 'number' && stringValue > 0) {
            <circle
              [attr.cx]="getStringX(i)"
              [attr.cy]="fretStartY + (stringValue - 0.5) * fretSpacing"
              r="7"
              class="fill-primary"
            />
          }
        }
      </svg>
      
      <!-- Action buttons -->
      <div class="flex gap-2 mt-2">
        <button
          type="button"
          class="btn btn-ghost btn-xs btn-square"
          (click)="edit.emit()"
          aria-label="Modifica accordo"
        >
          <svg lucidePencil class="w-3 h-3"></svg>
        </button>
        <button
          type="button"
          class="btn btn-ghost btn-xs btn-square text-error"
          (click)="deleteChord.emit()"
          aria-label="Elimina accordo"
        >
          <svg lucideTrash2 class="w-3 h-3"></svg>
        </button>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
  `
})
export class ChordDiagramComponent {
  chord = input.required<ChordDefinition>();
  edit = output<void>();
  deleteChord = output<void>();
  
  // SVG dimensions
  width = 140;
  height = 160;
  stringStartX = 30;
  stringEndX = 110;
  stringSpacing = 16;
  fretStartY = 45;
  fretSpacing = 20;
  
  stringLabels = ['E', 'A', 'D', 'G', 'B', 'E'];
  
  getStringX(stringIndex: number): number {
    return this.stringStartX + stringIndex * this.stringSpacing;
  }
  
  hasBarreAt(stringIndex: number, fret: number): boolean {
    const barres = this.chord().barres;
    if (!barres) return false;
    return barres[fret]?.includes(stringIndex) || false;
  }
  
  getBarreGroupsForFret(fret: number): Array<{ fromString: number; toString: number }> {
    const barres = this.chord().barres;
    if (!barres) return [];
    
    const stringsOnFret = barres[fret];
    if (!stringsOnFret || stringsOnFret.length === 0) return [];
    
    // Group consecutive strings
    const sorted = [...stringsOnFret].sort((a, b) => a - b);
    const groups: Array<{ fromString: number; toString: number }> = [];
    let start = sorted[0];
    let end = sorted[0];
    
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === end + 1) {
        end = sorted[i];
      } else {
        groups.push({ fromString: start, toString: end });
        start = sorted[i];
        end = sorted[i];
      }
    }
    groups.push({ fromString: start, toString: end });
    
    return groups;
  }
}
