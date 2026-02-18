import { Component, EventEmitter, OnInit, Output, signal } from '@angular/core';
import { ApiService } from '../../../../core/services/api.service';
import { Game } from '../../../../shared/models/game.model';

@Component({
  selector: 'app-game-select',
  standalone: true,
  template: `
    <div class="game-select">
      <h2>CHOOSE YOUR GAME</h2>
      <p class="subtitle">Select the game you want to mod.</p>

      <div class="games-grid">
        @for (game of games(); track game.id) {
          <button
            class="game-card"
            [class.skyrim]="game.slug === 'skyrim-se' || game.slug === 'skyrim-ae'"
            [class.fallout]="game.slug === 'fallout-4'"
            (click)="selectGame(game.id)"
          >
            <div class="game-initial">{{ game.name.charAt(0) }}</div>
            <h3>{{ game.name }}</h3>
          </button>
        }
        @if (games().length === 0) {
          <button
            class="game-card skyrim"
            (click)="selectGame(1)"
          >
            <div class="game-initial">S</div>
            <h3>Skyrim Special Edition</h3>
          </button>
          <button
            class="game-card fallout"
            (click)="selectGame(2)"
          >
            <div class="game-initial">F</div>
            <h3>Fallout 4</h3>
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    .game-select {
      text-align: center;
    }
    h2 {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      font-family: var(--font-heading);
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .subtitle {
      color: var(--color-text-muted);
      margin-bottom: 2rem;
    }
    .games-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 2rem;
      max-width: 600px;
      margin: 0 auto;
    }
    .game-card {
      background: var(--color-bg-card);
      border: 2px solid var(--color-border);
      border-radius: 16px;
      padding: 2.5rem 2rem;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      color: var(--color-text);
      font-family: inherit;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 260px;
    }

    .game-card.skyrim {
      background: linear-gradient(135deg, #0c1a2e 0%, #1a2a42 50%, #0c1524 100%);
      border-color: #1a3a5a;
    }
    .game-card.skyrim:hover {
      border-color: var(--color-primary);
      box-shadow: 0 0 24px rgba(99, 102, 241, 0.5),
                  inset 0 0 20px rgba(31, 149, 245, 0.15);
      transform: translateY(-4px) scale(1.02);
    }

    .game-card.fallout {
      background: linear-gradient(135deg, #0c1a0c 0%, #1a3a1a 50%, #0c140c 100%);
      border-color: #1a5a1a;
    }
    .game-card.fallout:hover {
      border-color: var(--color-accent-green);
      box-shadow: 0 0 24px rgba(34, 197, 94, 0.5),
                  inset 0 0 20px rgba(34, 197, 94, 0.15);
      transform: translateY(-4px) scale(1.02);
    }

    .game-initial {
      width: 80px;
      height: 80px;
      background: rgba(99, 102, 241, 0.2);
      border: 2px solid var(--color-primary);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2.5rem;
      font-weight: 700;
      color: var(--color-primary);
      margin-bottom: 1.5rem;
      transition: all 0.3s;
    }

    .game-card:hover .game-initial {
      background: var(--color-primary);
      color: white;
      box-shadow: 0 0 16px rgba(99, 102, 241, 0.4);
    }

    h3 {
      font-size: 1.125rem;
      font-weight: 600;
      margin: 0;
      letter-spacing: 0.02em;
    }
  `],
})
export class GameSelectComponent implements OnInit {
  @Output() gameSelected = new EventEmitter<number>();

  games = signal<Game[]>([]);

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.getGames().subscribe({
      next: (games) => this.games.set(games),
      error: () => {},
    });
  }

  selectGame(gameId: number): void {
    this.gameSelected.emit(gameId);
  }
}
