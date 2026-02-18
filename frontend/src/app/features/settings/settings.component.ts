import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';

type SettingsTab = 'profile' | 'hardware' | 'preferences' | 'notifications';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('250ms ease-out', style({ opacity: 1 })),
      ]),
    ]),
  ],
  template: `
    <div class="settings-page">
      <div class="settings-header">
        <h1>Settings</h1>
        <p>Manage your profile, hardware, and preferences</p>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        @for (tab of tabs; track tab.id) {
          <button
            class="tab"
            [class.active]="activeTab() === tab.id"
            (click)="activeTab.set(tab.id)"
          >
            {{ tab.label }}
          </button>
        }
      </div>

      <!-- Tab Content -->
      <div class="tab-content">
        @switch (activeTab()) {
          @case ('profile') {
            <div class="tab-panel" @fadeIn>
              <div class="panel-section">
                <h3>Display Name</h3>
                <input type="text" class="input" [(ngModel)]="displayName" placeholder="Your display name">
              </div>
              <div class="panel-section">
                <h3>Email</h3>
                <input type="email" class="input" [(ngModel)]="email" placeholder="your@email.com">
              </div>
              <div class="panel-section">
                <h3>Nexus Mods API Key</h3>
                <input type="password" class="input" [(ngModel)]="nexusApiKey" placeholder="Enter your Nexus Mods API key">
                <p class="input-hint">Required for mod downloads. Get your key from Nexus Mods account settings.</p>
              </div>
              <div class="panel-section">
                <h3>LLM Provider</h3>
                <select class="input" [(ngModel)]="llmProvider">
                  <option value="ollama">Ollama (Local)</option>
                  <option value="groq">Groq (Cloud - Free Tier)</option>
                  <option value="together">Together AI (Cloud - Free Tier)</option>
                  <option value="huggingface">HuggingFace (Cloud - Free Tier)</option>
                </select>
              </div>
              @if (llmProvider === 'ollama') {
                <div class="panel-section sub">
                  <h3>Ollama URL</h3>
                  <input type="text" class="input" [(ngModel)]="ollamaBaseUrl">
                </div>
                <div class="panel-section sub">
                  <h3>Model Name</h3>
                  <input type="text" class="input" [(ngModel)]="ollamaModel">
                </div>
              }
              @if (llmProvider === 'groq') {
                <div class="panel-section sub">
                  <h3>Groq API Key</h3>
                  <input type="password" class="input" [(ngModel)]="groqApiKey" placeholder="Enter Groq API key">
                </div>
              }
              @if (llmProvider === 'together') {
                <div class="panel-section sub">
                  <h3>Together AI API Key</h3>
                  <input type="password" class="input" [(ngModel)]="togetherApiKey" placeholder="Enter Together AI API key">
                </div>
              }
              @if (llmProvider === 'huggingface') {
                <div class="panel-section sub">
                  <h3>HuggingFace API Key</h3>
                  <input type="password" class="input" [(ngModel)]="huggingfaceApiKey" placeholder="Enter HuggingFace API key">
                </div>
              }
            </div>
          }
          @case ('hardware') {
            <div class="tab-panel" @fadeIn>
              <div class="panel-section">
                <h3>GPU Model</h3>
                <input type="text" class="input" [(ngModel)]="gpuModel" placeholder="e.g. NVIDIA GeForce RTX 4070" list="gpu-suggestions">
                <datalist id="gpu-suggestions">
                  <option value="NVIDIA GeForce RTX 4090"></option>
                  <option value="NVIDIA GeForce RTX 4080"></option>
                  <option value="NVIDIA GeForce RTX 4070 Ti"></option>
                  <option value="NVIDIA GeForce RTX 4070"></option>
                  <option value="NVIDIA GeForce RTX 4060 Ti"></option>
                  <option value="NVIDIA GeForce RTX 4060"></option>
                  <option value="NVIDIA GeForce RTX 3080"></option>
                  <option value="NVIDIA GeForce RTX 3070"></option>
                  <option value="NVIDIA GeForce RTX 3060"></option>
                  <option value="AMD Radeon RX 7900 XTX"></option>
                  <option value="AMD Radeon RX 7800 XT"></option>
                  <option value="AMD Radeon RX 7600"></option>
                </datalist>
              </div>
              <div class="panel-section">
                <h3>VRAM</h3>
                <div class="slider-group">
                  <input type="range" class="slider" min="2" max="24" step="1" [(ngModel)]="vramGb">
                  <span class="slider-value">{{ vramGb }} GB</span>
                </div>
              </div>
              <div class="panel-section">
                <h3>System RAM</h3>
                <div class="slider-group">
                  <input type="range" class="slider" min="4" max="64" step="4" [(ngModel)]="ramGb">
                  <span class="slider-value">{{ ramGb }} GB</span>
                </div>
              </div>
              <div class="panel-section">
                <h3>CPU Tier</h3>
                <select class="input" [(ngModel)]="cpuTier">
                  <option value="budget">Budget</option>
                  <option value="midrange">Mid-range</option>
                  <option value="highend">High-end</option>
                </select>
              </div>
              <div class="hw-summary">
                <h4>Hardware Summary</h4>
                <div class="hw-grid">
                  <div class="hw-item">
                    <span class="hw-label">GPU</span>
                    <span class="hw-val">{{ gpuModel || 'Not set' }}</span>
                  </div>
                  <div class="hw-item">
                    <span class="hw-label">VRAM</span>
                    <span class="hw-val">{{ vramGb }} GB</span>
                  </div>
                  <div class="hw-item">
                    <span class="hw-label">RAM</span>
                    <span class="hw-val">{{ ramGb }} GB</span>
                  </div>
                  <div class="hw-item">
                    <span class="hw-label">CPU Tier</span>
                    <span class="hw-val capitalize">{{ cpuTier }}</span>
                  </div>
                </div>
              </div>
            </div>
          }
          @case ('preferences') {
            <div class="tab-panel" @fadeIn>
              <div class="panel-section">
                <h3>Game Selection</h3>
                <div class="toggle-group">
                  @for (game of gameOptions; track game.value) {
                    <button
                      class="toggle-btn"
                      [class.active]="selectedGames().includes(game.value)"
                      (click)="toggleGame(game.value)"
                    >
                      {{ game.label }}
                    </button>
                  }
                </div>
              </div>
              <div class="panel-section">
                <h3>Modding Experience</h3>
                <div class="toggle-group">
                  @for (level of experienceLevels; track level) {
                    <button
                      class="toggle-btn"
                      [class.active]="experience() === level"
                      (click)="experience.set(level)"
                    >
                      {{ level }}
                    </button>
                  }
                </div>
              </div>
              <div class="panel-section">
                <h3>Preferred Mod Categories</h3>
                <div class="chip-group">
                  @for (cat of modCategories; track cat) {
                    <button
                      class="chip"
                      [class.selected]="selectedModCategories().includes(cat)"
                      (click)="toggleModCategory(cat)"
                    >
                      {{ cat }}
                    </button>
                  }
                </div>
              </div>
              <div class="panel-section">
                <h3>Custom Mod Source</h3>
                <input type="text" class="input" [(ngModel)]="customSourceUrl" placeholder="https://api.example.com">
                <p class="input-hint">Optional external mod API endpoint.</p>
              </div>
            </div>
          }
          @case ('notifications') {
            <div class="tab-panel" @fadeIn>
              <div class="notif-item">
                <div class="notif-info">
                  <h3>Email Alerts</h3>
                  <p>Get notified about important updates and new features.</p>
                </div>
                <button class="toggle-switch" [class.on]="emailAlerts" (click)="emailAlerts = !emailAlerts">
                  <span class="toggle-knob"></span>
                </button>
              </div>
              <div class="notif-item">
                <div class="notif-info">
                  <h3>New Mod Recommendations</h3>
                  <p>Receive suggestions when new mods match your preferences.</p>
                </div>
                <button class="toggle-switch" [class.on]="modRecommendations" (click)="modRecommendations = !modRecommendations">
                  <span class="toggle-knob"></span>
                </button>
              </div>
              <div class="notif-item">
                <div class="notif-info">
                  <h3>Compatibility Warnings</h3>
                  <p>Get alerts when mod updates may cause conflicts.</p>
                </div>
                <button class="toggle-switch" [class.on]="compatWarnings" (click)="compatWarnings = !compatWarnings">
                  <span class="toggle-knob"></span>
                </button>
              </div>
            </div>
          }
        }
      </div>

      <!-- Save Button -->
      <div class="save-bar">
        <button class="btn-save" (click)="saveSettings()">
          Save Changes
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .settings-page {
      max-width: 680px;
      margin: 0 auto;
      padding: 2rem;
    }
    .settings-header {
      margin-bottom: 2rem;
    }
    .settings-header h1 {
      font-size: 1.5rem;
      font-weight: 600;
      letter-spacing: -0.01em;
    }
    .settings-header p {
      font-size: 0.875rem;
      color: var(--color-text-muted);
      margin-top: 0.25rem;
    }

    /* Tabs */
    .tabs {
      display: flex;
      gap: 0.25rem;
      border-bottom: 1px solid var(--color-border);
      margin-bottom: 2rem;
    }
    .tab {
      padding: 0.625rem 1rem;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-text-muted);
      background: none;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      transition: color 0.15s, border-color 0.15s;
    }
    .tab:hover { color: var(--color-text); }
    .tab.active {
      color: var(--color-text);
      border-bottom-color: var(--color-gold);
    }

    /* Panel */
    .tab-panel {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .panel-section {
      padding: 1rem 0;
      border-bottom: 1px solid var(--color-border);
    }
    .panel-section.sub {
      padding-left: 1rem;
      border-left: 2px solid var(--color-border);
      margin-left: 0.5rem;
    }
    .panel-section:last-child { border-bottom: none; }
    .panel-section h3 {
      font-size: 0.875rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }

    /* Inputs */
    .input {
      width: 100%;
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      color: var(--color-text);
      padding: 0.625rem 0.875rem;
      font-size: 0.875rem;
      outline: none;
      transition: border-color 0.15s;
    }
    .input:focus { border-color: var(--color-gold); }
    select.input { cursor: pointer; }
    .input::placeholder { color: var(--color-text-dim); }
    .input-hint {
      font-size: 0.75rem;
      color: var(--color-text-dim);
      margin-top: 0.375rem;
    }

    /* Slider */
    .slider-group {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .slider {
      flex: 1;
      -webkit-appearance: none;
      appearance: none;
      height: 4px;
      background: var(--color-border);
      border-radius: 2px;
      outline: none;
    }
    .slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--color-gold);
      cursor: pointer;
      border: 3px solid var(--color-bg-dark);
      box-shadow: 0 0 0 1px var(--color-gold);
    }
    .slider::-moz-range-thumb {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--color-gold);
      cursor: pointer;
      border: 3px solid var(--color-bg-dark);
    }
    .slider-value {
      font-size: 0.875rem;
      font-weight: 600;
      min-width: 50px;
      text-align: right;
    }

    /* Hardware summary */
    .hw-summary {
      margin-top: 1.5rem;
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: 10px;
      padding: 1.25rem;
    }
    .hw-summary h4 {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 1rem;
    }
    .hw-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }
    .hw-item {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }
    .hw-label {
      font-size: 0.75rem;
      color: var(--color-text-dim);
    }
    .hw-val {
      font-size: 0.875rem;
      font-weight: 500;
    }
    .capitalize { text-transform: capitalize; }

    /* Toggle Group */
    .toggle-group {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .toggle-btn {
      padding: 0.5rem 1rem;
      border-radius: 8px;
      border: 1px solid var(--color-border);
      background: transparent;
      color: var(--color-text-muted);
      font-size: 0.8125rem;
      font-weight: 500;
      transition: all 0.15s;
    }
    .toggle-btn:hover {
      border-color: var(--color-border-hover);
      color: var(--color-text);
    }
    .toggle-btn.active {
      border-color: var(--color-gold);
      background: rgba(192, 160, 96, 0.1);
      color: var(--color-gold);
    }

    /* Chips */
    .chip-group {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .chip {
      padding: 0.375rem 0.875rem;
      border-radius: 100px;
      border: 1px solid var(--color-border);
      background: transparent;
      color: var(--color-text-muted);
      font-size: 0.8125rem;
      font-weight: 500;
      transition: all 0.15s;
    }
    .chip:hover {
      border-color: var(--color-border-hover);
      color: var(--color-text);
    }
    .chip.selected {
      border-color: var(--color-gold);
      background: rgba(192, 160, 96, 0.1);
      color: var(--color-gold);
    }

    /* Notification items */
    .notif-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 0;
      border-bottom: 1px solid var(--color-border);
    }
    .notif-item:last-child { border-bottom: none; }
    .notif-info h3 {
      font-size: 0.875rem;
      font-weight: 600;
      margin-bottom: 0.125rem;
    }
    .notif-info p {
      font-size: 0.8125rem;
      color: var(--color-text-muted);
    }
    .toggle-switch {
      width: 44px;
      height: 24px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.1);
      position: relative;
      flex-shrink: 0;
      transition: background 0.2s;
      padding: 0;
    }
    .toggle-switch.on { background: var(--color-gold); }
    .toggle-knob {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: white;
      transition: transform 0.2s;
    }
    .toggle-switch.on .toggle-knob {
      transform: translateX(20px);
    }

    /* Save */
    .save-bar {
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--color-border);
    }
    .btn-save {
      background: var(--color-gold);
      color: #0D0D0F;
      padding: 0.625rem 2rem;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      transition: background 0.2s, box-shadow 0.3s;
    }
    .btn-save:hover {
      background: var(--color-gold-hover);
      box-shadow: 0 0 20px var(--color-gold-glow);
    }
  `],
})
export class SettingsComponent {
  activeTab = signal<SettingsTab>('profile');

