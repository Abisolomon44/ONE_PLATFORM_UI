import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { Router, RouterLink } from '@angular/router';
import { BasePill } from '../../shared/base-data';
import { DashboardData } from '../../core/models';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [LucideAngularModule, BasePill, DatePipe, RouterLink],
  template: `
    <div class="page-header">
      <div>
        <h1>Dashboard</h1>
        <div class="page-sub">Platform overview and tenant health at a glance.</div>
      </div>
    </div>

    <div class="grid grid-4">
      <div class="card stat-card">
        <span class="stat-icon" style="background: var(--accent-soft); color: var(--accent)">
          <i-lucide name="building-2" [size]="22"></i-lucide>
        </span>
        <div>
          <div class="stat-label">Total Tenants</div>
          <div class="stat-value">{{ data()?.totalTenants ?? 0 }}</div>
          <div class="stat-hint">{{ data()?.activeTenants ?? 0 }} active</div>
        </div>
      </div>
      <div class="card stat-card">
        <span class="stat-icon" style="background: var(--success-soft); color: var(--success)">
          <i-lucide name="badge-check" [size]="22"></i-lucide>
        </span>
        <div>
          <div class="stat-label">Subscriptions</div>
          <div class="stat-value">{{ data()?.totalSubscriptions ?? 0 }}</div>
          <div class="stat-hint">{{ data()?.activeSubscriptions ?? 0 }} active</div>
        </div>
      </div>
      <div class="card stat-card">
        <span class="stat-icon" style="background: var(--warning-soft); color: var(--warning)">
          <i-lucide name="wallet" [size]="22"></i-lucide>
        </span>
        <div>
          <div class="stat-label">Monthly MRR</div>
          <div class="stat-value currency">\${{ mrr() }}</div>
          <div class="stat-hint">{{ data()?.expiringSoonCount ?? 0 }} expiring soon</div>
        </div>
      </div>
      <div class="card stat-card">
        <span class="stat-icon" style="background: var(--info-soft); color: var(--info)">
          <i-lucide name="badge-dollar-sign" [size]="22"></i-lucide>
        </span>
        <div>
          <div class="stat-label">Plans</div>
          <div class="stat-value">{{ data()?.totalPlans ?? 0 }}</div>
          <div class="stat-hint">pricing tiers</div>
        </div>
      </div>
    </div>

    <div class="card mt-3">
      <div class="card-header">
        <div>
          <h3>Recent Tenants</h3>
          <div class="card-sub">Most recently created tenant accounts</div>
        </div>
        <div class="card-actions">
          <a class="btn btn-outline btn-sm" routerLink="/tenants">View all tenants</a>
        </div>
      </div>
      @if (data()?.recentTenants?.length) {
        <div class="table-wrap">
          <table class="btable">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Code</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              @for (tenant of data()?.recentTenants; track tenant.tenantId) {
                <tr>
                  <td style="font-weight:600">{{ tenant.tenantName }}</td>
                  <td><span class="badge">{{ tenant.tenantCode }}</span></td>
                  <td><base-pill [status]="tenant.status" [label]="tenant.status"></base-pill></td>
                  <td class="text-muted">{{ tenant.createdDate | date: 'MMM d, yyyy h:mm a' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="empty-state" style="padding: 36px">
          <i-lucide name="building-2" [size]="38" class="empty-icon"></i-lucide>
          <div class="empty-title">No tenants yet</div>
          <a class="btn btn-primary" routerLink="/tenants">Create your first tenant</a>
        </div>
      }
    </div>
  `,
})
export class DashboardPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly data = signal<DashboardData | null>(null);

  constructor() {
    void this.load();
  }

  protected readonly mrr = () =>
    new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(
      this.data()?.monthlyRecurringRevenue ?? 0,
    );

  private async load(): Promise<void> {
    try {
      const data = await firstValueFrom(this.http.get<DashboardData>('/api/dashboard'));
      this.data.set(data);
    } catch {
      this.toast.error('Failed to load dashboard');
    }
  }
}
