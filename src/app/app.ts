import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('personal-drive-ui');
  currentTheme = signal<string>('light');

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Set initial theme based on authentication status
    this.updateTheme();

    // Listen to route changes to update theme
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateTheme();
    });
  }

  private updateTheme() {
    const isAuthenticated = this.authService.isLoggedIn();
    const currentRoute = this.router.url;

    // Apply dark theme after login (when not on login page and authenticated)
    if (isAuthenticated && currentRoute !== '/login') {
      this.currentTheme.set('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      this.updateFavicon('dark');
    } else {
      this.currentTheme.set('light');
      document.documentElement.setAttribute('data-theme', 'light');
      this.updateFavicon('light');
    }
  }

  private updateFavicon(theme: string) {
    const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (favicon) {
      // You'll need to create two versions of the favicon with matching background colors
      const faviconPath = theme === 'dark' ? 'page_logo_dark.png' : 'page_logo_light.png';
      console.log(`Updating favicon to: ${faviconPath} for theme: ${theme}`);

      // Force browser to reload favicon by adding a timestamp
      const timestamp = new Date().getTime();
      favicon.href = `${faviconPath}?v=${timestamp}`;
    }
  }
}
