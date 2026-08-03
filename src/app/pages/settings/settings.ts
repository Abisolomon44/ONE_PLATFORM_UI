import { Component, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ThemeService, AccentColor } from '../../core/theme.service';
import { AuthService } from '../../core/auth.service';

interface AccentOption {
  value: AccentColor;
  label: string;
  color: string;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div class="page-header">
      <div>
        <h1>Settings</h1>
        <div class="page-sub">Customize the platform console appearance.</div>
      </div>
    </div>

    <div class="grid grid-2" style="align-items: start; gap: 20px">
      <div>
        <div class="card">
          <div class="card-header">
            <i-lucide name="palette" [size]="18" style="color: var(--accent)"></i-lucide>
            <div>
              <h3>Theme</h3>
              <div class="card-sub">Appearance of the console</div>
            </div>
          </div>
          <div class="card-body">
            <div class="field-label mb-1">Mode</div>
            <div style="display:flex; gap:10px; margin-bottom: 22px">
              <button class="btn" [class.btn-primary]="theme.mode() === 'light'" [class.btn-secondary]="theme.mode() !== 'light'" (click)="theme.mode.set('light')">
                <i-lucide name="sun" [size]="16"></i-lucide> Light
              </button>
              <button class="btn" [class.btn-primary]="theme.mode() === 'dark'" [class.btn-secondary]="theme.mode() !== 'dark'" (click)="theme.mode.set('dark')">
                <i-lucide name="moon" [size]="16"></i-lucide> Dark
              </button>
            </div>

            <div class="field-label mb-1">Accent color</div>
            <div style="display:flex; gap:10px">
              @for (opt of accents; track opt.value) {
                <button
                  class="icon-btn"
                  [style.width.px]="34"
                  [style.height.px]="34"
                  [style.background]="opt.color"
                  [style.border-color]="theme.accent() === opt.value ? 'var(--text)' : 'transparent'"
                  [attr.title]="opt.label"
                  (click)="theme.setAccent(opt.value)">
                  @if (theme.accent() === opt.value) {
                    <i-lucide name="check" [size]="16" style="color: #fff"></i-lucide>
                  }
                </button>
              }
            </div>
          </div>
        </div>
      </div>

      <div>
        <div class="card">
          <div class="card-header">
            <i-lucide name="user" [size]="18" style="color: var(--accent)"></i-lucide>
            <div>
              <h3>Profile</h3>
              <div class="card-sub">Signed in account</div>
            </div>
          </div>
          <div class="card-body">
            <div class="flex gap-3">
              <span class="avatar" style="width: 52px; height: 52px; font-size: 19px; background: var(--accent-soft-2); color: var(--accent); border-radius: 50%; display: flex; align-items: center; justify-content: center">
                {{ initials }}
              </span>
              <div>
                <div style="font-weight:700; font-size: 16px">{{ auth.user()?.fullName }}</div>
                <div class="text-muted" style="font-size: 13px">{{ auth.user()?.email }}</div>
              </div>
            </div>
            <div style="border-top: 1px solid var(--border); margin-top: 18px; padding-top: 14px">
              <div class="flex-between" style="padding: 4px 0">
                <span class="text-muted">Username</span><span style="font-weight:600">{{ auth.user()?.username }}</span>
              </div>
              <div class="flex-between" style="padding: 4px 0">
                <span class="text-muted">Role</span><span class="badge">{{ auth.user()?.role }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class SettingsPage {
  protected readonly theme = inject(ThemeService);
  protected readonly auth = inject(AuthService);

  protected readonly accents: AccentOption[] = [
    { value: 'blue', label: 'Blue', color: '#2563eb' },
    { value: 'green', label: 'Green', color: '#059669' },
    { value: 'purple', label: 'Purple', color: '#7c3aed' },
    { value: 'orange', label: 'Orange', color: '#ea580c' },
    { value: 'red', label: 'Red', color: '#dc2626' },
  ];

  protected get initials(): string {
    const name = this.auth.user()?.fullName || this.auth.user()?.username || 'A';
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'A';
  }
}
