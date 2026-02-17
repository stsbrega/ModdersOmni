import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './shared/components/header/header.component';
import { NotificationToastComponent } from './shared/components/notification-toast/notification-toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, NotificationToastComponent],
  template: `
    <app-header />
    <main>
      <router-outlet />
    </main>
    <app-notification-toast />
  `,
  styles: [`
    main {
      min-height: calc(100vh - 64px);
    }
  `],
})
export class AppComponent {}
