import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import type { CanActivateFn } from '@angular/router';

export const loginGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  console.log('LoginGuard: Checking if user should access login page');

  return authService.checkAuthStatus().pipe(
    map(response => {
      console.log('LoginGuard - Auth status response:', response);

      // Check if user is authenticated using auth service helper
      if (authService.isAuthenticatedResponse(response)) {
        console.log('LoginGuard: User is authenticated, redirecting to drive');
        authService.setCurrentUser({
          username: response.username || 'Unknown User',
          email: response.email,
          admin: response.admin
        });
        router.navigate(['/drive']);
        return false; // Prevent access to login page
      }

      // User is not authenticated, allow access to login page
      console.log('LoginGuard: User not authenticated, allowing access to login page');
      return true;
    }),
    catchError(error => {
      console.log('LoginGuard: Auth check failed, allowing access to login page', error);
      // If auth check fails, allow access to login page
      return of(true);
    })
  );
};
