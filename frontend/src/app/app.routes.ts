import { Routes } from '@angular/router';
import { LandingComponent } from './features/landing/landing.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { BrowseComponent } from './features/browse/browse.component';
import { SetupComponent } from './features/setup/setup.component';
import { ModlistComponent } from './features/modlist/modlist.component';
import { DownloadsComponent } from './features/downloads/downloads.component';
import { SettingsComponent } from './features/settings/settings.component';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { AuthCallbackComponent } from './features/auth/callback/auth-callback.component';
import { VerifyEmailComponent } from './features/auth/verify-email/verify-email.component';
import { ForgotPasswordComponent } from './features/auth/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './features/auth/reset-password/reset-password.component';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', component: LandingComponent },

  // Auth routes (guest-only)
  { path: 'auth/login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'auth/register', component: RegisterComponent, canActivate: [guestGuard] },
  { path: 'auth/callback', component: AuthCallbackComponent },
  { path: 'auth/verify-email', component: VerifyEmailComponent },
  { path: 'auth/forgot-password', component: ForgotPasswordComponent, canActivate: [guestGuard] },
  { path: 'auth/reset-password', component: ResetPasswordComponent },

  // Protected routes
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'browse', component: BrowseComponent, canActivate: [authGuard] },
  { path: 'setup', component: SetupComponent, canActivate: [authGuard] },
  { path: 'downloads', component: DownloadsComponent, canActivate: [authGuard] },
  { path: 'settings', component: SettingsComponent, canActivate: [authGuard] },

  // Public routes
  { path: 'modlist/:id', component: ModlistComponent },

  { path: '**', redirectTo: '' },
];
