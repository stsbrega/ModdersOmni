import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="header">
      <div class="header-content">
        <a routerLink="/" class="logo">
          <span class="logo-icon">M</span>
          <span class="logo-text">Modify</span>
        </a>
        <nav class="nav">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">HQ</a>
          <a routerLink="/setup" routerLinkActive="active">New Build</a>
          <a routerLink="/downloads" routerLinkActive="active">Armory</a>
          <a routerLink="/settings" routerLinkActive="active">Config</a>
        </nav>
      </div>
    </header>
  `,
  styles: [`
    .header {
      background: var(--color-bg-card);
      border-bottom: 1px solid var(--color-border);
      padding: 0 2rem;
    }
    .header-content {
      max-width: 1280px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 64px;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      text-decoration: none;
      color: var(--color-text);
    }
    .logo-icon {
      background: var(--color-primary);
      color: white;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1.25rem;
      border-bottom: 3px solid var(--color-primary-glow);
      box-shadow: 0 0 12px var(--color-primary-glow);
    }
    .logo-text {
      font-size: 1.25rem;
      font-weight: 600;
      font-family: var(--font-heading);
    }
    .nav {
      display: flex;
      gap: 2rem;
    }
    .nav a {
      color: var(--color-text-muted);
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
      padding: 0.5rem 0;
      border-bottom: 2px solid transparent;
      transition: color 0.2s, border-color 0.2s;
    }
    .nav a:hover, .nav a.active {
      color: var(--color-text);
      border-bottom-color: var(--color-primary);
    }
  `],
})
export class HeaderComponent {}
