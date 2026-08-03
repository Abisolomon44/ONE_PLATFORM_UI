import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { BaseEmpty } from '../../shared/base-data';
import { BasePagination } from '../../shared/base-data';
import { BasePill } from '../../shared/base-data';
import { BaseButton } from '../../shared/base-button';
import { BaseDialog } from '../../shared/base-feedback';
import { BaseLoader } from '../../shared/base-feedback';
import { BaseInput, BaseDropdown, BaseSearch, DropdownOption } from '../../shared/base-controls';
import { Paginated, Plan, Tenant } from '../../core/models';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-tenants',
  standalone: true,
  imports: [
    DatePipe, LucideAngularModule, BaseEmpty, BasePagination, BasePill, BaseButton,
    BaseDialog, BaseLoader, BaseInput, BaseDropdown, BaseSearch,
  ],
  template: `
    <base-loader [loading]="creating()" message="Provisioning tenant database..."></base-loader>

    <div class="page-header">
      <div>
        <h1>Tenants</h1>
        <div class="page-sub">Manage tenant accounts and their provisioned databases.</div>
      </div>
      <div class="page-actions">
        <base-search [(value)]="search" placeholder="Search tenants..."></base-search>
        <base-button icon="plus" (click)="openCreate()">New Tenant</base-button>
      </div>
    </div>

    <div class="card">
      @if (loading()) {
        <div class="flex" style="justify-content:center; padding: 44px">
          <span class="spinner spinner-lg" style="color: var(--accent)"></span>
        </div>
      } @else if (tenants().length === 0) {
        <base-empty icon="building-2" title="No tenants found" subtitle="Create a tenant to provision its database automatically.">
          <base-button icon="plus" (click)="openCreate()" class="mt-2">New Tenant</base-button>
        </base-empty>
      } @else {
        <div class="table-wrap">
          <table class="btable">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Code</th>
                <th>Database</th>
                <th>Plan</th>
                <th>Admin</th>
                <th>Status</th>
                <th>Subscription</th>
                <th>Created</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (tenant of tenants(); track tenant.tenantId) {
                <tr>
                  <td>
                    <div style="font-weight:600">{{ tenant.tenantName }}</div>
                    <div class="text-muted" style="font-size:11.5px">{{ tenant.companyName || '—' }}</div>
                  </td>
                  <td><span class="badge">{{ tenant.tenantCode }}</span></td>
                  <td class="text-muted">
                    <span class="flex gap-1">
                      <i-lucide [name]="tenant.databaseProvisioned ? 'database' : 'database-zap'" [size]="14"></i-lucide>
                      {{ tenant.databaseName }}
                    </span>
                  </td>
                  <td>
                    <span class="flex gap-1">
                      {{ tenant.planName ?? '—' }}
                      @if (tenant.currencyCode) {
                        <span class="badge">{{ tenant.currencyCode }}</span>
                      }
                    </span>
                  </td>
                  <td>
                    @if (tenant.adminUsername) {
                      <div style="font-weight:600">{{ tenant.adminUsername }}</div>
                      <div class="text-muted" style="font-size:11.5px">{{ tenant.adminPassword || '—' }}</div>
                    } @else {
                      <span class="text-muted">—</span>
                    }
                  </td>
                  <td><base-pill [status]="tenant.status" [label]="tenant.status"></base-pill></td>
                  <td>
                    @if (tenant.subscriptionStatus) {
                      <base-pill [status]="tenant.subscriptionStatus" [label]="tenant.subscriptionStatus"></base-pill>
                      <div class="text-muted mt-1" style="font-size:11.5px">
                        {{ tenant.subscriptionEnd | date: 'MMM d, yyyy' }}
                      </div>
                    } @else {
                      <span class="text-muted">No subscription</span>
                    }
                  </td>
                  <td class="text-muted">{{ tenant.createdDate | date: 'MMM d, yyyy' }}</td>
                  <td class="cell-actions">
                    <base-button variant="secondary" size="sm" icon="square-pen" [iconOnly]="true" label="Edit tenant" (click)="openEdit(tenant)"></base-button>
                    <base-button
                      [variant]="tenant.status === 'Active' ? 'danger' : 'primary'"
                      size="sm"
                      [icon]="tenant.status === 'Active' ? 'power' : 'shield-check'"
                      [loading]="statusUpdating() === tenant.tenantId"
                      [label]="tenant.status === 'Active' ? 'Deactivate' : 'Activate'"
                      (click)="toggleStatus(tenant)"></base-button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <div class="card-footer">
          <base-pagination [(page)]="page" [size]="size()" [total]="total()"></base-pagination>
        </div>
      }
    </div>

    <base-dialog [open]="dialogOpen()" [title]="editing() ? 'Edit Tenant' : 'Create Tenant'" [footer]="true" (closeRequest)="dialogOpen.set(false)">
      <base-input label="Tenant Name" icon="building-2" [(value)]="form.tenantName"></base-input>
      <base-input label="Company Name" icon="factory" [(value)]="form.companyName" hint="Used to seed the tenant company."></base-input>
      <base-input label="Tenant Code" icon="badge" [(value)]="form.tenantCode" [hint]="editing() ? '' : 'Short unique code, e.g. ACME'" [disabled]="!!editing()"></base-input>
      @if (!editing()) {
        <base-input label="Database Name" icon="database" [(value)]="form.databaseName" hint="Will be provisioned automatically, e.g. ERP_ACME"></base-input>
      }
      <base-dropdown label="Plan" icon="badge-dollar-sign" [options]="planOptions()" [(value)]="form.planId"></base-dropdown>
      <base-input label="Contact Email" type="email" icon="mail" [(value)]="form.contactEmail"></base-input>
      @if (!editing()) {
        <base-input label="Admin Username" icon="user-cog" [(value)]="form.adminUsername" hint="Globally unique login for the tenant, e.g. admin_acme"></base-input>
        <base-input label="Admin Password" type="password" icon="lock" [(value)]="form.adminPassword" hint="Min 8 characters. Used to sign into the tenant ERP."></base-input>
      }
      <div class="grid grid-2" style="gap: 0 16px">
        <base-input label="Subscription Start" type="date" [(value)]="form.subscriptionStart"></base-input>
        <base-input label="Subscription End" type="date" [(value)]="form.subscriptionEnd"></base-input>
      </div>

      <div class="dialog-footer" style="padding: 18px 0 0; border-top: 1px solid var(--border); margin-top: 6px">
        <base-button variant="secondary" (click)="dialogOpen.set(false)">Cancel</base-button>
        <base-button [loading]="saving()" [disabled]="!valid()" (click)="save()">
          {{ editing() ? 'Save Changes' : 'Create & Provision' }}
        </base-button>
      </div>
    </base-dialog>
  `,
})
export class TenantsPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  protected readonly tenants = signal<Tenant[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly creating = signal(false);
  protected readonly saving = signal(false);
  protected readonly page = signal(1);
  protected readonly size = signal(10);
  protected readonly search = signal('');
  protected readonly plans = signal<Plan[]>([]);
  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<Tenant | null>(null);
  protected readonly statusUpdating = signal<number | null>(null);

  protected readonly form = {
    tenantName: signal(''),
    companyName: signal(''),
    tenantCode: signal(''),
    databaseName: signal(''),
    planId: signal<string | number>(''),
    contactEmail: signal(''),
    adminUsername: signal(''),
    adminPassword: signal(''),
    subscriptionStart: signal(''),
    subscriptionEnd: signal(''),
  };

  constructor() {
    void this.loadPlans();
    effect(() => {
      this.search();
      this.page();
      void this.load();
    });
  }

  protected readonly planOptions = (): DropdownOption[] =>
    this.plans().map((p) => ({ value: p.planId, label: `${p.planName} — ${p.currencyCode} ${p.monthlyPrice}/mo` }));

  protected readonly valid = (): boolean =>
    !!this.form.tenantName() &&
    !!this.form.companyName() &&
    !!this.form.tenantCode() &&
    (!!this.editing() || !!this.form.databaseName()) &&
    !!this.form.planId() &&
    (!!this.editing() || (!!this.form.adminUsername() && this.form.adminPassword().length >= 8)) &&
    !!this.form.subscriptionStart() &&
    !!this.form.subscriptionEnd();

  protected openCreate(): void {
    this.editing.set(null);
    this.form.tenantName.set('');
    this.form.companyName.set('');
    this.form.tenantCode.set('');
    this.form.databaseName.set('');
    this.form.planId.set(this.plans()[0]?.planId ?? '');
    this.form.contactEmail.set('');
    this.form.adminUsername.set('');
    this.form.adminPassword.set('');
    this.form.subscriptionStart.set('');
    this.form.subscriptionEnd.set('');
    this.dialogOpen.set(true);
  }

  protected openEdit(tenant: Tenant): void {
    this.editing.set(tenant);
    this.form.tenantName.set(tenant.tenantName);
    this.form.companyName.set(tenant.companyName ?? '');
    this.form.tenantCode.set(tenant.tenantCode);
    this.form.databaseName.set(tenant.databaseName);
    this.form.planId.set(tenant.planId ?? '');
    this.form.contactEmail.set(tenant.contactEmail ?? '');
    this.form.adminUsername.set(tenant.adminUsername ?? '');
    this.form.adminPassword.set('');
    this.form.subscriptionStart.set((tenant.subscriptionStart ?? '').slice(0, 10));
    this.form.subscriptionEnd.set((tenant.subscriptionEnd ?? '').slice(0, 10));
    this.dialogOpen.set(true);
  }

  protected async save(): Promise<void> {
    if (!this.valid() || this.saving()) return;
    this.saving.set(true);
    try {
      if (this.editing()) {
        await firstValueFrom(
          this.http.put(`/api/tenants/${this.editing()!.tenantId}`, {
            tenantName: this.form.tenantName(),
            companyName: this.form.companyName(),
            contactEmail: this.form.contactEmail() || null,
            status: this.editing()!.status,
          }),
        );
        this.toast.success('Tenant updated');
      } else {
        const tenantCode = this.form.tenantCode().toUpperCase().replace(/[^A-Z0-9_]/g, '');
        const databaseName = this.form.databaseName().replace(/[^A-Za-z0-9_]/g, '');
        const adminUsername = this.form.adminUsername().replace(/[^A-Za-z0-9_]/g, '');
        const start = new Date(this.form.subscriptionStart());
        const end = new Date(this.form.subscriptionEnd());
        if (!tenantCode) {
          this.toast.error('Invalid tenant code', 'Use letters, digits and underscores only.');
          return;
        }
        if (!databaseName) {
          this.toast.error('Invalid database name', 'Use letters, digits and underscores only.');
          return;
        }
        if (!adminUsername) {
          this.toast.error('Invalid admin username', 'Use letters, digits and underscores only.');
          return;
        }
        if (this.form.adminPassword().length < 8) {
          this.toast.error('Invalid admin password', 'Password must be at least 8 characters.');
          return;
        }
        if (end <= start) {
          this.toast.error('Invalid subscription dates', 'End date must be after the start date.');
          return;
        }
        if (end <= new Date()) {
          this.toast.error('Invalid subscription dates', 'End date must be in the future.');
          return;
        }
        const email = this.form.contactEmail().trim();
        if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
          this.toast.error('Invalid email', 'Enter a valid contact email or leave it blank.');
          return;
        }
        this.creating.set(true);
        await firstValueFrom(
          this.http.post('/api/tenants', {
            tenantName: this.form.tenantName().trim(),
            companyName: this.form.companyName().trim(),
            tenantCode,
            databaseName,
            planId: Number(this.form.planId()),
            subscriptionStart: start.toISOString(),
            subscriptionEnd: end.toISOString(),
            contactEmail: email || null,
            adminUsername,
            adminPassword: this.form.adminPassword(),
          }),
        );
        this.toast.success('Tenant created', 'Database provisioned successfully.');
      }
      this.dialogOpen.set(false);
      await this.load();
    } catch {
      /* handled by interceptor */
    } finally {
      this.saving.set(false);
      this.creating.set(false);
    }
  }

  protected async toggleStatus(tenant: Tenant): Promise<void> {
    const target = tenant.status === 'Active' ? 'Suspended' : 'Active';
    this.statusUpdating.set(tenant.tenantId);
    try {
      await firstValueFrom(
        this.http.put(`/api/tenants/${tenant.tenantId}/status`, { status: target }),
      );
      this.toast.success(target === 'Active' ? 'Tenant activated' : 'Tenant deactivated');
      await this.load();
    } catch {
      /* handled by interceptor */
    } finally {
      this.statusUpdating.set(null);
    }
  }

  private async loadPlans(): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<Paginated<Plan>>('/api/plans?page=1&size=100'));
      this.plans.set(res.items);
    } catch {
      /* ignored */
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(
        this.http.get<Paginated<Tenant>>(`/api/tenants?page=${this.page()}&size=${this.size()}&search=${encodeURIComponent(this.search())}`),
      );
      this.tenants.set(res.items);
      this.total.set(res.totalCount);
    } catch {
      this.toast.error('Failed to load tenants');
    } finally {
      this.loading.set(false);
    }
  }
}
