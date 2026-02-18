import { Component, signal } from '@angular/core';
import { GameSelectComponent } from './steps/game-select/game-select.component';
import { SpecInputComponent } from './steps/spec-input/spec-input.component';
import { PlaystyleSelectComponent } from './steps/playstyle-select/playstyle-select.component';
import { HardwareSpecs } from '../../shared/models/specs.model';
import { ApiService } from '../../core/services/api.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-setup',
  standalone: true,
  imports: [GameSelectComponent, SpecInputComponent, PlaystyleSelectComponent],
  template: `
    <div class="setup">
      <h1>FORGE YOUR LOADOUT</h1>

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
            <div class="version-select">
              <h2>CHOOSE YOUR VERSION</h2>
              <p class="subtitle">Select which version you want to mod.</p>
              <div class="versions-grid">
                @for (version of selectedGameVersions(); track version) {
                  <button class="version-card" (click)="onVersionSelected(version)">
                    <div class="version-icon">✓</div>
                    <h3>{{ version }}</h3>
                  </button>
                }
              </div>
              <div class="actions">
                <button class="btn-secondary" (click)="goBack()">Back</button>
              </div>
            </div>
          }
          @case (3) {
            <app-spec-input (specsParsed)="onSpecsParsed($event)" (back)="goBack()" />
          }
          @case (4) {
            <app-playstyle-select
              [gameId]="selectedGameId()!"
              [specs]="parsedSpecs()!"
              [gameVersion]="selectedGameVersion()!"
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
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 2rem;
      text-align: center;
      font-family: var(--font-heading);
      letter-spacing: 0.05em;
      text-transform: uppercase;
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

    .version-select {
      text-align: center;
    }
    .version-select h2 {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      font-family: var(--font-heading);
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .version-select .subtitle {
      color: var(--color-text-muted);
      margin-bottom: 2rem;
    }
    .versions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 1.5rem;
      max-width: 500px;
      margin: 0 auto 2rem;
    }
    .version-card {
      background: var(--color-bg-card);
      border: 2px solid var(--color-border);
      border-radius: 12px;
      padding: 2rem;
      cursor: pointer;
      transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
      color: var(--color-text);
      font-family: inherit;
    }
    .version-card:hover {
      border-color: var(--color-primary);
      transform: translateY(-2px);
      box-shadow: 0 0 16px rgba(99, 102, 241, 0.3);
    }
    .version-icon {
      font-size: 2rem;
      margin-bottom: 1rem;
    }
    .version-card h3 {
      font-size: 1rem;
      font-weight: 600;
      margin: 0;
    }

    .actions {
      display: flex;
      justify-content: center;
      gap: 1rem;
      margin-top: 2rem;
    }
    .btn-secondary {
      background: transparent;
      border: 1px solid var(--color-border);
      color: var(--color-text);
      padding: 0.625rem 1.5rem;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      font-family: inherit;
      font-size: 0.875rem;
      transition: background 0.2s;
    }
    .btn-secondary:hover {
      background: var(--color-bg-elevated);
    }
  `],
})
export class SetupComponent {
  currentStep = signal(1);
  selectedGameId = signal<number | null>(null);
  selectedGameVersion = signal<string | null>(null);
  selectedGameVersions = signal<string[]>([]);
  parsedSpecs = signal<HardwareSpecs | null>(null);

  steps = [
    { number: 1, label: 'Select Game' },
    { number: 2, label: 'Game Version' },
    { number: 3, label: 'Hardware Specs' },
    { number: 4, label: 'Playstyle' },
  ];

  constructor(
    private api: ApiService,
    private themeService: ThemeService,
  ) {}

  onGameSelected(gameId: number): void {
    this.selectedGameId.set(gameId);
    // Fetch game details to get versions
    this.api.getGames().subscribe({
      next: (games) => {
        const game = games.find((g) => g.id === gameId);
        if (game && game.versions && game.versions.length > 0) {
          this.selectedGameVersions.set(game.versions);
          this.currentStep.set(2);
          // Set theme based on game slug
          this.themeService.setThemeFromSlug(game.slug);
        } else {
          // If no versions, skip to specs
          this.currentStep.set(3);
        }
      },
      error: () => {
        this.currentStep.set(3);
      },
    });
  }

  onVersionSelected(version: string): void {
    this.selectedGameVersion.set(version);
    this.currentStep.set(3);
  }

  onSpecsParsed(specs: HardwareSpecs): void {
    this.parsedSpecs.set(specs);
    this.currentStep.set(4);
  }

  goBack(): void {
    this.currentStep.update((s) => Math.max(1, s - 1));
  }
}
