import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

interface DashboardMod {
  id: number;
  name: string;
  category: string;
  enabled: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  animations: [
    trigger('fadeUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(16px)' }),
        animate('400ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
    trigger('staggerCards', [
      transition(':enter', [
        query('.stat-card', [
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
          <a routerLink="/browse" class="sidebar-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <span>Browse Mods</span>
          </a>
          <a class="sidebar-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            <span>My Modlist</span>
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
            <p class="welcome-sub">Your modding workspace at a glance</p>
          </div>
          <a routerLink="/setup" class="btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Build
          </a>
        </div>

        <!-- Stats -->
        <div class="stats-row" @staggerCards>
          <div class="stat-card">
            <div class="stat-icon stat-icon--gold">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
                <line x1="7" y1="7" x2="7.01" y2="7"/>
              </svg>
            </div>
            <div class="stat-value">47</div>
            <div class="stat-label">Total Mods</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon stat-icon--blue">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="4" y="4" width="16" height="16" rx="2"/>
                <path d="M9 9h6v6H9z"/>
              </svg>
            </div>
            <div class="stat-value">6.2 GB</div>
            <div class="stat-label">Est. VRAM Usage</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon stat-icon--green">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div class="stat-value">96%</div>
            <div class="stat-label">Compatibility Score</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon stat-icon--muted">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div class="stat-value">2h ago</div>
            <div class="stat-label">Last Updated</div>
          </div>
        </div>

        <!-- Content Grid -->
        <div class="content-grid" @fadeUp>
          <!-- Active Modlist -->
          <section class="panel modlist-panel">
            <div class="panel-header">
              <h2>Your Active Modlist</h2>
              <span class="panel-badge">Skyrim SE</span>
            </div>
            <div class="mod-list">
              @for (mod of mods(); track mod.id) {
                <div class="mod-row">
                  <div class="mod-info">
                    <span class="mod-name">{{ mod.name }}</span>
                    <span class="mod-cat" [class]="'cat-' + mod.category.toLowerCase()">{{ mod.category }}</span>
                  </div>
                  <button
                    class="toggle"
                    [class.on]="mod.enabled"
                    (click)="toggleMod(mod.id)"
                    [attr.aria-label]="'Toggle ' + mod.name"
                  >
                    <span class="toggle-knob"></span>
                  </button>
                </div>
              }
            </div>
            <a routerLink="/browse" class="panel-link">
              View all mods
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
          </section>

          <!-- AI Recommendations -->
          <section class="panel ai-panel">
            <div class="panel-header">
              <h2>AI Recommendations</h2>
            </div>
            <div class="ai-content">
              <div class="ai-insight">
                <div class="ai-insight-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
                <p>Based on your hardware tier, consider switching to <strong>2K textures</strong> for better VRAM headroom with your current ENB setup.</p>
              </div>
              <div class="ai-insight">
                <div class="ai-insight-icon warn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                </div>
                <p><strong>Potential conflict:</strong> USSEP 4.2.8 and Alternate Start may need a compatibility patch for the latest game version.</p>
              </div>
              <div class="ai-suggestion">
                <h4>Suggested Additions</h4>
                <div class="suggestion-list">
                  <div class="suggestion-item">
                    <span>SkyUI 5.2</span>
                    <span class="suggestion-cat">UI</span>
                  </div>
                  <div class="suggestion-item">
                    <span>Immersive Citizens</span>
                    <span class="suggestion-cat">Gameplay</span>
                  </div>
                  <div class="suggestion-item">
                    <span>Static Mesh Improvement</span>
                    <span class="suggestion-cat">Visuals</span>
                  </div>
                </div>
              </div>
            </div>
            <button class="btn-secondary btn-secondary--full" (click)="regenerate()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              Regenerate Suggestions
            </button>
          </section>
        </div>
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

    /* Stats */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 1.25rem;
      transition: border-color 0.25s, transform 0.25s var(--ease-out), box-shadow 0.25s;
      position: relative;
      overflow: hidden;
    }
    .stat-card::after {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.02) 0%, transparent 70%);
      opacity: 0;
      transition: opacity 0.3s;
      pointer-events: none;
    }
    .stat-card:hover {
      border-color: var(--color-border-hover);
      transform: translateY(-2px);
      box-shadow: var(--shadow-card);
    }
    .stat-card:hover::after { opacity: 1; }
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
    .stat-icon--green { background: rgba(34, 197, 94, 0.12); color: #22c55e; }
    .stat-icon--muted { background: rgba(255, 255, 255, 0.05); color: var(--color-text-muted); }
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

    /* Content Grid */
    .content-grid {
      display: grid;
      grid-template-columns: 1fr 340px;
      gap: 1.5rem;
    }

    /* Panels */
    .panel {
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      box-shadow: var(--shadow-card);
    }
    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.25rem;
    }
    .panel-header h2 {
      font-size: 0.9375rem;
      font-weight: 600;
    }
    .panel-badge {
      font-size: 0.6875rem;
      font-weight: 600;
      padding: 0.1875rem 0.625rem;
      border-radius: 100px;
      background: rgba(123, 164, 192, 0.12);
      color: var(--color-blue);
    }

    /* Mod rows */
    .mod-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin-bottom: 1rem;
      max-height: 380px;
      overflow-y: auto;
    }
    .mod-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.625rem 0.75rem;
      border-radius: 6px;
      transition: background 0.12s;
    }
    .mod-row:hover {
      background: rgba(255, 255, 255, 0.025);
    }
    .mod-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-width: 0;
    }
    .mod-name {
      font-size: 0.8125rem;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .mod-cat {
      font-size: 0.6875rem;
      font-weight: 600;
      padding: 0.125rem 0.5rem;
      border-radius: 4px;
      flex-shrink: 0;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .cat-gameplay { background: rgba(192, 160, 96, 0.12); color: var(--color-gold); }
    .cat-visuals { background: rgba(123, 164, 192, 0.12); color: var(--color-blue); }
    .cat-ui { background: rgba(168, 85, 247, 0.12); color: #a855f7; }
    .cat-audio { background: rgba(34, 197, 94, 0.12); color: #22c55e; }
    .cat-textures { background: rgba(239, 68, 68, 0.12); color: #ef4444; }
    .cat-followers { background: rgba(234, 179, 8, 0.12); color: #eab308; }

    /* Toggle */
    .toggle {
      width: 36px;
      height: 20px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.1);
      position: relative;
      flex-shrink: 0;
      transition: background 0.2s;
      cursor: pointer;
      border: none;
      padding: 0;
    }
    .toggle.on {
      background: var(--color-gold);
      box-shadow: 0 0 8px rgba(196, 165, 90, 0.25);
    }
    .toggle-knob {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: white;
      transition: transform 0.25s var(--ease-spring);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }
    .toggle.on .toggle-knob {
      transform: translateX(16px);
    }

    .panel-link {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-gold);
      transition: gap 0.15s;
    }
    .panel-link:hover { gap: 0.625rem; }

    /* AI Panel */
    .ai-content {
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
      margin-bottom: 1.25rem;
    }
    .ai-insight {
      display: flex;
      gap: 0.625rem;
      padding: 0.75rem;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 8px;
      border: 1px solid var(--color-border);
    }
    .ai-insight-icon {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      background: rgba(192, 160, 96, 0.12);
      color: var(--color-gold);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .ai-insight-icon.warn {
      background: rgba(234, 179, 8, 0.12);
      color: #eab308;
    }
    .ai-insight p {
      font-size: 0.8125rem;
      color: var(--color-text-muted);
      line-height: 1.5;
    }
    .ai-insight p strong {
      color: var(--color-text);
      font-weight: 500;
    }
    .ai-suggestion h4 {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 0.5rem;
    }
    .suggestion-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .suggestion-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.375rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8125rem;
    }
    .suggestion-item:hover { background: rgba(255, 255, 255, 0.025); }
    .suggestion-cat {
      font-size: 0.6875rem;
      color: var(--color-text-dim);
      font-weight: 500;
    }

    .btn-secondary--full {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      background: transparent;
      border: 1px solid var(--color-border);
      color: var(--color-text-muted);
      padding: 0.625rem;
      border-radius: 8px;
      font-size: 0.8125rem;
      font-weight: 500;
      transition: color 0.15s, border-color 0.15s, background 0.15s;
    }
    .btn-secondary--full:hover {
      color: var(--color-text);
      border-color: var(--color-border-hover);
      background: rgba(255, 255, 255, 0.025);
    }

    @media (max-width: 1024px) {
      .sidebar { display: none; }
      .content-grid { grid-template-columns: 1fr; }
      .stats-row { grid-template-columns: repeat(2, 1fr); }
    }
  `],
})
export class DashboardComponent {
  mods = signal<DashboardMod[]>([
    { id: 1, name: 'Unofficial Skyrim Special Edition Patch', category: 'Gameplay', enabled: true },
    { id: 2, name: 'SkyUI', category: 'UI', enabled: true },
    { id: 3, name: 'Skyrim Script Extender (SKSE64)', category: 'Gameplay', enabled: true },
    { id: 4, name: 'ENBSeries v0.492', category: 'Visuals', enabled: true },
    { id: 5, name: 'Realistic Water Two', category: 'Visuals', enabled: true },
    { id: 6, name: 'Static Mesh Improvement Mod', category: 'Textures', enabled: true },
    { id: 7, name: 'Immersive Citizens - AI Overhaul', category: 'Gameplay', enabled: false },
    { id: 8, name: 'Ordinator - Perks of Skyrim', category: 'Gameplay', enabled: true },
    { id: 9, name: 'Sounds of Skyrim Complete', category: 'Audio', enabled: true },
    { id: 10, name: 'Inigo Follower Mod', category: 'Followers', enabled: true },
  ]);

  toggleMod(id: number): void {
    this.mods.update(mods =>
      mods.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m)
    );
  }

  regenerate(): void {
    // Placeholder for AI regeneration
  }
}
