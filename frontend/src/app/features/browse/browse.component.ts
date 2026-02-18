import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

interface BrowseMod {
  id: number;
  name: string;
  author: string;
  category: string;
  rating: number;
  vramMb: number;
  impact: 'Low' | 'Medium' | 'High';
  game: 'skyrim' | 'fallout';
  compatible: boolean;
}

@Component({
  selector: 'app-browse',
  standalone: true,
  imports: [FormsModule],
  animations: [
    trigger('staggerGrid', [
      transition(':enter', [
        query('.mod-card, .skeleton-card', [
          style({ opacity: 0, transform: 'translateY(12px)' }),
          stagger(50, [
            animate('350ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 1, transform: 'translateY(0)' })),
          ]),
        ], { optional: true }),
      ]),
    ]),
  ],
  template: `
    <div class="browse-layout">
      <!-- Filter Sidebar -->
      <aside class="filter-sidebar">
        <div class="filter-header">
          <h3>Filters</h3>
          <button class="filter-reset" (click)="resetFilters()">Reset</button>
        </div>

        <div class="filter-group">
          <h4>Game</h4>
          <div class="filter-options">
            <label class="filter-option">
              <input type="radio" name="game" value="all" [(ngModel)]="gameFilter" (ngModelChange)="onFilterChange()">
              <span class="filter-radio"></span>
              All
            </label>
            <label class="filter-option">
              <input type="radio" name="game" value="skyrim" [(ngModel)]="gameFilter" (ngModelChange)="onFilterChange()">
              <span class="filter-radio"></span>
              Skyrim SE/AE
            </label>
            <label class="filter-option">
              <input type="radio" name="game" value="fallout" [(ngModel)]="gameFilter" (ngModelChange)="onFilterChange()">
              <span class="filter-radio"></span>
              Fallout 4
            </label>
          </div>
        </div>

        <div class="filter-group">
          <h4>Category</h4>
          <div class="filter-options">
            @for (cat of categories; track cat) {
              <label class="filter-option">
                <input type="checkbox" [checked]="selectedCategories().includes(cat)" (change)="toggleCategory(cat)">
                <span class="filter-check"></span>
                {{ cat }}
              </label>
            }
          </div>
        </div>

        <div class="filter-group">
          <h4>Performance Impact</h4>
          <div class="filter-options">
            @for (impact of impacts; track impact) {
              <label class="filter-option">
                <input type="checkbox" [checked]="selectedImpacts().includes(impact)" (change)="toggleImpact(impact)">
                <span class="filter-check"></span>
                {{ impact }}
              </label>
            }
          </div>
        </div>

        <div class="filter-group">
          <h4>Compatibility</h4>
          <div class="filter-options">
            <label class="filter-option">
              <input type="checkbox" [(ngModel)]="compatibleOnly" (ngModelChange)="onFilterChange()">
              <span class="filter-check"></span>
              Compatible only
            </label>
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="browse-main">
        <!-- Search Bar -->
        <div class="search-bar">
          <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search mods by name or author..."
            [(ngModel)]="searchQuery"
            (ngModelChange)="onFilterChange()"
            class="search-input"
          >
          <span class="search-count">{{ filteredMods().length }} mods</span>
        </div>

        <!-- Mod Grid -->
        @if (loading()) {
          <div class="mod-grid" @staggerGrid>
            @for (i of skeletonItems; track i) {
              <div class="skeleton-card">
                <div class="skeleton-thumb"></div>
                <div class="skeleton-body">
                  <div class="skeleton-line w70"></div>
                  <div class="skeleton-line w40"></div>
                  <div class="skeleton-row">
                    <div class="skeleton-badge"></div>
                    <div class="skeleton-badge"></div>
                  </div>
                  <div class="skeleton-btn"></div>
                </div>
              </div>
            }
          </div>
        } @else {
          <div class="mod-grid" @staggerGrid>
            @for (mod of filteredMods(); track mod.id) {
              <div class="mod-card">
                <div class="mod-thumb" [class]="'thumb-' + mod.category.toLowerCase()">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
                    <line x1="7" y1="7" x2="7.01" y2="7"/>
                  </svg>
                </div>
                <div class="mod-body">
                  <h3 class="mod-name">{{ mod.name }}</h3>
                  <p class="mod-author">by {{ mod.author }}</p>
                  <div class="mod-meta">
                    <span class="mod-cat-badge" [class]="'cat-' + mod.category.toLowerCase()">{{ mod.category }}</span>
                    <div class="mod-stars">
                      @for (s of [1,2,3,4,5]; track s) {
                        <svg width="12" height="12" viewBox="0 0 24 24" [attr.fill]="s <= mod.rating ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.5" [class.filled]="s <= mod.rating">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                      }
                    </div>
                  </div>
                  <div class="mod-footer">
                    <span class="vram-badge" [class]="'impact-' + mod.impact.toLowerCase()">
                      {{ mod.vramMb }}MB VRAM
                    </span>
                    <button class="add-btn">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                      Add to List
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
          @if (filteredMods().length === 0) {
            <div class="empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <h3>No mods found</h3>
              <p>Try adjusting your filters or search query.</p>
            </div>
          }
        }
      </main>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .browse-layout {
      display: flex;
      min-height: calc(100vh - var(--header-height));
    }

    /* ===== Filter Sidebar ===== */
    .filter-sidebar {
      width: 240px;
      border-right: 1px solid var(--color-border);
      padding: 1.5rem;
      flex-shrink: 0;
      overflow-y: auto;
      max-height: calc(100vh - var(--header-height));
      position: sticky;
      top: var(--header-height);
    }
    .filter-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
    }
    .filter-header h3 {
      font-size: 0.9375rem;
      font-weight: 600;
    }
    .filter-reset {
      font-size: 0.75rem;
      color: var(--color-gold);
      background: none;
      font-weight: 500;
      transition: opacity 0.15s;
    }
    .filter-reset:hover { opacity: 0.8; }
    .filter-group {
      margin-bottom: 1.5rem;
    }
    .filter-group h4 {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 0.625rem;
    }
    .filter-options {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }
    .filter-option {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
      color: var(--color-text-muted);
      cursor: pointer;
      padding: 0.25rem 0;
      transition: color 0.15s;
    }
    .filter-option:hover { color: var(--color-text); }
    .filter-option input { display: none; }
    .filter-radio {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 1.5px solid var(--color-border-hover);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: border-color 0.15s;
    }
    .filter-option input:checked + .filter-radio {
      border-color: var(--color-gold);
    }
    .filter-option input:checked + .filter-radio::after {
      content: '';
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--color-gold);
    }
    .filter-check {
      width: 16px;
      height: 16px;
      border-radius: 4px;
      border: 1.5px solid var(--color-border-hover);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: border-color 0.15s, background 0.15s;
    }
    .filter-option input:checked + .filter-check {
      border-color: var(--color-gold);
      background: var(--color-gold);
    }
    .filter-option input:checked + .filter-check::after {
      content: '';
      width: 8px;
      height: 5px;
      border-left: 2px solid #0D0D0F;
      border-bottom: 2px solid #0D0D0F;
      transform: rotate(-45deg) translateY(-1px);
    }

    /* ===== Main ===== */
    .browse-main {
      flex: 1;
      padding: 1.5rem 2rem;
      max-width: 960px;
    }

    /* Search */
    .search-bar {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: 10px;
      padding: 0 1rem;
      margin-bottom: 1.5rem;
      transition: border-color 0.15s;
    }
    .search-bar:focus-within {
      border-color: var(--color-gold);
    }
    .search-icon {
      color: var(--color-text-dim);
      flex-shrink: 0;
    }
    .search-input {
      flex: 1;
      background: none;
      border: none;
      color: var(--color-text);
      font-size: 0.875rem;
      padding: 0.75rem 0;
      outline: none;
    }
    .search-input::placeholder {
      color: var(--color-text-dim);
    }
    .search-count {
      font-size: 0.75rem;
      color: var(--color-text-dim);
      white-space: nowrap;
    }

    /* Mod Grid */
    .mod-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }

    /* Mod Card */
    .mod-card {
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      overflow: hidden;
      transition: border-color 0.25s, transform 0.3s var(--ease-out), box-shadow 0.3s;
    }
    .mod-card:hover {
      border-color: var(--color-border-hover);
      transform: translateY(-4px);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.04);
    }
    .mod-thumb {
      height: 100px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(255, 255, 255, 0.15);
    }
    .thumb-gameplay { background: linear-gradient(135deg, rgba(192,160,96,0.08), rgba(192,160,96,0.02)); }
    .thumb-visuals { background: linear-gradient(135deg, rgba(123,164,192,0.08), rgba(123,164,192,0.02)); }
    .thumb-textures { background: linear-gradient(135deg, rgba(239,68,68,0.06), rgba(239,68,68,0.02)); }
    .thumb-ui { background: linear-gradient(135deg, rgba(168,85,247,0.06), rgba(168,85,247,0.02)); }
    .thumb-audio { background: linear-gradient(135deg, rgba(34,197,94,0.06), rgba(34,197,94,0.02)); }
    .thumb-followers { background: linear-gradient(135deg, rgba(234,179,8,0.06), rgba(234,179,8,0.02)); }
    .mod-body {
      padding: 1rem;
    }
    .mod-name {
      font-size: 0.875rem;
      font-weight: 600;
      margin-bottom: 0.25rem;
      line-height: 1.3;
    }
    .mod-author {
      font-size: 0.75rem;
      color: var(--color-text-dim);
      margin-bottom: 0.75rem;
    }
    .mod-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.75rem;
    }
    .mod-cat-badge {
      font-size: 0.625rem;
      font-weight: 600;
      padding: 0.125rem 0.5rem;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .cat-gameplay { background: rgba(192, 160, 96, 0.12); color: var(--color-gold); }
    .cat-visuals { background: rgba(123, 164, 192, 0.12); color: var(--color-blue); }
    .cat-ui { background: rgba(168, 85, 247, 0.12); color: #a855f7; }
    .cat-audio { background: rgba(34, 197, 94, 0.12); color: #22c55e; }
    .cat-textures { background: rgba(239, 68, 68, 0.12); color: #ef4444; }
    .cat-followers { background: rgba(234, 179, 8, 0.12); color: #eab308; }
    .mod-stars {
      display: flex;
      gap: 1px;
      color: var(--color-text-dim);
    }
    .mod-stars svg.filled { color: var(--color-gold); }
    .mod-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .vram-badge {
      font-size: 0.6875rem;
      font-weight: 600;
      padding: 0.125rem 0.5rem;
      border-radius: 4px;
    }
    .impact-low { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
    .impact-medium { background: rgba(234, 179, 8, 0.1); color: #eab308; }
    .impact-high { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
    .add-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      background: transparent;
      border: 1px solid var(--color-border);
      color: var(--color-text-muted);
      padding: 0.3125rem 0.625rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 500;
      transition: color 0.15s, border-color 0.15s, background 0.15s;
    }
    .add-btn:hover {
      color: var(--color-gold);
      border-color: var(--color-gold);
      background: rgba(196, 165, 90, 0.08);
      box-shadow: 0 0 12px rgba(196, 165, 90, 0.1);
    }

    /* Skeleton */
    .skeleton-card {
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: 10px;
      overflow: hidden;
    }
    .skeleton-thumb {
      height: 100px;
      background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%);
      background-size: 200% 100%;
      animation: shimmer-sweep 1.8s ease-in-out infinite;
    }
    .skeleton-body { padding: 1rem; }
    .skeleton-line {
      height: 10px;
      background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
      background-size: 200% 100%;
      border-radius: 5px;
      margin-bottom: 0.5rem;
      animation: shimmer-sweep 1.8s ease-in-out infinite;
    }
    .skeleton-line.w70 { width: 70%; }
    .skeleton-line.w40 { width: 40%; }
    .skeleton-row {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }
    .skeleton-badge {
      height: 20px;
      width: 60px;
      background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.04) 75%);
      background-size: 200% 100%;
      border-radius: 4px;
      animation: shimmer-sweep 1.8s ease-in-out infinite;
    }
    .skeleton-btn {
      height: 28px;
      width: 90px;
      background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.04) 75%);
      background-size: 200% 100%;
      border-radius: 6px;
      animation: shimmer-sweep 1.8s ease-in-out infinite;
      margin-left: auto;
    }
    @keyframes shimmer-sweep {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    /* Empty state */
    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      color: var(--color-text-dim);
    }
    .empty-state svg { margin: 0 auto 1rem; }
    .empty-state h3 {
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text-muted);
      margin-bottom: 0.25rem;
    }
    .empty-state p { font-size: 0.875rem; }

    @media (max-width: 1024px) {
      .filter-sidebar { display: none; }
      .mod-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 640px) {
      .mod-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class BrowseComponent {
  searchQuery = '';
  gameFilter = 'all';
  compatibleOnly = false;
  selectedCategories = signal<string[]>([]);
  selectedImpacts = signal<string[]>([]);
  loading = signal(true);

  categories = ['Gameplay', 'Visuals', 'Textures', 'UI', 'Audio', 'Followers'];
  impacts = ['Low', 'Medium', 'High'];
  skeletonItems = Array.from({ length: 9 }, (_, i) => i);

  private allMods: BrowseMod[] = [
    { id: 1, name: 'Unofficial Skyrim SE Patch', author: 'Arthmoor', category: 'Gameplay', rating: 5, vramMb: 50, impact: 'Low', game: 'skyrim', compatible: true },
    { id: 2, name: 'SkyUI', author: 'SkyUI Team', category: 'UI', rating: 5, vramMb: 20, impact: 'Low', game: 'skyrim', compatible: true },
    { id: 3, name: 'ENBSeries v0.492', author: 'Boris Vorontsov', category: 'Visuals', rating: 5, vramMb: 800, impact: 'High', game: 'skyrim', compatible: true },
    { id: 4, name: 'Realistic Water Two', author: 'isoku', category: 'Visuals', rating: 4, vramMb: 300, impact: 'Medium', game: 'skyrim', compatible: true },
    { id: 5, name: 'Static Mesh Improvement', author: 'Brumbek', category: 'Textures', rating: 5, vramMb: 600, impact: 'Medium', game: 'skyrim', compatible: true },
    { id: 6, name: 'Ordinator - Perks of Skyrim', author: 'EnaiSiaion', category: 'Gameplay', rating: 5, vramMb: 10, impact: 'Low', game: 'skyrim', compatible: true },
    { id: 7, name: 'Immersive Citizens', author: 'Arnaud Dorard', category: 'Gameplay', rating: 4, vramMb: 30, impact: 'Low', game: 'skyrim', compatible: false },
    { id: 8, name: 'Sounds of Skyrim Complete', author: 'Cliffworms', category: 'Audio', rating: 4, vramMb: 0, impact: 'Low', game: 'skyrim', compatible: true },
    { id: 9, name: 'Inigo', author: 'Smartbluecat', category: 'Followers', rating: 5, vramMb: 200, impact: 'Low', game: 'skyrim', compatible: true },
    { id: 10, name: 'Skyrim HD Textures', author: 'SGS', category: 'Textures', rating: 4, vramMb: 2048, impact: 'High', game: 'skyrim', compatible: true },
    { id: 11, name: 'Unofficial Fallout 4 Patch', author: 'Arthmoor', category: 'Gameplay', rating: 5, vramMb: 60, impact: 'Low', game: 'fallout', compatible: true },
    { id: 12, name: 'Sim Settlements 2', author: 'kinggath', category: 'Gameplay', rating: 5, vramMb: 400, impact: 'Medium', game: 'fallout', compatible: true },
    { id: 13, name: 'Vivid Fallout - All in One', author: 'Hein84', category: 'Textures', rating: 4, vramMb: 1500, impact: 'High', game: 'fallout', compatible: true },
    { id: 14, name: 'True Storms', author: 'fadingsignal', category: 'Visuals', rating: 4, vramMb: 250, impact: 'Medium', game: 'fallout', compatible: true },
    { id: 15, name: 'DEF_UI', author: 'Neanka', category: 'UI', rating: 4, vramMb: 10, impact: 'Low', game: 'fallout', compatible: true },
  ];

  filteredMods = computed(() => {
    let mods = this.allMods;
    const q = this.searchQuery.toLowerCase();
    const cats = this.selectedCategories();
    const imps = this.selectedImpacts();

    if (q) {
      mods = mods.filter(m => m.name.toLowerCase().includes(q) || m.author.toLowerCase().includes(q));
    }
    if (this.gameFilter !== 'all') {
      mods = mods.filter(m => m.game === this.gameFilter);
    }
    if (cats.length > 0) {
      mods = mods.filter(m => cats.includes(m.category));
    }
    if (imps.length > 0) {
      mods = mods.filter(m => imps.includes(m.impact));
    }
    if (this.compatibleOnly) {
      mods = mods.filter(m => m.compatible);
    }
    return mods;
  });

  constructor() {
    // Simulate loading
    setTimeout(() => this.loading.set(false), 800);
  }

  toggleCategory(cat: string): void {
    this.selectedCategories.update(cats =>
      cats.includes(cat) ? cats.filter(c => c !== cat) : [...cats, cat]
    );
  }

  toggleImpact(impact: string): void {
    this.selectedImpacts.update(imps =>
      imps.includes(impact) ? imps.filter(i => i !== impact) : [...imps, impact]
    );
  }

  onFilterChange(): void {
    // Trigger computed re-evaluation (already reactive via signals and ngModel)
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.gameFilter = 'all';
    this.compatibleOnly = false;
    this.selectedCategories.set([]);
    this.selectedImpacts.set([]);
  }
}
