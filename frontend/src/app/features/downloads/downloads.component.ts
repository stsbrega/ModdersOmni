import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';
import { DownloadStatus } from '../../shared/models/mod.model';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

@Component({
  selector: 'app-downloads',
  standalone: true,
  animations: [
    trigger('fadeUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(12px)' }),
        animate('350ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
    trigger('staggerItems', [
      transition(':enter', [
        query('.download-item', [
          style({ opacity: 0, transform: 'translateY(8px)' }),
          stagger(40, [
            animate('300ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 1, transform: 'translateY(0)' })),
          ]),
        ], { optional: true }),
      ]),
    ]),
  ],
  template: `
    <div class="downloads-page">
      <div class="page-header" @fadeUp>
        <div>
          <span class="page-label">Deployment</span>
          <h1>Download Status</h1>
        </div>
        @if (isLive()) {
          <span class="live-badge">
            <span class="live-dot"></span>
            Live
          </span>
        }
      </div>

      @if (!modlistId) {
        <div class="empty-state" @fadeUp>
          <div class="empty-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
          </div>
          <p>No active deployments.</p>
          <p class="empty-hint">Start a deployment from your loadout page.</p>
        </div>
      } @else {
        <!-- Stats Bar -->
        <div class="stats-bar" @fadeUp>
          <div class="stat">
            <span class="stat-value complete">{{ completedCount() }}</span>
            <span class="stat-label">Complete</span>
          </div>
          <div class="stat">
            <span class="stat-value downloading">{{ downloadingCount() }}</span>
            <span class="stat-label">Downloading</span>
          </div>
          <div class="stat">
            <span class="stat-value failed">{{ failedCount() }}</span>
            <span class="stat-label">Failed</span>
          </div>
          <div class="stat">
            <span class="stat-value pending">{{ pendingCount() }}</span>
            <span class="stat-label">Pending</span>
          </div>
        </div>

        <!-- Overall Progress -->
        <div class="overall-progress" @fadeUp>
          <div class="progress-header">
            <span>Overall Progress</span>
            <span class="progress-pct">{{ overallPercent() }}%</span>
          </div>
          <div class="progress-track">
            <div
              class="progress-fill"
              [style.width.%]="overallPercent()"
            ></div>
          </div>
        </div>

        <!-- Download Items -->
        <div class="download-list" @staggerItems>
          @for (item of downloads(); track item.mod_id) {
            <div class="download-item" [class]="'item-' + item.status">
              <div class="item-info">
                <span class="item-name">{{ item.name }}</span>
                <span class="item-status" [class]="'badge-' + item.status">
                  {{ item.status }}
                </span>
              </div>
              @if (item.status === 'downloading') {
                <div class="item-progress">
                  <div class="progress-track small">
                    <div
                      class="progress-fill"
                      [style.width.%]="item.progress"
                    ></div>
                  </div>
                  <span class="progress-label">{{ item.progress }}%</span>
                </div>
              }
              @if (item.status === 'failed' && item.error) {
                <p class="item-error">{{ item.error }}</p>
              }
            </div>
          }
        </div>

        @if (downloads().length === 0) {
          <div class="empty-state">
            <span class="load-spinner"></span>
            <p>Waiting for deployment status...</p>
          </div>
        }

        @if (allDownloadsComplete()) {
          <div class="completion-footer" @fadeUp>
            <div class="completion-msg">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Deployment complete
            </div>
            <button class="btn-primary" (click)="returnToLoadout()">
              Return to Loadout
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .downloads-page {
      max-width: 800px;
      margin: 0 auto;
      padding: 2.5rem 2rem;
    }

    /* Header */
    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 2rem;
    }
    .page-label {
      display: inline-block;
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--color-gold);
      margin-bottom: 0.375rem;
    }
    h1 {
      font-family: var(--font-display);
      font-size: 1.75rem;
      font-weight: 500;
      letter-spacing: -0.01em;
      margin: 0;
    }
    .live-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      background: rgba(239, 68, 68, 0.12);
      color: var(--color-error);
      border: 1px solid rgba(239, 68, 68, 0.25);
      font-size: 0.6875rem;
      font-weight: 600;
      padding: 0.3rem 0.75rem;
      border-radius: 100px;
      letter-spacing: 0.03em;
    }
    .live-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--color-error);
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    /* Stats */
    .stats-bar {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }
    .stat {
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: 10px;
      padding: 1rem;
      text-align: center;
      transition: border-color 0.15s;
    }
    .stat:hover {
      border-color: var(--color-border-hover);
    }
    .stat-value {
      display: block;
      font-size: 1.5rem;
      font-weight: 700;
    }
    .stat-value.complete { color: var(--color-success); }
    .stat-value.downloading { color: var(--color-blue); }
    .stat-value.failed { color: var(--color-error); }
    .stat-value.pending { color: var(--color-warning); }
    .stat-label {
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--color-text-dim);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-top: 0.25rem;
      display: block;
    }

    /* Progress */
    .overall-progress {
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: 10px;
      padding: 1rem 1.25rem;
      margin-bottom: 1.5rem;
    }
    .progress-header {
      display: flex;
      justify-content: space-between;
      font-size: 0.8125rem;
      font-weight: 500;
      margin-bottom: 0.625rem;
      color: var(--color-text-muted);
    }
    .progress-pct {
      color: var(--color-gold);
      font-weight: 600;
    }
    .progress-track {
      width: 100%;
      height: 6px;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 3px;
      overflow: hidden;
    }
    .progress-track.small { height: 4px; }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--color-gold), var(--color-blue));
      border-radius: 3px;
      transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }

    /* Download list */
    .download-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .download-item {
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: 10px;
      padding: 0.875rem 1.125rem;
      transition: border-color 0.15s;
    }
    .download-item:hover {
      border-color: var(--color-border-hover);
    }
    .item-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .item-name {
      font-size: 0.875rem;
      font-weight: 500;
    }
    .item-status {
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 0.175rem 0.5rem;
      border-radius: 100px;
    }
    .badge-pending {
      background: rgba(234, 179, 8, 0.12);
      color: var(--color-warning);
      border: 1px solid rgba(234, 179, 8, 0.2);
    }
    .badge-downloading {
      background: rgba(123, 164, 192, 0.12);
      color: var(--color-blue);
      border: 1px solid rgba(123, 164, 192, 0.2);
    }
    .badge-complete {
      background: rgba(34, 197, 94, 0.12);
      color: var(--color-success);
      border: 1px solid rgba(34, 197, 94, 0.2);
    }
    .badge-failed {
      background: rgba(239, 68, 68, 0.12);
      color: var(--color-error);
      border: 1px solid rgba(239, 68, 68, 0.2);
    }

    .item-progress {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-top: 0.5rem;
    }
    .item-progress .progress-track { flex: 1; }
    .progress-label {
      font-size: 0.75rem;
      color: var(--color-text-dim);
      min-width: 2.5rem;
      text-align: right;
      font-weight: 500;
    }
    .item-error {
      font-size: 0.75rem;
      color: var(--color-error);
      margin: 0.375rem 0 0;
    }

    /* Empty state */
    .empty-state {
      text-align: center;
      padding: 5rem 2rem;
      color: var(--color-text-muted);
    }
    .empty-icon {
      width: 56px;
      height: 56px;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--color-border);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.25rem;
      color: var(--color-text-dim);
    }
    .empty-state p {
      margin-bottom: 0.5rem;
      font-size: 0.9375rem;
    }
    .empty-hint {
      font-size: 0.8125rem;
      color: var(--color-text-dim);
    }
    .load-spinner {
      display: block;
      width: 24px;
      height: 24px;
      border: 2px solid var(--color-border);
      border-top-color: var(--color-gold);
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      margin: 0 auto 1rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Completion */
    .completion-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 2rem;
      padding: 1.25rem 1.5rem;
      background: var(--color-bg-card);
      border: 1px solid rgba(34, 197, 94, 0.2);
      border-radius: 10px;
    }
    .completion-msg {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--color-success);
    }
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
  `],
})
export class DownloadsComponent implements OnInit, OnDestroy {
  modlistId: string | null = null;
  downloads = signal<DownloadStatus[]>([]);
  isLive = signal(false);

