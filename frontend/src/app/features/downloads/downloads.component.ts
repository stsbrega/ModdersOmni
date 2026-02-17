import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';
import { DownloadStatus } from '../../shared/models/mod.model';

@Component({
  selector: 'app-downloads',
  standalone: true,
  template: `
    <div class="downloads-page">
      <div class="page-header">
        <h1>Downloads</h1>
        @if (isLive()) {
          <span class="live-badge">LIVE</span>
        }
      </div>

      @if (!modlistId) {
        <div class="empty-state">
          <p>No active downloads.</p>
          <p class="text-muted">Start a download from your modlist page.</p>
        </div>
      } @else {
        <!-- Stats Bar -->
        <div class="stats-bar">
          <div class="stat">
            <span class="stat-value">{{ completedCount() }}</span>
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
        <div class="overall-progress">
          <div class="progress-header">
            <span>Overall Progress</span>
            <span>{{ overallPercent() }}%</span>
          </div>
          <div class="progress-bar-track">
            <div
              class="progress-bar-fill"
              [style.width.%]="overallPercent()"
            ></div>
          </div>
        </div>

        <!-- Download Items -->
        <div class="download-list">
          @for (item of downloads(); track item.mod_id) {
            <div class="download-item" [class]="'status-bg-' + item.status">
              <div class="item-info">
                <span class="item-name">{{ item.name }}</span>
                <span class="item-status" [class]="'status-text-' + item.status">
                  {{ item.status }}
                </span>
              </div>
              @if (item.status === 'downloading') {
                <div class="item-progress">
                  <div class="progress-bar-track small">
                    <div
                      class="progress-bar-fill"
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
            <div class="spinner"></div>
            <p>Waiting for download status...</p>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .downloads-page { max-width: 800px; margin: 0 auto; padding: 2rem; }

    .page-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 2rem;
    }
    h1 { font-size: 1.75rem; font-weight: 700; margin: 0; }

    .live-badge {
      background: #dc2626;
      color: white;
      font-size: 0.625rem;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      letter-spacing: 0.05em;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }

    .stats-bar {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .stat {
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: 1rem;
      text-align: center;
    }
    .stat-value {
      display: block;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-accent-green);
    }
    .stat-value.downloading { color: #60a5fa; }
    .stat-value.failed { color: #f87171; }
    .stat-value.pending { color: #fbbf24; }
    .stat-label {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .overall-progress {
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1.5rem;
    }
    .progress-header {
      display: flex;
      justify-content: space-between;
      font-size: 0.875rem;
      margin-bottom: 0.5rem;
    }
    .progress-bar-track {
      width: 100%;
      height: 8px;
      background: var(--color-bg-elevated);
      border-radius: 4px;
      overflow: hidden;
    }
    .progress-bar-track.small { height: 4px; }
    .progress-bar-fill {
      height: 100%;
      background: var(--color-primary);
      border-radius: 4px;
      transition: width 0.3s ease;
    }

    .download-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .download-item {
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: 0.875rem 1rem;
    }
    .item-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .item-name { font-size: 0.875rem; font-weight: 500; }
    .item-status {
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      padding: 0.15rem 0.4rem;
      border-radius: 3px;
    }
    .status-text-pending { background: #78350f; color: #fcd34d; }
    .status-text-downloading { background: #1e3a5f; color: #60a5fa; }
    .status-text-complete { background: #14532d; color: #86efac; }
    .status-text-failed { background: #7f1d1d; color: #fca5a5; }

    .item-progress {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-top: 0.5rem;
    }
    .item-progress .progress-bar-track { flex: 1; }
    .progress-label { font-size: 0.75rem; color: var(--color-text-muted); min-width: 3rem; text-align: right; }

    .item-error {
      font-size: 0.75rem;
      color: #f87171;
      margin: 0.375rem 0 0;
    }

    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      color: var(--color-text-muted);
    }
    .text-muted { color: var(--color-text-muted); font-size: 0.875rem; margin-top: 0.5rem; }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--color-bg-elevated);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 1rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
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

  constructor(
    private route: ActivatedRoute,
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
