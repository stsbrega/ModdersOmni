import { Component, EventEmitter, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';
import { HardwareSpecs, SpecsParseResponse, TierScores } from '../../../../shared/models/specs.model';

@Component({
  selector: 'app-spec-input',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="spec-input">
      <h2>SCAN YOUR HARDWARE</h2>
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

      @if (fullResponse()) {
        <div class="parsed-results">
          <div class="tier-section">
            <div class="tier-badge" [class.tier-low]="fullResponse()?.tier === 'LOW'" [class.tier-mid]="fullResponse()?.tier === 'MID'" [class.tier-high]="fullResponse()?.tier === 'HIGH'" [class.tier-ultra]="fullResponse()?.tier === 'ULTRA'">
              {{ fullResponse()?.tier || 'UNKNOWN' }}
            </div>
          </div>

          <h3>Detected Hardware</h3>
          <div class="specs-grid">
            <div class="spec-item">
              <span class="spec-label">GPU</span>
              <span class="spec-value">{{ fullResponse()!.specs.gpu || 'Not detected' }}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">VRAM</span>
              <span class="spec-value">{{ formatVram(fullResponse()!.specs.vram_mb) }}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">CPU</span>
              <span class="spec-value">{{ fullResponse()!.specs.cpu || 'Not detected' }}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">RAM</span>
              <span class="spec-value">{{ fullResponse()!.specs.ram_gb ? fullResponse()!.specs.ram_gb + ' GB' : 'Not detected' }}</span>
            </div>
          </div>

          @if (fullResponse()?.tier_scores) {
            <div class="tier-scores">
              <h4>Performance Breakdown</h4>
              <div class="score-bars">
                <div class="score-bar-item">
                  <label>VRAM</label>
                  <div class="bar">
                    <div class="fill" [style.width.%]="(fullResponse()!.tier_scores!.vram || 0) * 20"></div>
                  </div>
                  <span class="score-label">{{ formatScore(fullResponse()!.tier_scores!.vram) }}</span>
                </div>
                <div class="score-bar-item">
                  <label>GPU Gen</label>
                  <div class="bar">
                    <div class="fill" [style.width.%]="(fullResponse()!.tier_scores!.gpu_gen || 0) * 20"></div>
                  </div>
                  <span class="score-label">{{ formatScore(fullResponse()!.tier_scores!.gpu_gen) }}</span>
                </div>
                <div class="score-bar-item">
                  <label>CPU</label>
                  <div class="bar">
                    <div class="fill" [style.width.%]="(fullResponse()!.tier_scores!.cpu || 0) * 20"></div>
                  </div>
                  <span class="score-label">{{ formatScore(fullResponse()!.tier_scores!.cpu) }}</span>
                </div>
                <div class="score-bar-item">
                  <label>RAM</label>
                  <div class="bar">
                    <div class="fill" [style.width.%]="(fullResponse()!.tier_scores!.ram || 0) * 20"></div>
                  </div>
                  <span class="score-label">{{ formatScore(fullResponse()!.tier_scores!.ram) }}</span>
                </div>
              </div>
            </div>
          }
        </div>
      }

      <div class="actions">
        <button class="btn-secondary" (click)="back.emit()">Back</button>
        @if (!fullResponse()) {
          <button class="btn-primary" (click)="analyzeSpecs()" [disabled]="loading() || !rawText.trim()">
            {{ loading() ? 'Scanning...' : 'Scan Hardware' }}
          </button>
        } @else {
          <button class="btn-primary" (click)="confirm()">Lock In</button>
        }
      </div>
    </div>
  `,
  styles: [`
    .spec-input {
      max-width: 600px;
      margin: 0 auto;
    }
    h2 {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      text-align: center;
      font-family: var(--font-heading);
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .subtitle {
      color: var(--color-text-muted);
      text-align: center;
      margin-bottom: 1.5rem;
    }
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
    .spec-textarea:focus {
      border-color: var(--color-primary);
    }
    .spec-textarea::placeholder {
      color: var(--color-text-muted);
      opacity: 0.6;
    }

    .parsed-results {
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      padding: 1.5rem;
      margin-top: 1.5rem;
    }

    .tier-section {
      display: flex;
      justify-content: center;
      margin-bottom: 1.5rem;
    }
    .tier-badge {
      padding: 0.75rem 2rem;
      border-radius: 12px;
      font-weight: 700;
      font-size: 0.95rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
    .tier-badge.tier-low {
      background: rgba(239, 68, 68, 0.2);
      color: var(--color-accent-red);
      border: 2px solid var(--color-accent-red);
    }
    .tier-badge.tier-mid {
      background: rgba(234, 179, 8, 0.2);
      color: var(--color-accent-yellow);
      border: 2px solid var(--color-accent-yellow);
    }
    .tier-badge.tier-high {
      background: rgba(34, 197, 94, 0.2);
      color: var(--color-accent-green);
      border: 2px solid var(--color-accent-green);
    }
    .tier-badge.tier-ultra {
      background: rgba(168, 85, 247, 0.2);
      color: #a855f7;
      border: 2px solid #a855f7;
    }

    .parsed-results h3 {
      font-size: 1rem;
      margin-bottom: 1rem;
      margin-top: 0;
    }
    .parsed-results h4 {
      font-size: 0.95rem;
      margin-bottom: 1rem;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
    }

    .specs-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
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
      font-weight: 600;
    }
    .spec-value {
      font-weight: 500;
      color: var(--color-text);
    }

    .tier-scores {
      background: rgba(99, 102, 241, 0.05);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: 1rem;
      margin-top: 1.5rem;
    }

    .score-bars {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .score-bar-item {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .score-bar-item label {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--color-text);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .bar {
      height: 6px;
      background: var(--color-bg-elevated);
      border-radius: 3px;
      overflow: hidden;
    }
    .bar .fill {
      height: 100%;
      background: linear-gradient(90deg, var(--color-accent-green), var(--color-primary));
      transition: width 0.3s ease;
    }
    .score-label {
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }

    .actions {
      display: flex;
      justify-content: space-between;
      margin-top: 2rem;
      gap: 1rem;
    }
    .btn-primary {
      flex: 1;
      background: var(--color-primary);
      color: white;
      padding: 0.625rem 1.5rem;
      border-radius: 8px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      font-family: inherit;
      font-size: 0.875rem;
      transition: background 0.2s;
    }
    .btn-primary:hover {
      background: var(--color-primary-hover);
    }
    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-secondary {
      flex: 0;
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
export class SpecInputComponent {
  @Output() specsParsed = new EventEmitter<HardwareSpecs>();
  @Output() back = new EventEmitter<void>();

  rawText = '';
  loading = signal(false);
  fullResponse = signal<SpecsParseResponse | null>(null);

  constructor(private api: ApiService) {}

  formatVram(vramMb: number | undefined): string {
    if (!vramMb) return 'Not detected';
    const gb = vramMb / 1024;
    return Math.round(gb) + ' GB';
  }

  formatScore(score: number | undefined): string {
    if (score === undefined) return '0';
    return Math.round(score * 10) / 10 + '/5';
  }

  analyzeSpecs(): void {
    this.loading.set(true);
    this.api.parseSpecs(this.rawText).subscribe({
      next: (response) => {
        this.fullResponse.set(response);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        // TODO: Show error notification
      },
    });
  }

  confirm(): void {
    const response = this.fullResponse();
    if (response && response.specs) {
      this.specsParsed.emit(response.specs);
    }
  }
}
