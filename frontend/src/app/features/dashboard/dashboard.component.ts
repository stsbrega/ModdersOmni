import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { Game } from '../../shared/models/game.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, NgClass],
  template: `
    <div class="dashboard">
      <section class="hero">
        <h1>FORGE YOUR PERFECT MODLIST</h1>
        <p>AI-powered modlist builder for Skyrim and Fallout</p>
        <a routerLink="/setup" class="btn-primary">Begin Setup</a>
      </section>

      <section class="games-section">
        <h2>Supported Games</h2>
        <div class="games-grid">
          @for (game of games(); track game.id) {
            <div class="game-card" [ngClass]="getGameCardClass(game.name)">
              <div class="game-content">
                <h3>{{ game.name }}</h3>
                @if (game.versions && game.versions.length > 0) {
                  <div class="version-badges">
                    @for (version of game.versions; track version) {
                      <span class="version-badge">{{ version }}</span>
                    }
                  </div>
                }
                <a [routerLink]="['/setup']" [queryParams]="{ game: game.id }" class="btn-secondary">
                  Forge Modlist
                </a>
              </div>
            </div>
          }
          @if (games().length === 0) {
            <div class="game-card game-card-skyrim">
              <div class="game-content">
                <h3>Skyrim Special Edition</h3>
                <div class="version-badges">
                  <span class="version-badge">SE</span>
                  <span class="version-badge">AE</span>
                </div>
                <a routerLink="/setup" queryParamsHandling="merge" class="btn-secondary">
                  Forge Modlist
                </a>
              </div>
            </div>
            <div class="game-card game-card-fallout">
              <div class="game-content">
                <h3>Fallout 4</h3>
                <div class="version-badges">
                  <span class="version-badge">Standard</span>
                  <span class="version-badge">Next-Gen</span>
                </div>
                <a routerLink="/setup" queryParamsHandling="merge" class="btn-secondary">
                  Forge Modlist
                </a>
              </div>
            </div>
          }
        </div>
      </section>

      <section class="features-section">
        <h2>How It Works</h2>
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <h3>Paste Your Specs</h3>
            <p>Copy your hardware info from NVIDIA App or system settings and paste it in.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="1"/><path d="M12 7v10M7 12h10"/>
              </svg>
            </div>
            <h3>Pick Your Playstyle</h3>
            <p>Choose from popular playstyles like Survival, Combat Overhaul, or Visual Enhancement.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 5h16v8H4z"/>
              </svg>
            </div>
            <h3>Get Your Modlist</h3>
            <p>AI generates a stable, compatible modlist tailored to your hardware and preferences.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2v20M2 12h20M19 5l-7 7-7-7M5 19l7-7 7 7"/>
              </svg>
            </div>
            <h3>Download & Play</h3>
            <p>One-click download all mods directly from Nexus Mods with automatic load order.</p>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .dashboard { max-width: 1024px; margin: 0 auto; padding: 2rem; }
    .hero {
      text-align: center;
      padding: 4rem 2rem;
    }
    .hero h1 {
      font-size: 3rem;
      font-weight: 700;
      margin-bottom: 1rem;
      font-family: var(--font-heading);
      letter-spacing: 0.05em;
    }
    .hero p {
      color: var(--color-text-muted);
      font-size: 1.125rem;
      margin-bottom: 2rem;
    }
    .btn-primary {
      display: inline-block;
      background: var(--color-primary);
      color: white;
      padding: 0.75rem 2rem;
      border-radius: 8px;
      font-weight: 600;
      text-decoration: none;
      transition: background 0.2s;
    }
    .btn-primary:hover { background: var(--color-primary-hover); }
    .btn-secondary {
      display: inline-block;
      border: 1px solid var(--color-border);
      color: var(--color-text);
      padding: 0.5rem 1.5rem;
      border-radius: 8px;
      font-weight: 500;
      text-decoration: none;
      transition: background 0.2s;
    }
    .btn-secondary:hover { background: var(--color-bg-elevated); }

    .games-section, .features-section {
      margin-top: 3rem;
    }
    .games-section h2, .features-section h2 {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 1.5rem;
      font-family: var(--font-heading);
    }
    .games-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }
    .game-card {
      background: linear-gradient(135deg, #0c1a2e 0%, #1a2a42 50%, #0c1524 100%);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      padding: 2rem;
      text-align: center;
      min-height: 200px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .game-card-skyrim {
      background: linear-gradient(135deg, #0c1a2e 0%, #1a2a42 50%, #0c1524 100%);
    }
    .game-card-fallout {
      background: linear-gradient(135deg, #0c1a0c 0%, #1a3a1a 50%, #0c140c 100%);
    }
    .game-content {
      width: 100%;
    }
    .game-card h3 {
      margin-bottom: 1rem;
      font-size: 1.5rem;
      font-family: var(--font-heading);
    }
    .version-badges {
      display: flex;
      gap: 0.5rem;
      justify-content: center;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
    }
    .version-badge {
      display: inline-block;
      background: var(--color-primary);
      color: white;
      padding: 0.375rem 0.875rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .text-muted { color: var(--color-text-muted); font-size: 0.875rem; }

    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 1.5rem;
    }
    .feature-card {
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      padding: 1.5rem;
    }
    .feature-icon {
      width: 48px;
      height: 48px;
      background: var(--color-accent);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;
      color: white;
      flex-shrink: 0;
    }
    .feature-icon svg {
      width: 24px;
      height: 24px;
    }
    .feature-card h3 { font-size: 1rem; margin-bottom: 0.5rem; font-family: var(--font-heading); }
    .feature-card p { color: var(--color-text-muted); font-size: 0.875rem; line-height: 1.5; }
  `],
})
export class DashboardComponent implements OnInit {
  games = signal<Game[]>([]);

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.getGames().subscribe({
      next: (games) => this.games.set(games),
      error: () => {}, // Backend not running yet - show placeholders
    });
  }

  getGameCardClass(gameName: string): string {
    if (gameName.toLowerCase().includes('skyrim')) {
      return 'game-card-skyrim';
    } else if (gameName.toLowerCase().includes('fallout')) {
      return 'game-card-fallout';
    }
    return '';
  }
}
