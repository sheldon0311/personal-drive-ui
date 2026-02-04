import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, LoginRequest } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <h1>Keshav Personal Drive</h1>
          <p>Please sign in to access your files</p>
        </div>

        <form (ngSubmit)="onLogin()" #loginForm="ngForm" class="login-form">
          <div class="form-group">
            <label for="username">Username:</label>
            <input
              type="text"
              id="username"
              name="username"
              [(ngModel)]="credentials.username"
              required
              class="form-control"
              placeholder="Enter your username"
              [disabled]="loading()"
            />
          </div>

          <div class="form-group">
            <label for="password">Password:</label>
            <input
              type="password"
              id="password"
              name="password"
              [(ngModel)]="credentials.password"
              required
              class="form-control"
              placeholder="Enter your password"
              [disabled]="loading()"
            />
          </div>

          <div class="form-actions">
            <button
              type="submit"
              class="btn-login"
              [disabled]="!loginForm.form.valid || loading()"
            >
              {{ loading() ? 'Signing in...' : 'Sign In' }}
            </button>
          </div>

          <div *ngIf="error()" class="error-message">
            {{ error() }}
          </div>
        </form>

        <div class="login-footer">
          <p>Secure file storage and management</p>
          <p>Don't have an account? <a (click)="goToRegister()" class="register-link">Create Account</a></p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }

    .login-card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.1);
      padding: 40px;
      width: 100%;
      max-width: 400px;
    }

    .login-header {
      text-align: center;
      margin-bottom: 30px;
    }

    .login-header h1 {
      color: #333;
      font-size: 28px;
      margin: 0 0 10px 0;
      font-weight: 600;
    }

    .login-header p {
      color: #666;
      margin: 0;
      font-size: 14px;
    }

    .login-form {
      margin-bottom: 20px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 6px;
      color: #333;
      font-weight: 500;
      font-size: 14px;
    }

    .form-control {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e1e5e9;
      border-radius: 8px;
      font-size: 16px;
      transition: border-color 0.3s, box-shadow 0.3s;
      box-sizing: border-box;
    }

    .form-control:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .form-control:disabled {
      background-color: #f8f9fa;
      cursor: not-allowed;
    }

    .form-actions {
      margin-bottom: 20px;
    }

    .btn-login {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.3s, transform 0.2s;
    }

    .btn-login:hover:not(:disabled) {
      opacity: 0.9;
      transform: translateY(-1px);
    }

    .btn-login:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .error-message {
      background-color: #f8d7da;
      color: #721c24;
      padding: 12px 16px;
      border-radius: 6px;
      border: 1px solid #f5c6cb;
      font-size: 14px;
      margin-top: 15px;
    }

    .login-footer {
      text-align: center;
      padding-top: 20px;
      border-top: 1px solid #eee;
    }

    .login-footer p {
      color: #999;
      font-size: 12px;
      margin: 5px 0;
    }

    .register-link {
      color: #667eea;
      cursor: pointer;
      text-decoration: none;
      font-weight: 500;
    }

    .register-link:hover {
      text-decoration: underline;
    }

    @media (max-width: 480px) {
      .login-card {
        padding: 30px 20px;
        margin: 10px;
      }

      .login-header h1 {
        font-size: 24px;
      }
    }
  `]
})
export class LoginComponent implements OnInit {
  credentials: LoginRequest = {
    username: '',
    password: ''
  };

  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    // Check if user is already authenticated and redirect to drive
    console.log('Login page initialized');
    this.checkAuthAndRedirect();
  }

  private checkAuthAndRedirect() {
    this.authService.checkAuthStatus().subscribe({
      next: (response) => {
        console.log('Auth check response:', response);
        // Check if user is authenticated using auth service helper
        if (this.authService.isAuthenticatedResponse(response)) {
          console.log('User already authenticated, redirecting to drive...');
          this.authService.setCurrentUser({
            username: response.username || 'Unknown User',
            email: response.email,
            admin: response.admin
          });
          this.router.navigate(['/drive']);
        }
      },
      error: (err) => {
        // User is not authenticated, stay on login page
        console.log('User not authenticated, staying on login page');
      }
    });
  }

  onLogin() {
    if (!this.credentials.username || !this.credentials.password) {
      this.error.set('Please enter both username and password');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.authService.login(this.credentials).subscribe({
      next: (response) => {
        console.log('Login response:', response);
        this.loading.set(false);

        // Check if login was successful - backend returns {success: true}
        if (response && response.success === true) {
          console.log('Login successful, redirecting to drive...');
          this.authService.setCurrentUser({
            username: this.credentials.username,
            email: response.email,
            admin: response.admin
          });
          this.router.navigate(['/drive']);
        } else {
          console.log('Login failed:', response.message || 'Unknown error');
          this.error.set(response.message || 'Invalid username or password');
        }
      },
      error: (err) => {
        this.loading.set(false);
        console.error('Login error:', err);

        if (err.status === 403) {
          // Check for specific bucket assignment error
          if (err.error?.message && err.error.message.includes('storage bucket')) {
            this.error.set(err.error.message);
          } else {
            this.error.set('Invalid username or password');
          }
        } else if (err.status === 401) {
          this.error.set('Invalid username or password');
        } else {
          this.error.set('Login failed. Please try again.');
        }
      }
    });
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }
}
