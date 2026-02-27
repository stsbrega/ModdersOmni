import {
  Component,
  signal,
  computed,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewChecked,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  trigger,
  transition,
  style,
  animate,
  query,
  stagger,
} from '@angular/animations';
import { GenerationService } from '../../core/services/generation.service';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';
import {
  GenerationEvent,
  ModAddedEvent,
  PatchAddedEvent,
} from '../../shared/models/generation.model';

@Component({
  selector: 'app-generation',
  standalone: true,
  imports: [RouterLink, FormsModule],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(8px)' }),
        animate(
          '300ms cubic-bezier(0.16, 1, 0.3, 1)',
          style({ opacity: 1, transform: 'translateY(0)' })
        ),
      ]),
    ]),
    trigger('staggerList', [
      transition('* => *', [
        query(
          ':enter',
          [
            style({ opacity: 0, transform: 'translateX(-12px)' }),
            stagger(60, [
              animate(
                '350ms cubic-bezier(0.16, 1, 0.3, 1)',
                style({ opacity: 1, transform: 'translateX(0)' })
              ),
            ]),
          ],
          { optional: true }
        ),
      ]),
    ]),
    trigger('slideUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate(
          '400ms cubic-bezier(0.16, 1, 0.3, 1)',
          style({ opacity: 1, transform: 'translateY(0)' })
        ),
      ]),
    ]),
  ],
  template: `
    <div class="generation-page">
      <!-- ── Animated Nexus Background ── -->
      @if (gen.status() === 'running') {
        <div class="nexus-bg" aria-hidden="true">
          <div class="nexus-node n1"></div>
          <div class="nexus-node n2"></div>
          <div class="nexus-node n3"></div>
          <div class="nexus-node n4"></div>
          <div class="nexus-node n5"></div>
          <div class="nexus-node n6"></div>
          <div class="nexus-node n7"></div>
          <div class="nexus-node n8"></div>
          <div class="nexus-node n9"></div>
          <div class="nexus-node n10"></div>
          <div class="nexus-node n11"></div>
          <div class="nexus-node n12"></div>
          <svg class="nexus-lines" viewBox="0 0 1000 800" preserveAspectRatio="none">
            <line x1="120" y1="150" x2="350" y2="100" class="nx-line l1"/>
            <line x1="350" y1="100" x2="600" y2="200" class="nx-line l2"/>
            <line x1="600" y1="200" x2="850" y2="120" class="nx-line l3"/>
            <line x1="120" y1="150" x2="200" y2="400" class="nx-line l4"/>
            <line x1="200" y1="400" x2="450" y2="350" class="nx-line l5"/>
            <line x1="450" y1="350" x2="600" y2="200" class="nx-line l6"/>
            <line x1="450" y1="350" x2="700" y2="500" class="nx-line l7"/>
            <line x1="700" y1="500" x2="850" y2="120" class="nx-line l8"/>
            <line x1="200" y1="400" x2="350" y2="600" class="nx-line l9"/>
            <line x1="350" y1="600" x2="550" y2="650" class="nx-line l10"/>
            <line x1="550" y1="650" x2="700" y2="500" class="nx-line l11"/>
            <line x1="700" y1="500" x2="900" y2="600" class="nx-line l12"/>
            <line x1="350" y1="100" x2="450" y2="350" class="nx-line l13"/>
            <line x1="120" y1="150" x2="350" y2="600" class="nx-line l14"/>
            <line x1="850" y1="120" x2="900" y2="600" class="nx-line l15"/>
          </svg>
        </div>
      }

      <!-- ── Top: Phase Progress ── -->
      <header class="phase-bar" @fadeIn>
        <div class="phase-bar-inner">
          <div class="phase-label">
            @if (gen.currentPhase(); as phase) {
              <span class="phase-number">Phase {{ phase.number }}/{{ phase.total_phases }}</span>
              <span class="phase-name">{{ phase.phase }}</span>
            } @else if (gen.status() === 'complete') {
              <span class="phase-done">Generation Complete</span>
            } @else if (gen.status() === 'error') {
              <span class="phase-error">Generation Failed</span>
            } @else if (gen.status() === 'paused') {
              <span class="phase-paused">Paused</span>
            } @else {
              <span class="phase-name">Initializing…</span>
            }
          </div>
          <div class="phase-track">
            @for (seg of phaseSegments(); track seg.num) {
              <div
                class="phase-seg"
                [class.completed]="seg.state === 'completed'"
                [class.active]="seg.state === 'active'"
                [class.pending]="seg.state === 'pending'"
              ></div>
            }
          </div>
        </div>
      </header>

      <!-- ── Main Content ── -->
      <div class="gen-body">
        <!-- Left: Timeline -->
        <section class="timeline-panel">
          <div class="panel-header">
            <h2>Activity</h2>
            <span class="event-count">{{ gen.events().length }} events</span>
          </div>
          <div class="timeline-scroll" #timelineEl>
            @for (evt of gen.events(); track $index) {
              <div
                class="tl-item"
                [class]="'tl-' + evt.type"
                @fadeIn
              >
                <!-- Icon -->
                <div class="tl-icon" [innerHTML]="iconFor(evt)"></div>

                <!-- Content -->
                <div class="tl-body">
                  @switch (evt.type) {
                    @case ('phase_start') {
                      <div class="tl-phase-header">
                        <span class="tl-phase-badge">Phase {{ $any(evt).number }}</span>
                        {{ $any(evt).phase }}
                      </div>
                    }
                    @case ('searching') {
                      <span class="tl-muted">Searching: <em>"{{ $any(evt).query }}"</em></span>
                    }
                    @case ('search_results') {
                      <span class="tl-muted">Found {{ $any(evt).count }} mods</span>
                    }
                    @case ('reading_mod') {
                      <span class="tl-dim">Reading mod #{{ $any(evt).mod_id }}…</span>
                    }
                    @case ('mod_added') {
                      <div class="tl-mod-add">
                        <strong>{{ $any(evt).name }}</strong>
                        <span class="tl-reason">{{ $any(evt).reason }}</span>
                      </div>
                    }
                    @case ('patch_added') {
                      <div class="tl-patch-add">
                        <strong>{{ $any(evt).name }}</strong>
                        <span class="tl-patches-list">patches {{ $any(evt).patches_mods?.join(', ') }}</span>
                      </div>
                    }
                    @case ('knowledge_flag') {
                      <div class="tl-flag" [class.critical]="$any(evt).severity === 'critical'">
                        <span class="tl-flag-badge">{{ $any(evt).severity }}</span>
                        {{ $any(evt).mod_a }} ↔ {{ $any(evt).mod_b }}: {{ $any(evt).issue }}
                      </div>
                    }
                    @case ('thinking') {
                      <span class="tl-thinking">{{ $any(evt).text }}</span>
                    }
                    @case ('phase_complete') {
                      <span class="tl-phase-done">Phase {{ $any(evt).number }} complete — {{ $any(evt).mod_count }} mods total</span>
                    }
                    @case ('retrying') {
                      <span class="tl-retry">Retrying in {{ $any(evt).wait_seconds }}s ({{ $any(evt).reason }})</span>
                    }
                    @case ('provider_error') {
                      <span class="tl-provider-err">{{ $any(evt).message }}</span>
                    }
                    @case ('provider_switch') {
                      <span class="tl-switch">Switched to {{ $any(evt).to_provider }}</span>
                    }
                    @case ('paused') {
                      <span class="tl-paused-msg">Paused — {{ $any(evt).reason }}</span>
                    }
                    @case ('resumed') {
                      <span class="tl-resumed-msg">Resumed at Phase {{ $any(evt).phase_number }}</span>
                    }
                    @case ('complete') {
                      <span class="tl-complete-msg">Generation complete!</span>
                    }
                    @case ('error') {
                      <span class="tl-error-msg">{{ $any(evt).message }}</span>
                    }
                  }
                </div>
              </div>
            }

            @if (gen.status() === 'running') {
              <div class="tl-item tl-working">
                <div class="tl-icon"><div class="dot-pulse"></div></div>
                <div class="tl-body"><span class="tl-dim">Working…</span></div>
              </div>
            }
          </div>

          @if (!userAtBottom()) {
            <button class="scroll-btn" (click)="scrollToBottom()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
              New events
            </button>
          }
        </section>

        <!-- Right: Modlist Builder -->
        <section class="modlist-panel">
          <div class="panel-header">
            <h2>Modlist</h2>
            <span class="mod-count">{{ gen.modsAdded().length }} mods · {{ gen.patchesAdded().length }} patches</span>
          </div>

          <!-- Terminal state banners -->
          @if (gen.status() === 'complete') {
            <div class="banner banner-success" @slideUp>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <div class="banner-text">
                <strong>Your modlist is ready!</strong>
                <p>{{ gen.modsAdded().length }} mods and {{ gen.patchesAdded().length }} patches selected.</p>
              </div>
              <a class="btn-gold" [routerLink]="['/modlist', gen.modlistId()]">View Modlist</a>
            </div>
          }

          @if (gen.status() === 'error') {
            <div class="banner banner-error" @slideUp>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              <div class="banner-text">
                <strong>Generation failed</strong>
                <p>{{ gen.errorMessage() }}</p>
              </div>
              <a class="btn-outline" routerLink="/setup">Start Over</a>
            </div>
          }

          @if (gen.status() === 'paused') {
            <div class="banner banner-paused" @slideUp>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="10" y1="15" x2="10" y2="9"/><line x1="14" y1="15" x2="14" y2="9"/></svg>
              <div class="banner-text">
                <strong>Generation paused</strong>
                <p>{{ gen.pauseInfo()?.reason }}</p>
                <p class="mods-saved">{{ gen.modsAdded().length }} mods saved from completed phases.</p>
              </div>

              <!-- Inline API key form for auth errors -->
              @if (isAuthError()) {
                <div class="inline-key-form">
                  <label>Enter your API key to continue:</label>
                  <div class="key-input-row">
                    <input
                      type="password"
                      class="input"
                      [(ngModel)]="apiKeyInput"
                      placeholder="sk-..."
                    >
                    <button
                      class="btn-gold btn-sm"
                      [disabled]="resuming() || !apiKeyInput"
                      (click)="updateKeyAndResume()"
                    >
                      @if (resuming()) {
                        <span class="btn-spinner"></span>
                      }
                      Update & Resume
                    </button>
                  </div>
                </div>
              } @else {
                <button
                  class="btn-gold btn-sm"
                  [disabled]="resuming()"
                  (click)="resume()"
                >
                  @if (resuming()) {
                    <span class="btn-spinner"></span>
                  }
                  Resume
                </button>
              }
              <a class="link-muted" routerLink="/setup">Start over</a>
            </div>
          }

          <!-- Mod cards -->
          <div class="mod-cards" [@staggerList]="gen.modsAdded().length + gen.patchesAdded().length">
            @for (mod of gen.modsAdded(); track mod.mod_id) {
              <div class="mod-card">
                <div class="mod-card-top">
                  <span class="lo-badge">#{{ mod.load_order }}</span>
                  <span class="mod-name">{{ mod.name }}</span>
                </div>
                <p class="mod-reason">{{ mod.reason }}</p>
              </div>
            }
            @for (patch of gen.patchesAdded(); track patch.mod_id) {
              <div class="mod-card patch-card">
                <div class="mod-card-top">
                  <span class="lo-badge patch-badge">P</span>
                  <span class="mod-name">{{ patch.name }}</span>
                </div>
                <p class="mod-reason">Patches: {{ patch.patches_mods?.join(', ') }}</p>
              </div>
            }
          </div>

          <!-- Knowledge flags -->
          @if (knowledgeFlags().length) {
            <div class="flags-section">
              <h3>Compatibility Notes</h3>
              @for (flag of knowledgeFlags(); track $index) {
                <div class="flag-card" [class.critical]="flag.severity === 'critical'">
                  <span class="flag-severity">{{ flag.severity }}</span>
                  <div>
                    <strong>{{ flag.mod_a }} ↔ {{ flag.mod_b }}</strong>
                    <p>{{ flag.issue }}</p>
                  </div>
                </div>
              }
            </div>
          }
        </section>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        background: var(--color-bg-dark);
      }

      /* ── Phase Bar ── */
      .phase-bar {
        position: sticky;
        top: 0;
        z-index: 10;
        background: var(--color-bg-card);
        border-bottom: 1px solid var(--color-border);
        padding: 0.875rem 1.5rem;
      }
      .phase-bar-inner {
        max-width: 1400px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        gap: 1.25rem;
      }
      .phase-label {
        display: flex;
        align-items: center;
        gap: 0.625rem;
        flex-shrink: 0;
        min-width: 220px;
      }
      .phase-number {
        background: var(--color-gold);
        color: #0D0D0F;
        font-size: 0.6875rem;
        font-weight: 700;
        padding: 0.2rem 0.5rem;
        border-radius: 4px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .phase-name {
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--color-text);
      }
      .phase-done {
        color: #22c55e;
        font-weight: 600;
        font-size: 0.875rem;
      }
      .phase-error {
        color: #ef4444;
        font-weight: 600;
        font-size: 0.875rem;
      }
      .phase-paused {
        color: #f59e0b;
        font-weight: 600;
        font-size: 0.875rem;
      }
      .phase-track {
        flex: 1;
        display: flex;
        gap: 3px;
        height: 6px;
      }
      .phase-seg {
        flex: 1;
        border-radius: 3px;
        transition: background 0.4s;
      }
      .phase-seg.completed {
        background: var(--color-gold);
      }
      .phase-seg.active {
        background: var(--color-gold);
        animation: seg-pulse 1.5s ease-in-out infinite;
      }
      .phase-seg.pending {
        background: var(--color-border);
      }
      @keyframes seg-pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.45;
        }
      }

      /* ── Body Grid ── */
      .gen-body {
        max-width: 1400px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: 1.4fr 1fr;
        gap: 1px;
        min-height: calc(100vh - 52px);
        background: var(--color-border);
      }

      /* ── Panel shared ── */
      .timeline-panel,
      .modlist-panel {
        background: var(--color-bg-dark);
        display: flex;
        flex-direction: column;
      }
      .panel-header {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        padding: 1rem 1.25rem 0.75rem;
        border-bottom: 1px solid var(--color-border);
      }
      .panel-header h2 {
        font-size: 0.8125rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--color-text-muted);
      }
      .event-count,
      .mod-count {
        font-size: 0.75rem;
        color: var(--color-text-dim);
      }

      /* ── Timeline ── */
      .timeline-panel {
        position: relative;
      }
      .timeline-scroll {
        flex: 1;
        overflow-y: auto;
        padding: 0.75rem 1rem;
        scroll-behavior: smooth;
      }
      .timeline-scroll::-webkit-scrollbar {
        width: 5px;
      }
      .timeline-scroll::-webkit-scrollbar-thumb {
        background: var(--color-border-hover);
        border-radius: 3px;
      }

      .tl-item {
        display: flex;
        gap: 0.625rem;
        padding: 0.375rem 0;
        align-items: flex-start;
        font-size: 0.8125rem;
        line-height: 1.45;
      }
      .tl-icon {
        flex-shrink: 0;
        width: 22px;
        height: 22px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-text-dim);
      }
      .tl-icon svg {
        width: 14px;
        height: 14px;
      }
      .tl-body {
        flex: 1;
        min-width: 0;
      }

      /* Phase header */
      .tl-phase_start {
        margin-top: 0.5rem;
        padding: 0.5rem 0;
      }
      .tl-phase-header {
        font-weight: 600;
        color: var(--color-gold);
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .tl-phase-badge {
        background: rgba(196, 165, 90, 0.15);
        color: var(--color-gold);
        font-size: 0.625rem;
        font-weight: 700;
        padding: 0.15rem 0.4rem;
        border-radius: 3px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      /* Text variants */
      .tl-muted {
        color: var(--color-text-muted);
      }
      .tl-muted em {
        color: var(--color-text);
        font-style: normal;
      }
      .tl-dim {
        color: var(--color-text-dim);
      }
      .tl-thinking {
        color: var(--color-text-dim);
        font-style: italic;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      /* Mod added */
      .tl-mod_added .tl-icon {
        color: #22c55e;
      }
      .tl-mod-add strong {
        color: var(--color-text);
        display: block;
      }
      .tl-reason {
        color: var(--color-text-dim);
        font-size: 0.75rem;
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      /* Patch added */
      .tl-patch_added .tl-icon {
        color: #6b9fbf;
      }
      .tl-patch-add strong {
        color: var(--color-text);
        display: block;
      }
      .tl-patches-list {
        color: var(--color-text-dim);
        font-size: 0.75rem;
      }

      /* Knowledge flag */
      .tl-flag {
        font-size: 0.75rem;
        color: var(--color-text-muted);
      }
      .tl-flag-badge {
        display: inline-block;
        font-size: 0.625rem;
        font-weight: 700;
        text-transform: uppercase;
        padding: 0.1rem 0.35rem;
        border-radius: 3px;
        background: rgba(245, 158, 11, 0.15);
        color: #f59e0b;
        margin-right: 0.25rem;
      }
      .tl-flag.critical .tl-flag-badge {
        background: rgba(239, 68, 68, 0.15);
        color: #ef4444;
      }

      /* Phase complete */
      .tl-phase-done {
        color: var(--color-gold);
        font-weight: 500;
        font-size: 0.75rem;
      }

      /* Retry / error */
      .tl-retry {
        color: #f59e0b;
        font-size: 0.75rem;
      }
      .tl-provider-err {
        color: #ef4444;
        font-size: 0.75rem;
      }
      .tl-switch {
        color: var(--color-text-muted);
        font-size: 0.75rem;
      }
      .tl-paused-msg {
        color: #f59e0b;
        font-weight: 500;
      }
      .tl-resumed-msg {
        color: #22c55e;
        font-weight: 500;
      }
      .tl-complete-msg {
        color: #22c55e;
        font-weight: 600;
      }
      .tl-error-msg {
        color: #ef4444;
        font-weight: 500;
      }

      /* Working indicator */
      .dot-pulse {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--color-gold);
        animation: dot-blink 1.2s ease-in-out infinite;
      }
      @keyframes dot-blink {
        0%,
        100% {
          opacity: 0.2;
        }
        50% {
          opacity: 1;
        }
      }

      /* Scroll-to-bottom button */
      .scroll-btn {
        position: absolute;
        bottom: 12px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--color-bg-elevated);
        border: 1px solid var(--color-border-hover);
        color: var(--color-text-muted);
        padding: 0.35rem 0.75rem;
        border-radius: 20px;
        font-size: 0.75rem;
        display: flex;
        align-items: center;
        gap: 0.35rem;
        cursor: pointer;
        box-shadow: var(--shadow-card);
        transition:
          background 0.15s,
          color 0.15s;
      }
      .scroll-btn:hover {
        background: var(--color-bg-surface);
        color: var(--color-text);
      }

      /* ── Modlist Panel ── */
      .modlist-panel {
        overflow-y: auto;
        padding-bottom: 2rem;
      }

      /* Banners */
      .banner {
        margin: 1rem 1.25rem;
        padding: 1rem;
        border-radius: var(--radius-md);
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        border: 1px solid;
      }
      .banner > svg {
        flex-shrink: 0;
      }
      .banner-text strong {
        display: block;
        font-size: 0.875rem;
        margin-bottom: 0.15rem;
      }
      .banner-text p {
        font-size: 0.8125rem;
        color: var(--color-text-muted);
        margin: 0;
      }
      .mods-saved {
        font-size: 0.75rem !important;
        color: var(--color-text-dim) !important;
        margin-top: 0.25rem !important;
      }
      .banner-success {
        background: rgba(34, 197, 94, 0.06);
        border-color: rgba(34, 197, 94, 0.2);
      }
      .banner-error {
        background: rgba(239, 68, 68, 0.06);
        border-color: rgba(239, 68, 68, 0.2);
      }
      .banner-paused {
        background: rgba(245, 158, 11, 0.06);
        border-color: rgba(245, 158, 11, 0.2);
      }

      /* Inline key form */
      .inline-key-form {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .inline-key-form label {
        font-size: 0.75rem;
        color: var(--color-text-muted);
      }
      .key-input-row {
        display: flex;
        gap: 0.5rem;
      }
      .input {
        flex: 1;
        background: var(--color-bg-dark);
        border: 1px solid var(--color-border);
        border-radius: 6px;
        color: var(--color-text);
        padding: 0.5rem 0.625rem;
        font-size: 0.8125rem;
        outline: none;
        transition: border-color 0.15s;
      }
      .input:focus {
        border-color: var(--color-gold);
        box-shadow: 0 0 0 3px rgba(196, 165, 90, 0.1);
      }
      .input::placeholder {
        color: var(--color-text-dim);
      }

      /* Buttons */
      .btn-gold {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.4rem;
        background: var(--color-gold);
        color: #0d0d0f;
        padding: 0.55rem 1rem;
        border-radius: 8px;
        font-weight: 600;
        font-size: 0.8125rem;
        transition:
          background 0.2s,
          box-shadow 0.3s;
        text-decoration: none;
        white-space: nowrap;
        cursor: pointer;
        border: none;
      }
      .btn-gold:hover {
        background: var(--color-gold-hover);
        box-shadow: 0 0 16px var(--color-gold-glow);
      }
      .btn-gold:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .btn-sm {
        padding: 0.45rem 0.75rem;
        font-size: 0.75rem;
      }
      .btn-outline {
        display: inline-flex;
        align-items: center;
        padding: 0.5rem 1rem;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        color: var(--color-text);
        font-weight: 500;
        font-size: 0.8125rem;
        background: transparent;
        text-decoration: none;
        cursor: pointer;
        transition:
          border-color 0.15s,
          background 0.15s;
      }
      .btn-outline:hover {
        border-color: var(--color-border-hover);
        background: rgba(255, 255, 255, 0.03);
      }
      .link-muted {
        font-size: 0.75rem;
        color: var(--color-text-dim);
        text-decoration: none;
        transition: color 0.15s;
        text-align: center;
      }
      .link-muted:hover {
        color: var(--color-text-muted);
      }
      .btn-spinner {
        width: 12px;
        height: 12px;
        border: 2px solid rgba(13, 13, 15, 0.3);
        border-top-color: #0d0d0f;
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      /* ── Mod Cards ── */
      .mod-cards {
        padding: 0.75rem 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .mod-card {
        background: var(--color-bg-card);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        padding: 0.625rem 0.75rem;
        transition: border-color 0.15s;
      }
      .mod-card:hover {
        border-color: var(--color-border-hover);
      }
      .mod-card-top {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .lo-badge {
        font-size: 0.625rem;
        font-weight: 700;
        color: var(--color-gold);
        background: rgba(196, 165, 90, 0.1);
        padding: 0.1rem 0.35rem;
        border-radius: 3px;
        flex-shrink: 0;
      }
      .patch-badge {
        color: #6b9fbf !important;
        background: rgba(107, 159, 191, 0.1) !important;
      }
      .mod-name {
        font-size: 0.8125rem;
        font-weight: 500;
        color: var(--color-text);
      }
      .mod-reason {
        font-size: 0.75rem;
        color: var(--color-text-dim);
        margin: 0.25rem 0 0 0;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .patch-card {
        border-left: 2px solid rgba(107, 159, 191, 0.4);
      }

      /* ── Knowledge Flags ── */
      .flags-section {
        padding: 0.75rem 1.25rem;
        border-top: 1px solid var(--color-border);
      }
      .flags-section h3 {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--color-text-dim);
        margin-bottom: 0.5rem;
      }
      .flag-card {
        display: flex;
        gap: 0.5rem;
        padding: 0.5rem 0.625rem;
        background: rgba(245, 158, 11, 0.05);
        border: 1px solid rgba(245, 158, 11, 0.12);
        border-radius: var(--radius-sm);
        margin-bottom: 0.375rem;
        font-size: 0.75rem;
      }
      .flag-card.critical {
        background: rgba(239, 68, 68, 0.05);
        border-color: rgba(239, 68, 68, 0.12);
      }
      .flag-severity {
        font-size: 0.5625rem;
        font-weight: 700;
        text-transform: uppercase;
        padding: 0.1rem 0.3rem;
        border-radius: 3px;
        background: rgba(245, 158, 11, 0.15);
        color: #f59e0b;
        flex-shrink: 0;
        height: fit-content;
      }
      .flag-card.critical .flag-severity {
        background: rgba(239, 68, 68, 0.15);
        color: #ef4444;
      }
      .flag-card strong {
        font-size: 0.75rem;
        display: block;
        color: var(--color-text);
      }
      .flag-card p {
        font-size: 0.6875rem;
        color: var(--color-text-muted);
        margin: 0.15rem 0 0;
      }

      /* ── Animated Nexus Background ── */
      .nexus-bg {
        position: fixed;
        inset: 0;
        z-index: 0;
        pointer-events: none;
        overflow: hidden;
        opacity: 0;
        animation: nexus-fade-in 2s ease-out 0.5s forwards;
      }
      @keyframes nexus-fade-in {
        to { opacity: 1; }
      }

      .nexus-lines {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
      }
      .nx-line {
        stroke: var(--color-gold);
        stroke-width: 0.5;
        opacity: 0;
        animation: line-draw 1.5s ease-out forwards, line-pulse 4s ease-in-out infinite;
      }
      @keyframes line-draw {
        from { stroke-dasharray: 600; stroke-dashoffset: 600; opacity: 0; }
        to { stroke-dasharray: 600; stroke-dashoffset: 0; opacity: 0.06; }
      }
      @keyframes line-pulse {
        0%, 100% { opacity: 0.04; }
        50% { opacity: 0.08; }
      }
      .l1 { animation-delay: 0.2s, 0.2s; }
      .l2 { animation-delay: 0.35s, 0.6s; }
      .l3 { animation-delay: 0.5s, 1.0s; }
      .l4 { animation-delay: 0.3s, 0.4s; }
      .l5 { animation-delay: 0.55s, 0.8s; }
      .l6 { animation-delay: 0.7s, 1.2s; }
      .l7 { animation-delay: 0.85s, 0.3s; }
      .l8 { animation-delay: 0.4s, 0.9s; }
      .l9 { animation-delay: 0.6s, 1.4s; }
      .l10 { animation-delay: 0.75s, 0.5s; }
      .l11 { animation-delay: 0.9s, 1.1s; }
      .l12 { animation-delay: 0.45s, 0.7s; }
      .l13 { animation-delay: 0.65s, 1.3s; }
      .l14 { animation-delay: 0.8s, 0.2s; }
      .l15 { animation-delay: 0.95s, 1.5s; }

      .nexus-node {
        position: absolute;
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background: var(--color-gold);
        opacity: 0;
        animation: node-appear 0.6s ease-out forwards, node-glow 3s ease-in-out infinite;
        box-shadow: 0 0 8px rgba(196, 165, 90, 0.3);
      }
      @keyframes node-appear {
        from { transform: scale(0); opacity: 0; }
        to { transform: scale(1); opacity: 0.25; }
      }
      @keyframes node-glow {
        0%, 100% { opacity: 0.15; box-shadow: 0 0 6px rgba(196, 165, 90, 0.2); }
        50% { opacity: 0.35; box-shadow: 0 0 14px rgba(196, 165, 90, 0.4); }
      }
      /* Node positions matching the SVG line endpoints */
      .n1 { left: 12%; top: 19%; animation-delay: 0.2s, 0.5s; }
      .n2 { left: 35%; top: 12.5%; animation-delay: 0.35s, 1.0s; }
      .n3 { left: 60%; top: 25%; animation-delay: 0.5s, 0.3s; }
      .n4 { left: 85%; top: 15%; animation-delay: 0.65s, 0.8s; }
      .n5 { left: 20%; top: 50%; animation-delay: 0.3s, 1.2s; }
      .n6 { left: 45%; top: 44%; animation-delay: 0.55s, 0.6s; }
      .n7 { left: 70%; top: 62.5%; animation-delay: 0.7s, 1.5s; }
      .n8 { left: 35%; top: 75%; animation-delay: 0.45s, 0.9s; }
      .n9 { left: 55%; top: 81%; animation-delay: 0.8s, 0.4s; }
      .n10 { left: 90%; top: 75%; animation-delay: 0.6s, 1.1s; }
      .n11 { left: 8%; top: 85%; animation-delay: 0.4s, 0.7s; }
      .n12 { left: 78%; top: 38%; animation-delay: 0.75s, 1.3s; }

      /* Ensure content sits above the nexus */
      .phase-bar, .gen-body {
        position: relative;
        z-index: 1;
      }

      /* ── Mobile ── */
      @media (max-width: 800px) {
        .gen-body {
          grid-template-columns: 1fr;
        }
        .timeline-panel {
          max-height: 50vh;
        }
        .phase-label {
          min-width: 0;
        }
      }
    `,
  ],
})
export class GenerationComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('timelineEl') timelineEl!: ElementRef<HTMLDivElement>;

  apiKeyInput = '';
  resuming = signal(false);
  userAtBottom = signal(true);
  private prevEventCount = 0;
  private shouldAutoScroll = true;

  // Derived helpers
  phaseSegments = computed(() => {
    const total = this.gen.totalPhases();
    const current = this.gen.currentPhase();
    const completedPhases = new Set<number>();

    for (const evt of this.gen.events()) {
      if (evt.type === 'phase_complete') {
        completedPhases.add((evt as any).number);
      }
    }

    const segments: { num: number; state: 'completed' | 'active' | 'pending' }[] = [];
    for (let i = 1; i <= total; i++) {
      if (completedPhases.has(i)) {
        segments.push({ num: i, state: 'completed' });
      } else if (current && current.number === i) {
        segments.push({ num: i, state: 'active' });
      } else {
        segments.push({ num: i, state: 'pending' });
      }
    }
    return segments;
  });

  knowledgeFlags = computed(() =>
    this.gen
      .events()
      .filter((e) => e.type === 'knowledge_flag')
      .map((e) => e as any)
  );

  isAuthError = computed(() => {
    const info = this.gen.pauseInfo();
    if (!info) return false;
    const reason = (info.reason || '').toLowerCase();
    return (
      reason.includes('api key') ||
      reason.includes('auth') ||
      reason.includes('401') ||
      reason.includes('invalid key')
    );
  });

  constructor(
    public gen: GenerationService,
    private api: ApiService,
    private notifications: NotificationService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.gen.reconnectIfNeeded(id);
    }
  }

  ngOnDestroy(): void {
    // Don't disconnect — let the service persist across navigation.
    // Only disconnect on terminal states to free resources.
    const status = this.gen.status();
    if (status === 'complete' || status === 'error') {
      this.gen.disconnectEvents();
    }
  }

  ngAfterViewChecked(): void {
    const el = this.timelineEl?.nativeElement;
    if (!el) return;

    const evtCount = this.gen.events().length;
    if (evtCount > this.prevEventCount && this.shouldAutoScroll) {
      el.scrollTop = el.scrollHeight;
      this.prevEventCount = evtCount;
    }

    // Track if user has scrolled up
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    this.userAtBottom.set(atBottom);
    if (atBottom) {
      this.shouldAutoScroll = true;
    }
  }

  scrollToBottom(): void {
    const el = this.timelineEl?.nativeElement;
    if (el) {
      this.shouldAutoScroll = true;
      el.scrollTop = el.scrollHeight;
    }
  }

  resume(): void {
    const id = this.gen.generationId();
    if (!id) return;
    this.resuming.set(true);
    this.gen.resumeGeneration(id).subscribe({
      next: () => {
        this.resuming.set(false);
        this.gen.connectToEvents(id);
      },
      error: (err) => {
        this.resuming.set(false);
        this.notifications.error(err.error?.detail || 'Resume failed');
      },
    });
  }

  updateKeyAndResume(): void {
    if (!this.apiKeyInput) return;
    this.resuming.set(true);

    // Extract provider from the error message if possible
    const reason = this.gen.pauseInfo()?.reason || '';
    const providerMatch = reason.match(/^([^:]+):/);
    const providerKey = providerMatch
      ? providerMatch[1].trim().toLowerCase().replace(/\s+/g, '_')
      : 'default';

    this.api.saveLlmKeys({ [providerKey]: this.apiKeyInput }).subscribe({
      next: () => {
        this.apiKeyInput = '';
        this.resume();
      },
      error: () => {
        this.resuming.set(false);
        this.notifications.error('Failed to save API key');
      },
    });
  }

  iconFor(evt: GenerationEvent): string {
    const icons: Record<string, string> = {
      phase_start:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--color-gold)"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
      searching:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>',
      search_results:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>',
      reading_mod:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
      mod_added:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>',
      patch_added:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
      knowledge_flag:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:#f59e0b"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      thinking:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h.01M12 12h.01M16 12h.01"/></svg>',
      phase_complete:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--color-gold)"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      retrying:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:#f59e0b"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>',
      provider_error:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:#ef4444"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      provider_switch:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><path d="M21 3 9 15"/><polyline points="9 21 3 21 3 15"/><path d="M3 21 15 9"/></svg>',
      paused:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:#f59e0b"><circle cx="12" cy="12" r="10"/><line x1="10" y1="15" x2="10" y2="9"/><line x1="14" y1="15" x2="14" y2="9"/></svg>',
      resumed:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:#22c55e"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>',
      complete:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:#22c55e"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      error:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:#ef4444"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    };
    return icons[evt.type] || '';
  }
}
