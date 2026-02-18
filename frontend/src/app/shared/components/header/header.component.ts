import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="header">
      <div class="header-content">
        <a routerLink="/dashboard" class="logo">
          <span class="logo-mark">M</span>
          <span class="logo-text">Modify</span>
        </a>
        <nav class="nav">
          <a routerLink="/dashboard" routerLinkActive="active" class="nav-link">Dashboard</a>
          <a routerLink="/browse" routerLinkActive="active" class="nav-link">Browse</a>
          <a routerLink="/setup" routerLinkActive="active" class="nav-link">New Build</a>
          <a routerLink="/downloads" routerLinkActive="active" class="nav-link">Downloads</a>
          <a routerLink="/settings" routerLinkActive="active" class="nav-link">Settings</a>
        </nav>
        <div class="header-actions">
          <button class="avatar-btn" title="Profile">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="8" r="4"/>
              <path d="M5.5 21c0-3.5 2.9-6 6.5-6s6.5 2.5 6.5 6"/>
            </svg>
          </button>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .header {
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(13, 13, 15, 0.8);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--color-border);
      height: var(--header-height);
    }
    .header-content {
      max-width: var(--max-width);
      margin: 0 auto;
      padding: 0 2rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 100%;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      color: var(--color-text);
    }
    .logo-mark {
      width: 32px;
      height: 32px;
      background: var(--color-gold);
      color: #0D0D0F;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1rem;
      font-family: var(--font-display);
    }
    .logo-text {
      font-size: 1.125rem;
      font-weight: 600;
      letter-spacing: -0.01em;
    }
    .nav {
      display: flex;
      gap: 0.25rem;
    }
    .nav-link {
      color: var(--color-text-muted);
      font-size: 0.8125rem;
      font-weight: 500;
      padding: 0.375rem 0.75rem;
      border-radius: 6px;
      transition: color 0.15s, background 0.15s;
    }
    .nav-link:hover {
      color: var(--color-text);
      background: rgba(255, 255, 255, 0.04);
    }
    .nav-link.active {
      color: var(--color-text);
      background: rgba(255, 255, 255, 0.06);
    }
    .header-actions {
      display: flex;
      align-items: center;
    }
    .avatar-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--color-bg-elevated);
      border: 1px solid var(--color-border);
      color: var(--color-text-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: border-color 0.15s, color 0.15s;
    }
    .avatar-btn:hover {
      border-color: var(--color-border-hover);
      color: var(--color-text);
    }
  `],
})
export class HeaderComponent {}
