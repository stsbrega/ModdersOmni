import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { Playstyle } from '../../../../shared/models/game.model';
import { HardwareSpecs } from '../../../../shared/models/specs.model';
import { HardwareBadgeComponent } from '../../../../shared/components/hardware-badge/hardware-badge.component';

@Component({
  selector: 'app-playstyle-select',
  standalone: true,
  imports: [HardwareBadgeComponent],
  template: `
    <div class="playstyle-select">
      <h2>Choose Your Playstyle</h2>
      <p class="subtitle">
        Select the experience you want. Your
        <app-hardware-badge [tier]="specs.tier || 'mid'" />
        tier hardware will be taken into account.
      </p>

      <div class="playstyles-grid">
        @for (style of playstyles(); track style.id) {
          <button
            class="playstyle-card"
            [class.selected]="selectedId() === style.id"
            (click)="select(style.id)"
          >
            <div class="playstyle-icon">{{ style.icon || style.name.charAt(0) }}</div>
            <h3>{{ style.name }}</h3>
            <p>{{ style.description }}</p>
          </button>
        }
        @if (playstyles().length === 0) {
          <p class="text-muted">Loading playstyles...</p>
        }
      </div>

      <div class="actions">
        <button class="btn-secondary" (click)="back.emit()">Back</button>
        <button
          class="btn-primary"
          (click)="generate()"
          [disabled]="!selectedId() || loading()"
        >
          {{ loading() ? 'Generating...' : 'Generate Modlist' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .playstyle-select { max-width: 700px; margin: 0 auto; }
    h2 { font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; text-align: center; }
    .subtitle {
      color: var(--color-text-muted);
      text-align: center;
      margin-bottom: 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .playstyles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1rem;
    }
    .playstyle-card {
      background: var(--color-bg-card);
      border: 2px solid var(--color-border);
      border-radius: 12px;
      padding: 1.5rem;
      text-align: left;
      cursor: pointer;
      transition: border-color 0.2s, transform 0.2s;
      color: var(--color-text);
      font-family: inherit;
    }
    .playstyle-card:hover { border-color: var(--color-primary); transform: translateY(-2px); }
    .playstyle-card.selected { border-color: var(--color-primary); background: rgba(99, 102, 241, 0.1); }
    .playstyle-icon {
      width: 40px;
      height: 40px;
      background: var(--color-bg-elevated);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      margin-bottom: 0.75rem;
    }
    .playstyle-card h3 { font-size: 0.9rem; font-weight: 600; margin: 0 0 0.5rem; }
    .playstyle-card p { color: var(--color-text-muted); font-size: 0.8rem; line-height: 1.4; margin: 0; }
    .text-muted { color: var(--color-text-muted); text-align: center; grid-column: 1 / -1; }

    .actions {
      display: flex;
      justify-content: space-between;
      margin-top: 2rem;
    }
    .btn-primary {
      background: var(--color-primary);
      color: white;
      padding: 0.625rem 1.5rem;
      border-radius: 8px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      font-family: inherit;
      font-size: 0.875rem;
    }
    .btn-primary:hover { background: var(--color-primary-hover); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
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
    }
    .btn-secondary:hover { background: var(--color-bg-elevated); }
  `],
})
export class PlaystyleSelectComponent implements OnInit {
  @Input() gameId!: number;
  @Input() specs!: HardwareSpecs;
  @Output() back = new EventEmitter<void>();

  playstyles = signal<Playstyle[]>([]);
  selectedId = signal<number | null>(null);
  loading = signal(false);

  constructor(
    private api: ApiService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.api.getPlaystyles(this.gameId).subscribe({
      next: (playstyles) => this.playstyles.set(playstyles),
      error: () => {},
    });
  }

  select(id: number): void {
    this.selectedId.set(id);
  }

  generate(): void {
    const playstyleId = this.selectedId();
    if (!playstyleId) return;

    this.loading.set(true);
    this.api
      .generateModlist({
        game_id: this.gameId,
        playstyle_id: playstyleId,
        gpu: this.specs.gpu,
        vram_mb: this.specs.vram_mb,
        cpu: this.specs.cpu,
        ram_gb: this.specs.ram_gb,
        hardware_tier: this.specs.tier,
      })
      .subscribe({
        next: (modlist) => {
          this.loading.set(false);
          this.router.navigate(['/modlist', modlist.id]);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }
}
