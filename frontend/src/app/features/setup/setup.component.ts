import { Component, signal } from '@angular/core';
import { GameSelectComponent } from './steps/game-select/game-select.component';
import { SpecInputComponent } from './steps/spec-input/spec-input.component';
import { PlaystyleSelectComponent } from './steps/playstyle-select/playstyle-select.component';
import { HardwareSpecs } from '../../shared/models/specs.model';

@Component({
  selector: 'app-setup',
  standalone: true,
  imports: [GameSelectComponent, SpecInputComponent, PlaystyleSelectComponent],
  template: `
    <div class="setup">
      <h1>Create Your Modlist</h1>

      <div class="stepper">
        @for (step of steps; track step.number; let i = $index) {
          <div class="step" [class.active]="currentStep() === step.number" [class.completed]="currentStep() > step.number">
            <div class="step-number">
              @if (currentStep() > step.number) {
                <span>&#10003;</span>
              } @else {
                {{ step.number }}
              }
            </div>
            <span class="step-label">{{ step.label }}</span>
          </div>
          @if (i < steps.length - 1) {
            <div class="step-divider" [class.active]="currentStep() > step.number"></div>
          }
        }
      </div>

      <div class="step-content">
        @switch (currentStep()) {
          @case (1) {
            <app-game-select (gameSelected)="onGameSelected($event)" />
          }
          @case (2) {
            <app-spec-input (specsParsed)="onSpecsParsed($event)" (back)="goBack()" />
          }
          @case (3) {
            <app-playstyle-select
              [gameId]="selectedGameId()!"
              [specs]="parsedSpecs()!"
              (back)="goBack()"
            />
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .setup {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
    }
    .setup h1 {
      font-size: 1.75rem;
      font-weight: 700;
      margin-bottom: 2rem;
      text-align: center;
    }
    .stepper {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 3rem;
      gap: 0.5rem;
    }
    .step {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      opacity: 0.5;
      transition: opacity 0.2s;
    }
    .step.active, .step.completed { opacity: 1; }
    .step-number {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--color-bg-elevated);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.875rem;
      font-weight: 600;
    }
    .step.active .step-number {
      background: var(--color-primary);
      color: white;
    }
    .step.completed .step-number {
      background: var(--color-accent-green);
      color: white;
    }
    .step-label {
      font-size: 0.875rem;
      font-weight: 500;
    }
    .step-divider {
      width: 40px;
      height: 2px;
      background: var(--color-bg-elevated);
      transition: background 0.2s;
    }
    .step-divider.active {
      background: var(--color-accent-green);
    }
  `],
})
export class SetupComponent {
  currentStep = signal(1);
  selectedGameId = signal<number | null>(null);
  parsedSpecs = signal<HardwareSpecs | null>(null);

  steps = [
    { number: 1, label: 'Select Game' },
    { number: 2, label: 'Hardware Specs' },
    { number: 3, label: 'Playstyle' },
  ];

  onGameSelected(gameId: number): void {
    this.selectedGameId.set(gameId);
    this.currentStep.set(2);
  }

  onSpecsParsed(specs: HardwareSpecs): void {
    this.parsedSpecs.set(specs);
    this.currentStep.set(3);
  }

  goBack(): void {
    this.currentStep.update((s) => Math.max(1, s - 1));
  }
}
