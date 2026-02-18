import { Routes } from '@angular/router';
import { LandingComponent } from './features/landing/landing.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { BrowseComponent } from './features/browse/browse.component';
import { SetupComponent } from './features/setup/setup.component';
import { ModlistComponent } from './features/modlist/modlist.component';
import { DownloadsComponent } from './features/downloads/downloads.component';
import { SettingsComponent } from './features/settings/settings.component';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'browse', component: BrowseComponent },
  { path: 'setup', component: SetupComponent },
  { path: 'modlist/:id', component: ModlistComponent },
  { path: 'downloads', component: DownloadsComponent },
  { path: 'settings', component: SettingsComponent },
  { path: '**', redirectTo: '' },
];