  tabs: { id: SettingsTab; label: string }[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'hardware', label: 'Hardware' },
    { id: 'preferences', label: 'Preferences' },
    { id: 'notifications', label: 'Notifications' },
  ];

  // Profile
  displayName = '';
  email = '';
  nexusApiKey = '';
  llmProvider = 'ollama';
  ollamaBaseUrl = 'http://localhost:11434/v1';
  ollamaModel = 'llama3.1:8b';
  groqApiKey = '';
  togetherApiKey = '';
  huggingfaceApiKey = '';

  // Hardware
  gpuModel = '';
  vramGb = 8;
  ramGb = 16;
  cpuTier = 'midrange';

  // Preferences
  gameOptions = [
    { value: 'skyrim', label: 'Skyrim SE/AE' },
    { value: 'fallout', label: 'Fallout 4' },
  ];
  selectedGames = signal<string[]>(['skyrim']);
  experienceLevels = ['Beginner', 'Intermediate', 'Expert'];
  experience = signal('Intermediate');
  modCategories = ['Gameplay', 'Visuals', 'Textures', 'UI', 'Audio', 'Followers', 'Quests', 'Combat'];
  selectedModCategories = signal<string[]>(['Gameplay', 'Visuals']);
  customSourceUrl = '';

  // Notifications
  emailAlerts = true;
  modRecommendations = true;
  compatWarnings = true;

  constructor(
    private api: ApiService,
    private notifications: NotificationService,
  ) {
    this.loadSettings();
  }

  toggleGame(game: string): void {
    this.selectedGames.update(games =>
      games.includes(game) ? games.filter(g => g !== game) : [...games, game]
    );
  }

  toggleModCategory(cat: string): void {
    this.selectedModCategories.update(cats =>
      cats.includes(cat) ? cats.filter(c => c !== cat) : [...cats, cat]
    );
  }

  private loadSettings(): void {
    this.api.getSettings().subscribe({
      next: (settings) => {
        this.nexusApiKey = settings.nexus_api_key || '';
        this.llmProvider = settings.llm_provider || 'ollama';
        this.ollamaBaseUrl = settings.ollama_base_url || 'http://localhost:11434/v1';
        this.ollamaModel = settings.ollama_model || 'llama3.1:8b';
        this.groqApiKey = settings.groq_api_key || '';
        this.togetherApiKey = settings.together_api_key || '';
        this.huggingfaceApiKey = settings.huggingface_api_key || '';
        this.customSourceUrl = settings.custom_source_api_url || '';
      },
      error: () => {},
    });
  }

  saveSettings(): void {
    this.api.updateSettings({
      nexus_api_key: this.nexusApiKey,
      llm_provider: this.llmProvider,
      ollama_base_url: this.ollamaBaseUrl,
      ollama_model: this.ollamaModel,
      groq_api_key: this.groqApiKey,
      together_api_key: this.togetherApiKey,
      huggingface_api_key: this.huggingfaceApiKey,
      custom_source_api_url: this.customSourceUrl,
    }).subscribe({
      next: () => this.notifications.success('Settings saved successfully'),
      error: () => this.notifications.error('Failed to save settings'),
    });
  }
}
