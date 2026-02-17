import { Component, EventEmitter, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';
import { HardwareSpecs } from '../../../../shared/models/specs.model';
import { HardwareBadgeComponent } from '../../../../shared/components/hardware-badge/hardware-badge.component';

@Component({
  selector: 'app-spec-input',
  standalone: true,
  imports: [FormsModule, HardwareBadgeComponent],
  template: `
    <div class="spec-input">
      <h2>Paste Your Hardware Specs</h2>
      <p class="subtitle">
        Copy your system info from NVIDIA App, HWiNFO, Task Manager, or similar tools and paste it below.
      </p>

      <textarea
        [(ngModel)]="rawText"
        placeholder="Example:
GPU: NVIDIA GeForce RTX 4070 Ti
VRAM: 12 GB GDDR6X
CPU: AMD Ryzen 7 7800X3D
RAM: 32 GB DDR5"
        rows="8"
        class="spec-textarea"
      ></textarea>

      @if (parsedSpecs()) {
        <div class="parsed-results">
          <h3>Detected Hardware</h3>
          <div class="specs-grid">
            <div class="spec-item">
              <span class="spec-label">GPU</span>
              <span class="spec-value">{{ parsedSpecs()?.gpu || 'Not detected' }}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">VRAM</span>
              <span class="spec-value">{{ parsedSpecs()?.vram_mb ? (parsedSpecs()!.vram_mb! / 1024) + ' GB' : 'Not detected' }}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">CPU</span>
              <span class="spec-value">{{ parsedSpecs()?.cpu || 'Not detected' }}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">RAM</span>
              <span class="spec-value">{{ parsedSpecs()?.ram_gb ? parsedSpecs()!.ram_gb + ' GB' : 'Not detected' }}</span>
            </div>
          </div>
          <div class="tier-result">
            <span>Hardware Tier:</span>
            <app-hardware-badge [tier]="parsedSpecs()?.tier || 'mid'" />
          </div>
        </div>
      }

      <div class="actions">
        <button class="btn-secondary" (click)="back.emit()">Back</button>
        @if (!parsedSpecs()) {
          <button class="btn-primary" (click)="analyzeSpecs()" [disabled]="loading() || !rawText.trim()">
            {{ loading() ? 'Analyzing...' : 'Analyze Specs' }}
          </button>
        } @else {
          <button class="btn-primary" (click)="confirm()">Continue</button>
        }
      </div>
    </div>
  `,
  styles: [`
    .spec-input { max-width: 600px; margin: 0 auto; }
    h2 { font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; text-align: center; }
    .subtitle { color: var(--color-text-muted); text-align: center; margin-bottom: 1.5rem; }
    .spec-textarea {
      width: 100%;
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      color: var(--color-text);
      padding: 1rem;
      font-family: 'Fira Code', 'Consolas', monospace;
      font-size: 0.875rem;
      resize: vertical;
      outline: none;
      transition: border-color 0.2s;
    }
    .spec-textarea:focus { border-color: var(--color-primary); }
    .spec-textarea::placeholder { color: var(--color-text-muted); opacity: 0.6; }

    .parsed-results {
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      padding: 1.5rem;
      margin-top: 1.5rem;
    }
    .parsed-results h3 { font-size: 1rem; margin-bottom: 1rem; }
    .specs-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }
    .spec-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .spec-label {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .spec-value { font-weight: 500; }
    .tier-result {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--color-border);
      font-weight: 500;
    }

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
export class SpecInputComponent {
  @Output() specsParsed = new EventEmitter<HardwareSpecs>();
  @Output() back = new EventEmitter<void>();

  rawText = '';
  loading = signal(false);
  parsedSpecs = signal<HardwareSpecs | null>(null);

  constructor(private api: ApiService) {}

  analyzeSpecs(): void {
    this.loading.set(true);
    this.api.parseSpecs(this.rawText).subscribe({
      next: (response) => {
        this.parsedSpecs.set(response.specs);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        // TODO: Show error notification
      },
    });
  }

  confirm(): void {
    const specs = this.parsedSpecs();
    if (specs) {
      this.specsParsed.emit(specs);
    }
  }
}
