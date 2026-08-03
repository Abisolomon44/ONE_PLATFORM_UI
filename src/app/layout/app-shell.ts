import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../core/auth.service';
import { ThemeService } from '../core/theme.service';
import { BaseButton } from '../shared/base-button';
import { BaseToast } from '../shared/base-feedback';

interface NavItem {
  route: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule, BaseButton, BaseToast],
  template: `
    <div class="shell">
      <aside class="sidebar" [class.collapsed]="collapsed()">
        <div class="sidebar-brand">
          <span class="brand-logo"><i-lucide name="layers" [size]="20"></i-lucide></span>
          @if (!collapsed()) {
            <div>
              <div class="brand-name">ONE ERP</div>
              <div class="brand-sub">Platform Console</div>
            </div>
          }
        </div>

        <nav class="sidebar-nav">
          <div class="sidebar-section">Manage</div>
          @for (item of navItems(); track item.route) {
            <a class="nav-item" routerLink="/{{ item.route }}" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: item.route === 'dashboard' }">
              <i-lucide [name]="item.icon" [size]="18"></i-lucide>
              @if (!collapsed()) {
                <span>{{ item.label }}</span>
              }
            </a>
          }
        </nav>

        <div class="sidebar-footer">
          <div class="user-chip">
            <span class="avatar">{{ initials() }}</span>
            @if (!collapsed()) {
              <div class="user-meta">
                <div class="user-name">{{ auth.user()?.fullName || auth.user()?.username }}</div>
                <div class="user-role">{{ auth.user()?.role }}</div>
              </div>
            }
          </div>
        </div>
      </aside>

      <div class="shell-body">
        <header class="topbar">
          <button class="icon-btn" aria-label="Toggle sidebar" (click)="collapsed.update((v) => !v)">
            <i-lucide [name]="collapsed() ? 'panel-left-open' : 'panel-left-close'" [size]="19"></i-lucide>
          </button>
          <div class="topbar-title">{{ pageTitle() }}</div>
          <div class="topbar-spacer"></div>
          <button class="icon-btn" aria-label="Toggle theme" (click)="theme.toggleMode()">
            <i-lucide [name]="theme.mode() === 'light' ? 'moon' : 'sun'" [size]="18"></i-lucide>
          </button>
          <base-button variant="ghost" icon="log-out" label="Logout" (click)="logout()">Logout</base-button>
        </header>

        <main class="shell-main">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
    <base-toast></base-toast>
  `,
})
export class AppShell {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  private readonly router = inject(Router);

  protected readonly collapsed = signal(false);

  protected readonly navItems = signal<NavItem[]>([
    { route: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
    { route: 'tenants', label: 'Tenants', icon: 'building-2' },
    { route: 'plans', label: 'Plans', icon: 'badge-dollar-sign' },
    { route: 'subscriptions', label: 'Subscriptions', icon: 'credit-card' },
    { route: 'settings', label: 'Settings', icon: 'settings' },
  ]);

  protected readonly pageTitle = computed(() => {
    const url = this.router.url.split('?')[0];
    const item = this.navItems().find((i) => url.startsWith('/' + i.route));
    return item?.label ?? 'ONE ERP';
  });

  protected readonly initials = computed(() => {
    const name = this.auth.user()?.fullName || this.auth.user()?.username || 'A';
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'A';
  });

  protected logout(): void {
    void this.auth.logout().then(() => this.router.navigate(['/login']));
  }
}
