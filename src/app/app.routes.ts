import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { loginGuard } from './guards/login.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./components/login.component').then(c => c.LoginComponent),
    canActivate: [loginGuard]
  },
  {
    path: 'register',
    loadComponent: () => import('./components/register.component').then(c => c.RegisterComponent),
    canActivate: [loginGuard]
  },
  {
    path: 'drive',
    loadComponent: () => import('./components/drive.component').then(c => c.DriveComponent),
    canActivate: [authGuard]
  }
];
