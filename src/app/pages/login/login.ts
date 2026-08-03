import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/auth.service';
import { ThemeService } from '../../core/theme.service';
import { ToastService } from '../../core/toast.service';
import { BaseButton } from '../../shared/base-button';
import { BaseInput } from '../../shared/base-controls';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, BaseButton, BaseInput],
  template: `
    <div class="auth-page">
      <div class="auth-side">
        <div class="auth-logo">
          <span class="auth-logo-badge"><i-lucide name="layers" [size]="24"></i-lucide></span>
          <div>
            <div class="auth-name">ONE ERP</div>
            <div style="opacity:.85; font-size:12.5px; letter-spacing:1px; font-weight:600">PLATFORM CONSOLE</div>
          </div>
        </div>
        <div>
          <div class="auth-quote">One platform. Every tenant.<br />Fully isolated. Effortless.</div>
          <div class="auth-quote-sub">
            Manage tenants, plans and subscriptions for your multi-tenant ERP network with automatic database provisioning.
          </div>
        </div>
        <div style="display:flex; flex-direction:column; gap:12px">
          <div class="auth-feature"><i-lucide name="database" [size]="18"></i-lucide> Automatic per-tenant database provisioning</div>
          <div class="auth-feature"><i-lucide name="shield-check" [size]="18"></i-lucide> Isolated tenant data with scoped access</div>
          <div class="auth-feature"><i-lucide name="chart-line" [size]="18"></i-lucide> Subscription & revenue insights</div>
        </div>
      </div>

      <div class="auth-main">
        <div class="auth-box">
          <div class="auth-logo">
            <span class="auth-logo-badge"><i-lucide name="layers" [size]="24"></i-lucide></span>
            <div>
              <div class="auth-name">ONE ERP</div>
              <div style="color: var(--text-3); font-size:12px; font-weight:600; letter-spacing:1px">PLATFORM</div>
            </div>
          </div>
          <h1 class="auth-title">Welcome back</h1>
          <div class="auth-sub">Sign in to the platform console with your administrator credentials.</div>

          <form (ngSubmit)="submit()" style="display:block">
            <base-input label="Username" icon="user" id="username" [(value)]="username" autocomplete="username"></base-input>
            <base-input label="Password" type="password" icon="key-round" id="password" [(value)]="password" autocomplete="current-password" [error]="error()"></base-input>
            <base-button type="submit" [loading]="loading()" [block]="true" style="margin-top:6px" [disabled]="!username() || !password()">
              Sign in
            </base-button>
          </form>

          <div class="auth-footer">
            © 2026 ONE ERP. Enterprise Multi-Tenant Platform.
          </div>
        </div>
      </div>
    </div>
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  protected readonly theme = inject(ThemeService);

  protected readonly username = signal('admin');
  protected readonly password = signal('PlatformAdmin@123');
  protected readonly loading = signal(false);
  protected readonly error = signal('');

  protected async submit(): Promise<void> {
    if (!this.username() || !this.password() || this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    try {
      await this.auth.login(this.username(), this.password());
      this.toast.success('Welcome back', `Signed in as ${this.username()}`);
      await this.router.navigate(['/']);
    } catch (e) {
      const body = (e as { error?: { message?: string } })?.error;
      const message = body?.message ?? (e as { message?: string })?.message;
      this.error.set(message || 'Invalid username or password.');
    } finally {
      this.loading.set(false);
    }
  }
}
