import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  console.log('Auth guard checking authentication for:', state.url);

  return authService.checkAuthStatus().pipe(
    map(response => {
      console.log('Auth guard response:', response);
      const isAuthenticated = authService.isAuthenticatedResponse(response);
      if (isAuthenticated) {
        console.log('Authentication verified, allowing access');
        // Ensure current user is set
        authService.setCurrentUser({
          username: response.username || 'Unknown User',
          email: response.email,
          admin: response.admin
        });
        return true;
      } else {
        console.log('Not authenticated, redirecting to login');
        router.navigate(['/login']);
        return false;
      }
    }),
    catchError((error) => {
      console.log('Auth guard error, redirecting to login:', error);
      router.navigate(['/login']);
      return of(false);
    })
  );
};
