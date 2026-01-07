import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, RegisterRequest } from '../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="register-container">
      <div class="register-form">
        <div class="register-header">
          <img src="/page_logo.png" alt="Personal Drive Logo" class="register-logo">
          <h2>Create Account</h2>
          <p>Join Personal Drive to start storing your files securely</p>
        </div>

        <form (ngSubmit)="register()" #registerForm="ngForm">
          <div class="form-group">
            <label for="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              [(ngModel)]="username"
              required
              placeholder="Enter your username"
              #usernameInput="ngModel">
            <div *ngIf="usernameInput.invalid && usernameInput.touched" class="error-text">
              Username is required
            </div>
          </div>

          <div class="form-group">
            <label for="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              [(ngModel)]="email"
              required
              email
              placeholder="Enter your email"
              #emailInput="ngModel">
            <div *ngIf="emailInput.invalid && emailInput.touched" class="error-text">
              <span *ngIf="emailInput.errors?.['required']">Email is required</span>
              <span *ngIf="emailInput.errors?.['email']">Please enter a valid email</span>
            </div>
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              [(ngModel)]="password"
              required
              minlength="6"
              placeholder="Enter your password"
              #passwordInput="ngModel">
            <div *ngIf="passwordInput.invalid && passwordInput.touched" class="error-text">
              <span *ngIf="passwordInput.errors?.['required']">Password is required</span>
              <span *ngIf="passwordInput.errors?.['minlength']">Password must be at least 6 characters</span>
            </div>
          </div>

          <div class="form-group">
            <label for="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              [(ngModel)]="confirmPassword"
              required
              placeholder="Confirm your password"
              #confirmPasswordInput="ngModel">
            <div *ngIf="confirmPasswordInput.invalid && confirmPasswordInput.touched" class="error-text">
              Confirm password is required
            </div>
            <div *ngIf="password() !== confirmPassword() && confirmPasswordInput.touched" class="error-text">
              Passwords do not match
            </div>
          </div>

          <div *ngIf="error()" class="error">
            {{ error() }}
          </div>

          <div *ngIf="success()" class="success">
            {{ success() }}
          </div>

          <button
            type="submit"
            class="btn-register"
            [disabled]="registerForm.invalid || loading() || password() !== confirmPassword()">
            {{ loading() ? 'Creating Account...' : 'Create Account' }}
          </button>
        </form>

        <div class="register-footer">
          <p>Already have an account? <a (click)="goToLogin()" class="login-link">Sign In</a></p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .register-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }

    .register-form {
      background-color: var(--bg-secondary);
      border-radius: 8px;
      padding: 2rem;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      width: 100%;
      max-width: 400px;
      border: 1px solid var(--border-color);
    }

    .register-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .register-logo {
      height: 3rem;
      width: auto;
      margin-bottom: 1rem;
    }

    .register-header h2 {
      margin: 0 0 0.5rem 0;
      color: var(--text-primary);
      font-size: 1.8rem;
    }

    .register-header p {
      margin: 0;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      color: var(--text-primary);
      font-weight: 500;
      font-size: 0.9rem;
    }

    .form-group input {
      width: 100%;
      padding: 12px;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      background-color: var(--bg-primary);
      color: var(--text-primary);
      font-size: 1rem;
      box-sizing: border-box;
    }

    .form-group input:focus {
      outline: none;
      border-color: #007bff;
      box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
    }

    .btn-register {
      width: 100%;
      background-color: #007bff;
      color: white;
      border: none;
      padding: 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1rem;
      margin-top: 1rem;
      transition: background-color 0.2s;
    }

    .btn-register:hover:not(:disabled) {
      background-color: #0056b3;
    }

    .btn-register:disabled {
      background-color: #6c757d;
      cursor: not-allowed;
    }

    .error {
      background-color: #f8d7da;
      color: #721c24;
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 1rem;
      border: 1px solid #f5c6cb;
    }

    [data-theme="dark"] .error {
      background-color: #5c1a1a;
      color: #f8a7a7;
      border-color: #842029;
    }

    .success {
      background-color: #d1edcc;
      color: #155724;
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 1rem;
      border: 1px solid #c3e6cb;
    }

    [data-theme="dark"] .success {
      background-color: #1a5c1a;
      color: #a7f8a7;
      border-color: #0f5132;
    }

    .error-text {
      color: #dc3545;
      font-size: 0.8rem;
      margin-top: 0.25rem;
    }

    .register-footer {
      text-align: center;
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border-color);
    }

    .register-footer p {
      margin: 0;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    .login-link {
      color: #007bff;
      cursor: pointer;
      text-decoration: none;
    }

    .login-link:hover {
      text-decoration: underline;
    }
  `]
})
export class RegisterComponent {
  username = signal<string>('');
  email = signal<string>('');
  password = signal<string>('');
  confirmPassword = signal<string>('');
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  register() {
    if (this.password() !== this.confirmPassword()) {
      this.error.set('Passwords do not match');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    const registerData = {
      username: this.username().trim(),
      email: this.email().trim(),
      password: this.password()
    };

    this.authService.register(registerData).subscribe({
      next: (response) => {
        this.loading.set(false);
        this.success.set('Account created successfully! You can now login.');

        // Clear form
        this.username.set('');
        this.email.set('');
        this.password.set('');
        this.confirmPassword.set('');

        // Redirect to login after 2 seconds
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (err) => {
        this.loading.set(false);
        console.error('Registration error:', err);

        if (err.error?.message) {
          this.error.set(err.error.message);
        } else {
          this.error.set('Registration failed. Please try again.');
        }
      }
    });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
