import { Component, Input } from '@angular/core';
import { UpperCasePipe } from '@angular/common';

@Component({
  selector: 'app-hardware-badge',
  standalone: true,
  imports: [UpperCasePipe],
  template: `
    <span class="badge" [class]="'badge-' + tier">
      {{ tier | uppercase }}
    </span>
  `,
  styles: [`
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .badge-low {
      background: #7f1d1d;
      color: #fca5a5;
    }
    .badge-mid {
      background: #78350f;
      color: #fcd34d;
    }
    .badge-high {
      background: #14532d;
      color: #86efac;
    }
    .badge-ultra {
      background: #312e81;
      color: #a5b4fc;
    }
  `],
})
export class HardwareBadgeComponent {
  @Input() tier: string = 'mid';
}
