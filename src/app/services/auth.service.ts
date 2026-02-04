import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface User {
  username: string;
  email?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface UpdateProfileRequest {
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Check if user is already logged in
    this.checkAuthStatus().subscribe({
      next: (response) => {
        if (response.success) {
          this.setCurrentUser({
            username: response.username,
            email: response.email
          });
        }
      },
      error: (err) => {
        console.log('Initial auth check failed:', err);
      }
    });
  }

  /**
   * Login user with username and password
   * Using API-first approach with JSON
   */
  login(credentials: LoginRequest): Observable<any> {
    const csrfToken = this.getCsrfToken();
    const headers: any = {
      'Content-Type': 'application/json'
    };
    if (csrfToken) {
      headers['X-XSRF-TOKEN'] = csrfToken;
    }

    return this.http.post(`${this.apiUrl}/api/auth/login`, credentials, {
      withCredentials: true,
      headers
    });
  }

  /**
   * Register a new user
   */
  register(credentials: RegisterRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/auth/register`, credentials, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Update user profile (email and/or password)
   */
  updateProfile(data: UpdateProfileRequest): Observable<any> {
    const csrfToken = this.getCsrfToken();
    const headers: any = {
      'Content-Type': 'application/json'
    };
    if (csrfToken) {
      headers['X-XSRF-TOKEN'] = csrfToken;
    }

    return this.http.put(`${this.apiUrl}/api/auth/update-profile`, data, {
      withCredentials: true,
      headers
    });
  }

  /**
   * Logout current user
   */
  logout(): Observable<any> {
    const csrfToken = this.getCsrfToken();
    const headers: any = {};
    if (csrfToken) {
      headers['X-XSRF-TOKEN'] = csrfToken;
    }

    return this.http.post(`${this.apiUrl}/api/auth/logout`, {}, {
      withCredentials: true,
      headers
    });
  }

  /**
   * Check if user is currently authenticated
   * Returns the full response object from backend
   */
  checkAuthStatus(): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/auth/user`, {
      withCredentials: true
    }).pipe(
      map((response: any) => {
        console.log('Auth status response:', response);
        // Return full response object: {success: true, username: "...", email: "...", bucket: "..."}
        return response;
      }),
      catchError((error) => {
        console.log('Auth check error:', error.status, error.message);
        // Return error indicator
        return of({ success: false, error: error.message });
      })
    );
  }

  /**
   * Set current user
   */
  setCurrentUser(user: User | null) {
    this.currentUserSubject.next(user);
  }

  /**
   * Get current user value
   */
  get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Check if user is logged in
   */
  isLoggedIn(): boolean {
    return this.currentUserValue !== null;
  }

  /**
   * Validate current session with server
   */
  validateSession(): Observable<boolean> {
    return this.checkAuthStatus().pipe(
      map(response => {
        if (response.success) {
          // Update user info if session is valid
          this.setCurrentUser({
            username: response.username,
            email: response.email
          });
          return true;
        } else {
          // Clear user info if session is invalid
          this.setCurrentUser(null);
          return false;
        }
      }),
      catchError(() => {
        this.setCurrentUser(null);
        return of(false);
      })
    );
  }

  /**
   * Check if auth response indicates authenticated user
   */
  isAuthenticatedResponse(response: any): boolean {
    return response && response.success === true;
  }

  /**
   * Health check endpoint to keep session active
   * Should be called periodically (e.g., every 5 minutes) to prevent session timeout
   */
  healthCheck(): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/auth/health`, {
      withCredentials: true
    }).pipe(
      catchError((error) => {
        // If 401, user is not authenticated
        if (error.status === 401) {
          this.setCurrentUser(null);
          this.router.navigate(['/login']);
        }
        return of({ success: false });
      })
    );
  }

  /**
   * Get CSRF token from cookies
   */
  private getCsrfToken(): string | null {
    const cookieValue = document.cookie
      .split('; ')
      .find(row => row.startsWith('XSRF-TOKEN='));
    return cookieValue ? decodeURIComponent(cookieValue.split('=')[1]) : null;
  }
}
