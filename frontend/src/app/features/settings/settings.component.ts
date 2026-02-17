import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="settings-page">
      <h1>Settings</h1>

      <section class="settings-section">
        <h2>Nexus Mods</h2>
        <div class="form-group">
          <label for="nexusKey">API Key</label>
          <input
            id="nexusKey"
            type="password"
            [(ngModel)]="nexusApiKey"
            placeholder="Enter your Nexus Mods API key"
            class="form-input"
          />
          <p class="form-help">
            Get your free API key from your Nexus Mods account settings.
          </p>
        </div>
      </section>

      <section class="settings-section">
        <h2>LLM Provider</h2>
        <div class="form-group">
          <label for="provider">Provider</label>
          <select id="provider" [(ngModel)]="llmProvider" class="form-input">
            <option value="ollama">Ollama (Local)</option>
            <option value="groq">Groq (Cloud - Free Tier)</option>
            <option value="together">Together AI (Cloud - Free Tier)</option>
            <option value="huggingface">HuggingFace (Cloud - Free Tier)</option>
          </select>
        </div>

        @if (llmProvider === 'ollama') {
          <div class="form-group">
            <label for="ollamaUrl">Ollama URL</label>
            <input id="ollamaUrl" type="text" [(ngModel)]="ollamaBaseUrl" class="form-input" />
          </div>
          <div class="form-group">
            <label for="ollamaModel">Model</label>
            <input id="ollamaModel" type="text" [(ngModel)]="ollamaModel" class="form-input" />
          </div>
        }

        @if (llmProvider === 'groq') {
          <div class="form-group">
            <label for="groqKey">Groq API Key</label>
            <input id="groqKey" type="password" [(ngModel)]="groqApiKey" class="form-input" placeholder="Enter Groq API key" />
          </div>
        }

        @if (llmProvider === 'together') {
          <div class="form-group">
            <label for="togetherKey">Together AI API Key</label>
            <input id="togetherKey" type="password" [(ngModel)]="togetherApiKey" class="form-input" placeholder="Enter Together AI API key" />
          </div>
        }

        @if (llmProvider === 'huggingface') {
          <div class="form-group">
            <label for="hfKey">HuggingFace API Key</label>
            <input id="hfKey" type="password" [(ngModel)]="huggingfaceApiKey" class="form-input" placeholder="Enter HuggingFace API key" />
          </div>
        }
      </section>

      <section class="settings-section">
        <h2>Custom Mod Source</h2>
        <div class="form-group">
          <label for="customUrl">API URL</label>
          <input id="customUrl" type="text" [(ngModel)]="customSourceUrl" class="form-input" placeholder="https://api.example.com" />
        </div>
        <div class="form-group">
          <label for="customKey">API Key</label>
          <input id="customKey" type="password" [(ngModel)]="customSourceKey" class="form-input" placeholder="Optional API key" />
        </div>
      </section>

      <button class="btn-primary" (click)="saveSettings()">Save Settings</button>
    </div>
  `,
  styles: [`
    .settings-page { max-width: 600px; margin: 0 auto; padding: 2rem; }
    h1 { font-size: 1.75rem; font-weight: 700; margin-bottom: 2rem; }
    .settings-section {
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    h2 { font-size: 1.125rem; font-weight: 600; margin-bottom: 1rem; }
    .form-group { margin-bottom: 1rem; }
    .form-group label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      margin-bottom: 0.375rem;
      color: var(--color-text-muted);
    }
    .form-input {
      width: 100%;
      background: var(--color-bg-dark);
      border: 1px solid var(--color-border);
      border-radius: 6px;
      color: var(--color-text);
      padding: 0.625rem 0.75rem;
      font-family: inherit;
      font-size: 0.875rem;
      outline: none;
    }
    .form-input:focus { border-color: var(--color-primary); }
    select.form-input { cursor: pointer; }
    .form-help { font-size: 0.75rem; color: var(--color-text-muted); margin-top: 0.375rem; }
    .btn-primary {
      background: var(--color-primary);
      color: white;
      padding: 0.75rem 2rem;
      border-radius: 8px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      font-family: inherit;
      font-size: 0.875rem;
    }
    .btn-primary:hover { background: var(--color-primary-hover); }
  `],
})
export class SettingsComponent implements OnInit {
  nexusApiKey = '';
  llmProvider = 'ollama';
  ollamaBaseUrl = 'http://localhost:11434/v1';
  ollamaModel = 'llama3.1:8b';
  groqApiKey = '';
  togetherApiKey = '';
  huggingfaceApiKey = '';
  customSourceUrl = '';
  customSourceKey = '';

  constructor(
    private api: ApiService,
    private notifications: NotificationService,
  ) {}

  ngOnInit(): void {
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
        this.customSourceKey = settings.custom_source_api_key || '';
      },
      error: () => {},
    });
  }

  saveSettings(): void {
    this.api
      .updateSettings({
        nexus_api_key: this.nexusApiKey,
        llm_provider: this.llmProvider,
        ollama_base_url: this.ollamaBaseUrl,
        ollama_model: this.ollamaModel,
        groq_api_key: this.groqApiKey,
        together_api_key: this.togetherApiKey,
        huggingface_api_key: this.huggingfaceApiKey,
        custom_source_api_url: this.customSourceUrl,
        custom_source_api_key: this.customSourceKey,
      })
      .subscribe({
        next: () => this.notifications.success('Settings saved successfully'),
        error: () => this.notifications.error('Failed to save settings'),
      });
  }
}