  private ws: WebSocket | null = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  completedCount = computed(() => this.downloads().filter(d => d.status === 'complete').length);
  downloadingCount = computed(() => this.downloads().filter(d => d.status === 'downloading').length);
  failedCount = computed(() => this.downloads().filter(d => d.status === 'failed').length);
  pendingCount = computed(() => this.downloads().filter(d => d.status === 'pending').length);

  overallPercent = computed(() => {
    const items = this.downloads();
    if (items.length === 0) return 0;
    const total = items.reduce((sum, d) => sum + d.progress, 0);
    return Math.round(total / items.length);
  });

  allDownloadsComplete = computed(() => {
    const items = this.downloads();
    return items.length > 0 && items.every(s => s.status === 'complete' || s.status === 'failed');
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private notifications: NotificationService,
  ) {}

  ngOnInit(): void {
    this.modlistId = this.route.snapshot.queryParamMap.get('modlist');
    if (!this.modlistId) return;

    this.connectWebSocket();
    this.fetchStatus();
  }

  ngOnDestroy(): void {
    this.ws?.close();
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  returnToLoadout(): void {
    if (this.modlistId) {
      this.router.navigate(['/modlist', this.modlistId]);
    }
  }

  private connectWebSocket(): void {
    if (!this.modlistId) return;

    try {
      this.ws = new WebSocket(`ws://localhost:8000/api/downloads/${this.modlistId}/ws`);

      this.ws.onopen = () => {
        this.isLive.set(true);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (Array.isArray(data)) {
            this.downloads.set(data);
          }
        } catch {
          // Ignore malformed messages
        }
      };

      this.ws.onclose = () => {
        this.isLive.set(false);
        this.startPolling();
      };

      this.ws.onerror = () => {
        this.isLive.set(false);
        this.ws?.close();
        this.startPolling();
      };
    } catch {
      this.startPolling();
    }
  }

  private startPolling(): void {
    if (this.pollInterval) return;

    this.pollInterval = setInterval(() => {
      this.fetchStatus();
    }, 2000);
  }

  private fetchStatus(): void {
    if (!this.modlistId) return;

    this.api.getDownloadStatus(this.modlistId).subscribe({
      next: (statuses) => {
        this.downloads.set(statuses);

        // Stop polling once all done
        const allDone = statuses.every(s => s.status === 'complete' || s.status === 'failed');
        if (allDone && statuses.length > 0 && this.pollInterval) {
          clearInterval(this.pollInterval);
          this.pollInterval = null;
        }
      },
      error: () => {},
    });
  }
}
