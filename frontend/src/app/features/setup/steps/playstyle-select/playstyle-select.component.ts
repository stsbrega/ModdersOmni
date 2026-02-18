import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { Playstyle } from '../../../../shared/models/game.model';
import { HardwareSpecs } from '../../../../shared/models/specs.model';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

@Component({
  selector: 'app-playstyle-select',
  standalone: true,
  imports: [],
  animations: [
    trigger('staggerCards', [
      transition(':enter', [
        query('.playstyle-card', [
          style({ opacity: 0, transform: 'translateY(12px)' }),
          stagger(60, [
            animate('350ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 1, transform: 'translateY(0)' })),
          ]),
        ], { optional: true }),
      ]),
    ]),
  ],
  template: `
    <div class="playstyle-select">
      <h2>Choose Your Playstyle</h2>
      <p class="step-desc">
        Select the experience you want. Your hardware will be taken into account.
      </p>

      <div class="playstyles-grid" @staggerCards>
        @for (ps of playstyles(); track ps.id) {
          <button
            class="playstyle-card"
            [class.selected]="selectedId() === ps.id"
            (click)="select(ps.id)"
          >
            <div class="ps-icon">{{ ps.icon || ps.name.charAt(0) }}</div>
            <div class="ps-content">
              <h3>{{ ps.name }}</h3>
              @if (ps.description) {
                <p>{{ ps.description }}</p>
              }
            </div>
            @if (selectedId() === ps.id) {
              <div class="ps-check">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
            }
          </button>
        }
        @if (playstyles().length === 0) {
          <div class="loading-state">
            <span class="load-spinner"></span>
            Loading playstyles...
          </div>
        }
      </div>

      <div class="actions">
        <button class="btn-back" (click)="back.emit()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back
        </button>
        <button
          class="btn-primary"
          (click)="generate()"
          [disabled]="!selectedId() || loading()"
        >
          @if (loading()) {
            <span class="btn-spinner"></span>
            Generating...
          } @else {
            Generate Modlist
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          }
        </button>
      </div>
    </div>
  `,
  styles: [`
    .playstyle-select {
      max-width: 640px;
      margin: 0 auto;
    }
    h2 {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 0.375rem;
      text-align: center;
    }
    .step-desc {
      font-size: 0.875rem;
      color: var(--color-text-muted);
      text-align: center;
      margin-bottom: 2rem;
    }
    .playstyles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
      gap: 0.75rem;
      margin-bottom: 2rem;
    }
    .playstyle-card {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: 10px;
      padding: 1rem 1.125rem;
      text-align: left;
      cursor: pointer;
      color: var(--color-text);
      font-family: inherit;
      transition: border-color 0.15s, background 0.15s, transform 0.15s;
      position: relative;
    }
    .playstyle-card:hover {
      border-color: var(--color-border-hover);
      transform: translateY(-1px);
    }
    .playstyle-card.selected {
      border-color: var(--color-gold);
      background: rgba(192, 160, 96, 0.05);
    }
    .ps-icon {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--color-border);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      font-weight: 600;
      flex-shrink: 0;
    }
    .playstyle-card.selected .ps-icon {
      background: rgba(192, 160, 96, 0.12);
      border-color: rgba(192, 160, 96, 0.3);
      color: var(--color-gold);
    }
    .ps-content {
      flex: 1;
      min-width: 0;
    }
    .ps-content h3 {
      font-size: 0.875rem;
      font-weight: 600;
      margin: 0 0 0.25rem;
    }
    .ps-content p {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      line-height: 1.4;
      margin: 0;
    }
    .ps-check {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: var(--color-gold);
      color: #0D0D0F;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .loading-state {
      grid-column: 1 / -1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 2rem;
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }
    .load-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid var(--color-border);
      border-top-color: var(--color-gold);
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    /* Actions */
    .actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }
    .btn-back {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      background: none;
      border: none;
      color: var(--color-text-muted);
      font-size: 0.8125rem;
      font-weight: 500;
      padding: 0.5rem 0;
      cursor: pointer;
      transition: color 0.15s;
    }
    .btn-back:hover { color: var(--color-text); }
    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--color-gold);
      color: #0D0D0F;
      padding: 0.625rem 1.5rem;
      border-radius: 8px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      font-size: 0.875rem;
      transition: background 0.2s, box-shadow 0.3s;
    }
    .btn-primary:hover {
      background: var(--color-gold-hover);
      box-shadow: 0 0 20px var(--color-gold-glow);
    }
    .btn-primary:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      box-shadow: none;
    }
    .btn-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(13, 13, 15, 0.3);
      border-top-color: #0D0D0F;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class PlaystyleSelectComponent implements OnInit {
  @Input() gameId!: number;
  @Input() specs!: HardwareSpecs;
  @Input() gameVersion: string | undefined;
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
        cpu_cores: this.specs.cpu_cores,
        cpu_speed_ghz: this.specs.cpu_speed_ghz,
        game_version: this.gameVersion,
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
