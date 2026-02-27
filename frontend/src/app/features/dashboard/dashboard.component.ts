import { Component, OnInit, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { ApiService } from '../../core/services/api.service';
import { Modlist } from '../../shared/models/mod.model';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe],
  animations: [
    trigger('fadeUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(16px)' }),
        animate('400ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
    trigger('staggerCards', [
      transition(':enter', [
        query('.modlist-card, .stat-card', [
          style({ opacity: 0, transform: 'translateY(12px)' }),
          stagger(80, [
            animate('350ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 1, transform: 'translateY(0)' })),
          ]),
        ], { optional: true }),
      ]),
    ]),
  ],
  template: `
    <div class="dashboard-layout">
      <!-- Sidebar -->
      <aside class="sidebar">
        <nav class="sidebar-nav">
          <a routerLink="/dashboard" class="sidebar-item active">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
            <span>Dashboard</span>
          </a>
          <a routerLink="/settings" class="sidebar-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
            <span>Settings</span>
          </a>
        </nav>
      </aside>

      <!-- Main Content -->
      <main class="dashboard-main">
        <!-- Welcome -->
        <div class="welcome" @fadeUp>
          <div>
            <h1 class="welcome-title">Welcome back</h1>
            <p class="welcome-sub">Your generated modlists</p>
          </div>
          <a routerLink="/setup" class="btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Build
          </a>
        </div>

        @if (loading()) {
          <div class="loading-state">
            <span class="load-spinner"></span>
            <p>Loading your modlists...</p>
          </div>
        } @else if (modlists().length === 0) {
          <div class="empty-state" @fadeUp>
            <div class="empty-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
              </svg>
            </div>
            <h2>No modlists yet</h2>
            <p>Generate your first AI-powered modlist by clicking New Build above.</p>
            <a routerLink="/setup" class="btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Forge New Loadout
            </a>
          </div>
        } @else {
          <!-- Stats -->
          <div class="stats-row" @staggerCards>
            <div class="stat-card">
              <div class="stat-icon stat-icon--gold">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
                  <rect x="9" y="3" width="6" height="4" rx="1"/>
                </svg>
              </div>
              <div class="stat-value">{{ modlists().length }}</div>
              <div class="stat-label">Modlists Generated</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon stat-icon--blue">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
                  <line x1="7" y1="7" x2="7.01" y2="7"/>
                </svg>
              </div>
              <div class="stat-value">{{ totalMods() }}</div>
              <div class="stat-label">Total Mods</div>
            </div>
          </div>

          <!-- Modlist cards -->
          <div class="modlist-grid" @staggerCards>
            @for (ml of modlists(); track ml.id) {
              <a [routerLink]="['/modlist', ml.id]" class="modlist-card">
                <div class="card-top">
                  <div class="card-meta">
                    <span class="card-game">Game {{ ml.game_id }}</span>
                    @if (ml.llm_provider && ml.llm_provider !== 'fallback') {
                      <span class="card-provider">{{ ml.llm_provider }}</span>
                    }
                    @if (ml.used_fallback) {
                      <span class="card-fallback">Fallback</span>
                    }
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="card-arrow">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </div>
                <div class="card-stats">
                  <span class="card-mod-count">{{ coreModCount(ml) }} mods</span>
                  @if (patchModCount(ml) > 0) {
                    <span class="card-patch-count">+ {{ patchModCount(ml) }} patches</span>
                  }
                </div>
                @if (ml.created_at) {
                  <span class="card-date">{{ ml.created_at | date:'MMM d, y' }}</span>
                }
              </a>
            }
          </div>
        }
      </main>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .dashboard-layout {
      display: flex;
      min-height: calc(100vh - var(--header-height));
    }

    /* ===== Sidebar ===== */
    .sidebar {
      width: 220px;
      border-right: 1px solid var(--color-border);
      padding: 1.5rem 0;
      flex-shrink: 0;
    }
    .sidebar-nav {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 0 0.75rem;
    }
    .sidebar-item {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: 0.5rem 0.75rem;
      border-radius: 8px;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-text-muted);
      transition: color 0.15s, background 0.15s;
      cursor: pointer;
    }
    .sidebar-item:hover {
      color: var(--color-text);
      background: rgba(255, 255, 255, 0.04);
    }
    .sidebar-item.active {
      color: var(--color-gold);
      background: rgba(196, 165, 90, 0.08);
    }

    /* ===== Main ===== */
    .dashboard-main {
      flex: 1;
      padding: 2rem 2.5rem;
      max-width: 1000px;
    }

    /* Welcome */
    .welcome {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 2rem;
    }
    .welcome-title {
      font-size: 1.5rem;
      font-weight: 600;
      letter-spacing: -0.01em;
    }
    .welcome-sub {
      font-size: 0.875rem;
      color: var(--color-text-muted);
      margin-top: 0.25rem;
    }
    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--color-gold);
      color: #0D0D0F;
      padding: 0.5rem 1.25rem;
      border-radius: 8px;
      font-size: 0.8125rem;
      font-weight: 600;
      transition: background 0.2s, box-shadow 0.3s;
    }
    .btn-primary:hover {
      background: var(--color-gold-hover);
      box-shadow: var(--shadow-gold);
      transform: translateY(-1px);
    }
    .btn-primary:active { transform: translateY(0); }

    /* Loading */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 5rem 2rem;
      gap: 1rem;
      color: var(--color-text-muted);
    }
    .load-spinner {
      width: 28px;
      height: 28px;
      border: 2px solid var(--color-border);
      border-top-color: var(--color-gold);
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Empty state */
    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
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
    .empty-state h2 {
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }
    .empty-state p {
      font-size: 0.875rem;
      color: var(--color-text-muted);
      margin-bottom: 1.5rem;
    }

    /* Stats */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 1.25rem;
      transition: border-color 0.25s, transform 0.25s var(--ease-out), box-shadow 0.25s;
    }
    .stat-card:hover {
      border-color: var(--color-border-hover);
      transform: translateY(-2px);
      box-shadow: var(--shadow-card);
    }
    .stat-icon {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 0.875rem;
    }
    .stat-icon--gold { background: rgba(192, 160, 96, 0.12); color: var(--color-gold); }
    .stat-icon--blue { background: rgba(123, 164, 192, 0.12); color: var(--color-blue); }
    .stat-value {
      font-size: 1.375rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 0.125rem;
      font-variant-numeric: tabular-nums;
    }
    .stat-label {
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }

    /* Modlist grid */
    .modlist-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
    }
    .modlist-card {
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 1.25rem;
      transition: border-color 0.2s, box-shadow 0.25s, transform 0.2s var(--ease-out);
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      cursor: pointer;
    }
    .modlist-card:hover {
      border-color: rgba(196, 165, 90, 0.2);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(196, 165, 90, 0.06);
      transform: translateY(-2px);
    }
    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .card-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
    }
    .card-game {
      font-size: 0.6875rem;
      font-weight: 600;
      padding: 0.1875rem 0.625rem;
      border-radius: 100px;
      background: rgba(123, 164, 192, 0.12);
      color: var(--color-blue);
    }
    .card-provider {
      font-size: 0.6875rem;
      font-weight: 600;
      padding: 0.1875rem 0.625rem;
      border-radius: 100px;
      background: rgba(192, 160, 96, 0.12);
      color: var(--color-gold);
    }
    .card-fallback {
      font-size: 0.6875rem;
      font-weight: 600;
      padding: 0.1875rem 0.625rem;
      border-radius: 100px;
      background: rgba(234, 179, 8, 0.12);
      color: var(--color-warning);
    }
    .card-arrow {
      color: var(--color-text-dim);
      transition: color 0.15s, transform 0.15s;
      flex-shrink: 0;
    }
    .modlist-card:hover .card-arrow {
      color: var(--color-gold);
      transform: translateX(2px);
    }
    .card-stats {
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
    }
    .card-mod-count {
      font-size: 1.125rem;
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    .card-patch-count {
      font-size: 0.8125rem;
      color: var(--color-text-muted);
    }
    .card-date {
      font-size: 0.75rem;
      color: var(--color-text-dim);
    }

    @media (max-width: 1024px) {
      .sidebar { display: none; }
    }
    @media (max-width: 640px) {
      .stats-row { grid-template-columns: 1fr; }
      .modlist-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class DashboardComponent implements OnInit {
  modlists = signal<Modlist[]>([]);
  loading = signal(true);

  totalMods = computed(() =>
    this.modlists().reduce((sum, ml) => sum + ml.entries.length, 0)
  );

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.getMyModlists().subscribe({
      next: (modlists) => {
        this.modlists.set(modlists);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  coreModCount(ml: Modlist): number {
    return ml.entries.filter(e => !e.is_patch).length;
  }

  patchModCount(ml: Modlist): number {
    return ml.entries.filter(e => e.is_patch).length;
  }
}
