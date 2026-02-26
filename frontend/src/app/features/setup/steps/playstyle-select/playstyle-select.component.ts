import { Component, EventEmitter, Input, OnInit, Output, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Playstyle } from '../../../../shared/models/game.model';
import { HardwareSpecs } from '../../../../shared/models/specs.model';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

@Component({
  selector: 'app-playstyle-select',
  standalone: true,
  imports: [FormsModule],
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

      <div class="ai-provider-section">
        <div class="provider-header" (click)="providerExpanded.set(!providerExpanded())">
          <div class="provider-label">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M12 2a4 4 0 0 1 4 4v1a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4zM18 14h.01M6 14h.01M15 18s-1 2-3 2-3-2-3-2"/>
              <rect x="3" y="11" width="18" height="10" rx="2"/>
            </svg>
            AI Providers
          </div>
          <div class="provider-badge" [class.configured]="configuredCount() > 0">
            {{ configuredCount() }} configured
          </div>
          <svg class="chevron" [class.expanded]="providerExpanded()" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </div>

        @if (providerExpanded()) {
          <div class="provider-body">
            <p class="provider-desc">
              Enter API keys for one or more providers. If one hits a rate limit or runs out of tokens, the next will be tried automatically.
            </p>

            <div class="provider-list">
              @for (p of providers; track p.value) {
                <div class="provider-row" [class.has-key]="getKey(p.value)">
                  <div class="provider-info">
                    <div class="provider-status">
                      @if (getKey(p.value)) {
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      }
                    </div>
                    <div>
                      <span class="provider-name">{{ p.label }}</span>
                      <span class="provider-model">{{ p.model }}</span>
                    </div>
                  </div>
                  <div class="key-input-wrap">
                    <input
                      [type]="isKeyVisible(p.value) ? 'text' : 'password'"
                      [value]="getKey(p.value)"
                      (input)="onKeyInput(p.value, $event)"
                      [placeholder]="p.placeholder"
                      autocomplete="off"
                      spellcheck="false"
                    />
                    <button class="key-toggle" (click)="toggleKeyVisibility(p.value)" type="button" tabindex="-1">
                      @if (isKeyVisible(p.value)) {
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                      } @else {
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      }
                    </button>
                  </div>
                  <span class="key-hint">{{ p.hint }}</span>
                </div>
              }
            </div>
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
          [disabled]="!selectedId() || configuredCount() === 0 || loading()"
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

    /* AI Provider Section */
    .ai-provider-section {
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: 10px;
      margin-bottom: 1.5rem;
      overflow: hidden;
    }
    .provider-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.875rem 1.125rem;
      cursor: pointer;
      transition: background 0.15s;
    }
    .provider-header:hover { background: rgba(255,255,255,0.02); }
    .provider-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-text);
    }
    .provider-badge {
      margin-left: auto;
      font-size: 0.75rem;
      padding: 0.2rem 0.625rem;
      border-radius: 100px;
      background: rgba(255,255,255,0.04);
      color: var(--color-text-muted);
      border: 1px solid var(--color-border);
    }
    .provider-badge.configured {
      background: rgba(192, 160, 96, 0.1);
      color: var(--color-gold);
      border-color: rgba(192, 160, 96, 0.25);
    }
    .chevron {
      color: var(--color-text-muted);
      transition: transform 0.2s;
      flex-shrink: 0;
    }
    .chevron.expanded { transform: rotate(180deg); }
    .provider-body {
      padding: 0 1.125rem 1.125rem;
    }
    .provider-desc {
      font-size: 0.8125rem;
      color: var(--color-text-muted);
      line-height: 1.5;
      margin: 0 0 1rem;
    }

    /* Provider list (vertical rows) */
    .provider-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .provider-row {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      padding: 0.75rem;
      background: rgba(255,255,255,0.015);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      transition: border-color 0.15s;
    }
    .provider-row.has-key {
      border-color: rgba(192, 160, 96, 0.3);
    }
    .provider-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .provider-status {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 1.5px solid var(--color-border);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: var(--color-text-dim);
    }
    .provider-row.has-key .provider-status {
      background: var(--color-gold);
      border-color: var(--color-gold);
      color: #0D0D0F;
    }
    .provider-name {
      font-size: 0.8125rem;
      font-weight: 600;
      margin-right: 0.5rem;
    }
    .provider-model {
      font-size: 0.6875rem;
      color: var(--color-text-muted);
    }
    .key-input-wrap {
      display: flex;
      align-items: center;
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: 6px;
      overflow: hidden;
      transition: border-color 0.15s;
    }
    .key-input-wrap:focus-within {
      border-color: var(--color-gold);
    }
    .key-input-wrap input {
      flex: 1;
      background: none;
      border: none;
      color: var(--color-text);
      font-size: 0.75rem;
      padding: 0.5rem 0.625rem;
      outline: none;
      font-family: monospace;
      min-width: 0;
    }
    .key-input-wrap input::placeholder {
      color: var(--color-text-dim);
      font-family: inherit;
    }
    .key-toggle {
      background: none;
      border: none;
      color: var(--color-text-muted);
      padding: 0.375rem 0.625rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }
    .key-toggle:hover { color: var(--color-text); }
    .key-hint {
      font-size: 0.6875rem;
      color: var(--color-text-dim);
    }
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

  // AI Provider state — keys stored per-provider
  providerExpanded = signal(true);
  providerKeys = signal<Record<string, string>>({});
  visibleKeys = signal<Set<string>>(new Set());

  configuredCount = computed(() =>
    Object.values(this.providerKeys()).filter(k => k.length > 0).length
  );

  providers = [
    { value: 'anthropic', label: 'Anthropic', model: 'Claude Sonnet 4', placeholder: 'sk-ant-...', hint: 'console.anthropic.com' },
    { value: 'openai', label: 'OpenAI', model: 'GPT-4o', placeholder: 'sk-...', hint: 'platform.openai.com' },
    { value: 'gemini', label: 'Google Gemini', model: 'Gemini 2.0 Flash', placeholder: 'AIza...', hint: 'aistudio.google.com' },
  ];

  constructor(
    private api: ApiService,
    private authService: AuthService,
    private notifications: NotificationService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.api.getPlaystyles(this.gameId).subscribe({
      next: (playstyles) => this.playstyles.set(playstyles),
      error: () => {},
    });

    // Restore saved keys from localStorage
    try {
      const saved = localStorage.getItem('llm_keys');
      if (saved) {
        const keys = JSON.parse(saved);
        if (keys && typeof keys === 'object') {
          this.providerKeys.set(keys);
          // Auto-collapse if at least one key is saved
          if (Object.values(keys).some((k: any) => k?.length > 0)) {
            this.providerExpanded.set(false);
          }
        }
      }
    } catch { /* ignore corrupt localStorage */ }
  }

  select(id: number): void {
    this.selectedId.set(id);
  }

  getKey(provider: string): string {
    return this.providerKeys()[provider] || '';
  }

  onKeyInput(provider: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    const updated = { ...this.providerKeys(), [provider]: value };
    this.providerKeys.set(updated);
    // Persist — only store non-empty keys
    const toSave: Record<string, string> = {};
    for (const [k, v] of Object.entries(updated)) {
      if (v) toSave[k] = v;
    }
    localStorage.setItem('llm_keys', JSON.stringify(toSave));
  }

  isKeyVisible(provider: string): boolean {
    return this.visibleKeys().has(provider);
  }

  toggleKeyVisibility(provider: string): void {
    const current = new Set(this.visibleKeys());
    if (current.has(provider)) {
      current.delete(provider);
    } else {
      current.add(provider);
    }
    this.visibleKeys.set(current);
  }

  generate(): void {
    const playstyleId = this.selectedId();
    if (!playstyleId) return;

    if (this.configuredCount() === 0) {
      this.notifications.info('Enter at least one AI provider API key');
      this.providerExpanded.set(true);
      return;
    }

    if (!this.authService.isLoggedIn()) {
      this.notifications.info('Create an account to generate your modlist');
      this.router.navigate(['/auth/register'], {
        queryParams: { returnUrl: '/setup' },
      });
      return;
    }

    // Build credentials list from all configured providers (in display order)
    const credentials = this.providers
      .filter(p => this.getKey(p.value).length > 0)
      .map(p => ({ provider: p.value, api_key: this.getKey(p.value) }));

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
        available_storage_gb: this.getMaxFreeStorageGb(),
        llm_credentials: credentials,
      })
      .subscribe({
        next: (modlist) => {
          this.loading.set(false);
          if (modlist.used_fallback && modlist.generation_error) {
            this.notifications.warning(
              `AI generation failed: ${modlist.generation_error}. Showing curated fallback list.`
            );
          } else if (modlist.used_fallback) {
            this.notifications.warning(
              'AI generation returned no results. Showing curated fallback list.'
            );
          }
          this.router.navigate(['/modlist', modlist.id]);
        },
        error: (err) => {
          this.loading.set(false);
          // The error interceptor already shows a toast, but add context if missing
          if (!err?.error?.detail && err?.status !== 0) {
            this.notifications.error('Modlist generation failed. Check your API keys and try again.');
          }
        },
      });
  }

  private getMaxFreeStorageGb(): number | undefined {
    const drives = this.specs.storage_drives;
    if (!drives) return undefined;
    const matches = drives.match(/(\d+)\s*GB\s*free/gi);
    if (!matches?.length) return undefined;
    return Math.max(...matches.map(m => parseInt(m)));
  }
}
