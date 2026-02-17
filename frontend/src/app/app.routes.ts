import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { SetupComponent } from './features/setup/setup.component';
import { ModlistComponent } from './features/modlist/modlist.component';
import { DownloadsComponent } from './features/downloads/downloads.component';
import { SettingsComponent } from './features/settings/settings.component';

export const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'setup', component: SetupComponent },
  { path: 'modlist/:id', component: ModlistComponent },
  { path: 'downloads', component: DownloadsComponent },
  { path: 'settings', component: SettingsComponent },
  { path: '**', redirectTo: '' },
];
