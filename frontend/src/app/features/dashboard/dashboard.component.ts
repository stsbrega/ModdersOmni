import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { Game } from '../../shared/models/game.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="dashboard">
      <section class="hero">
        <h1>Welcome to Modify</h1>
        <p>AI-powered mod manager that builds custom modlists for your hardware and playstyle.</p>
        <a routerLink="/setup" class="btn-primary">Create New Modlist</a>
      </section>

      <section class="games-section">
        <h2>Supported Games</h2>
        <div class="games-grid">
          @for (game of games(); track game.id) {
            <div class="game-card">
              <div class="game-icon">{{ game.name.charAt(0) }}</div>
              <h3>{{ game.name }}</h3>
              <a [routerLink]="['/setup']" [queryParams]="{ game: game.id }" class="btn-secondary">
                Build Modlist
              </a>
            </div>
          }
          @if (games().length === 0) {
            <div class="game-card placeholder">
              <div class="game-icon">S</div>
              <h3>Skyrim Special Edition</h3>
              <p class="text-muted">Coming soon</p>
            </div>
            <div class="game-card placeholder">
              <div class="game-icon">F</div>
              <h3>Fallout 4</h3>
              <p class="text-muted">Coming soon</p>
            </div>
          }
        </div>
      </section>

      <section class="features-section">
        <h2>How It Works</h2>
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-number">1</div>
            <h3>Paste Your Specs</h3>
            <p>Copy your hardware info from NVIDIA App or system settings and paste it in.</p>
          </div>
          <div class="feature-card">
            <div class="feature-number">2</div>
            <h3>Pick Your Playstyle</h3>
            <p>Choose from popular playstyles like Survival, Combat Overhaul, or Visual Enhancement.</p>
          </div>
          <div class="feature-card">
            <div class="feature-number">3</div>
            <h3>Get Your Modlist</h3>
            <p>AI generates a stable, compatible modlist tailored to your hardware and preferences.</p>
          </div>
          <div class="feature-card">
            <div class="feature-number">4</div>
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
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 1rem;
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
    }
    .games-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 1.5rem;
    }
    .game-card {
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      padding: 2rem;
      text-align: center;
    }
    .game-icon {
      width: 64px;
      height: 64px;
      background: var(--color-primary);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      font-weight: 700;
      color: white;
      margin: 0 auto 1rem;
    }
    .game-card h3 { margin-bottom: 1rem; font-size: 1.125rem; }
    .text-muted { color: var(--color-text-muted); font-size: 0.875rem; }
    .placeholder { opacity: 0.6; }

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
    .feature-number {
      width: 32px;
      height: 32px;
      background: var(--color-primary);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.875rem;
      color: white;
      margin-bottom: 1rem;
    }
    .feature-card h3 { font-size: 1rem; margin-bottom: 0.5rem; }
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
}
