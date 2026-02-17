import { Component, EventEmitter, OnInit, Output, signal } from '@angular/core';
import { ApiService } from '../../../../core/services/api.service';
import { Game } from '../../../../shared/models/game.model';

@Component({
  selector: 'app-game-select',
  standalone: true,
  template: `
    <div class="game-select">
      <h2>Choose Your Game</h2>
      <p class="subtitle">Select the game you want to mod.</p>

      <div class="games-grid">
        @for (game of games(); track game.id) {
          <button class="game-card" (click)="selectGame(game.id)">
            <div class="game-icon">{{ game.name.charAt(0) }}</div>
            <h3>{{ game.name }}</h3>
          </button>
        }
        @if (games().length === 0) {
          <button class="game-card" (click)="selectGame(1)">
            <div class="game-icon">S</div>
            <h3>Skyrim Special Edition</h3>
          </button>
          <button class="game-card" (click)="selectGame(2)">
            <div class="game-icon">F</div>
            <h3>Fallout 4</h3>
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    .game-select { text-align: center; }
    h2 { font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; }
    .subtitle { color: var(--color-text-muted); margin-bottom: 2rem; }
    .games-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1.5rem;
      max-width: 500px;
      margin: 0 auto;
    }
    .game-card {
      background: var(--color-bg-card);
      border: 2px solid var(--color-border);
      border-radius: 12px;
      padding: 2rem;
      cursor: pointer;
      transition: border-color 0.2s, transform 0.2s;
      color: var(--color-text);
      font-family: inherit;
    }
    .game-card:hover {
      border-color: var(--color-primary);
      transform: translateY(-2px);
    }
    .game-icon {
      width: 56px;
      height: 56px;
      background: var(--color-primary);
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      font-weight: 700;
      color: white;
      margin: 0 auto 1rem;
    }
    h3 { font-size: 1rem; font-weight: 600; margin: 0; }
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
