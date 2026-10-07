import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { BaseEmpty, BasePagination, BasePill } from '../../shared/base-data';
import { BaseButton } from '../../shared/base-button';
import { BaseDialog } from '../../shared/base-feedback';
import { BaseDropdown, BaseInput, DropdownOption } from '../../shared/base-controls';
import { Paginated, Plan, Subscription, Tenant } from '../../core/models';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-subscriptions',
  standalone: true,
  imports: [DatePipe, LucideAngularModule, BaseEmpty, BasePagination, BasePill, BaseButton, BaseDialog, BaseDropdown, BaseInput],
  template: `
    <div class="page-header">
      <div>
        <h1>Subscriptions</h1>
        <div class="page-sub">Assign plans to tenants and track subscription status.</div>
      </div>
     <div class="page-actions">
        @if (selectedRows().length > 0) {
          <base-button variant="danger" icon="trash-2" (click)="openDeleteSelected()">Delete Selected ({{ selectedRows().length }})</base-button>
        }
        <base-button icon="plus" (click)="openCreate()">New Subscription</base-button>
      </div>
    </div>

    <div class="card">
      @if (loading()) {
        <div class="flex" style="justify-content:center; padding: 44px">
          <span class="spinner spinner-lg" style="color: var(--accent)"></span>
        </div>
      } @else if (rows().length === 0) {
        <base-empty icon="credit-card" title="No subscriptions yet" subtitle="Create a subscription to assign a plan to a tenant."></base-empty>
      } @else {
        <div class="table-wrap">
          <table class="btable">
            <thead>
             <tr>
                <th><input type="checkbox" aria-label="Select all subscriptions on this page" [checked]="allRowsSelected()" [indeterminate]="someRowsSelected()" (change)="toggleSelectAll($any($event.target).checked)"></th>
                <th>Tenant</th>
                <th>Plan</th>
                <th>Amount</th>
                <th>Start</th>
                <th>End</th>
                <th>Status</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (sub of rows(); track sub.subscriptionId) {
               <tr>
                  <td><input type="checkbox" [attr.aria-label]="'Select subscription for ' + sub.tenantName" [checked]="isSelected(sub)" (change)="toggleSelection(sub, $any($event.target).checked)"></td>
                  <td style="font-weight:600">{{ sub.tenantName }} <span class="badge">{{ sub.tenantCode }}</span></td>
                  <td>{{ sub.planName }}</td>
                  <td class="currency">\${{ sub.amount.toFixed(2) }}</td>
                  <td class="text-muted">{{ sub.startDate | date: 'MMM d, yyyy' }}</td>
                  <td class="text-muted">{{ sub.endDate | date: 'MMM d, yyyy' }}</td>
                  <td><base-pill [status]="sub.status" [label]="sub.status"></base-pill></td>
                  <td class="text-right">
                    <div class="flex" style="justify-content:flex-end; gap:8px">
                      @if (sub.status === 'Active') {
                        <base-button variant="ghost" size="sm" icon="ban" (click)="toggleStatus(sub)">Deactivate</base-button>
                      } @else {
                        <base-button variant="outline" size="sm" icon="circle-check" (click)="toggleStatus(sub)">Activate</base-button>
                      }
                      <base-button variant="danger" size="sm" icon="trash-2" [iconOnly]="true" label="Delete subscription" (click)="openDelete(sub)"></base-button>
                    </div>
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

    <base-dialog [open]="dialogOpen()" title="Create Subscription" (closeRequest)="dialogOpen.set(false)">
      <base-dropdown label="Tenant" icon="building-2" [options]="tenantOptions()" [(value)]="form.tenantId"></base-dropdown>
      <base-dropdown label="Plan" icon="badge-dollar-sign" [options]="planOptions()" [(value)]="form.planId"></base-dropdown>
      <div class="grid grid-2" style="gap: 0 16px">
        <base-input label="Start Date" type="date" [(value)]="form.startDate"></base-input>
        <base-input label="End Date" type="date" [(value)]="form.endDate"></base-input>
      </div>
      <base-input label="Amount (USD)" type="number" icon="wallet" [(value)]="form.amount"></base-input>
      <div class="dialog-footer" style="padding: 18px 0 0; border-top: 1px solid var(--border); margin-top: 6px">
        <base-button variant="secondary" (click)="dialogOpen.set(false)">Cancel</base-button>
        <base-button [loading]="saving()" [disabled]="!form.tenantId() || !form.planId() || !form.startDate() || !form.endDate()" (click)="save()">Create Subscription</base-button>
      </div>
    </base-dialog>

   <base-dialog [open]="deleteDialogOpen()" title="Delete Subscription" [footer]="false" (closeRequest)="deleteDialogOpen.set(false)">
      @if (deleteTargets().length === 1) {
        <p class="text-muted">Delete the subscription for <strong>{{ deleteTargets()[0].tenantName }}</strong> on the <strong>{{ deleteTargets()[0].planName }}</strong> plan?</p>
      } @else {
        <p class="text-muted">Delete the <strong>{{ deleteTargets().length }} selected subscriptions</strong>?</p>
      }
      <p class="text-muted">This will remove the selected subscription(s) from the list.</p>
      <div class="dialog-footer" style="padding:18px 0 0; border-top:1px solid var(--border); margin-top:6px">
        <base-button variant="secondary" [disabled]="deleting()" (click)="deleteDialogOpen.set(false)">Cancel</base-button>
        <base-button variant="danger" [loading]="deleting()" (click)="confirmDelete()">Delete {{ deleteTargets().length === 1 ? 'Subscription' : 'Subscriptions' }}</base-button>
      </div>
    </base-dialog>
  `,
})
export class SubscriptionsPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  protected readonly rows = signal<Subscription[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly deleting = signal(false);
  protected readonly selectedRows = signal<Subscription[]>([]);
  protected readonly page = signal(1);
  protected readonly size = signal(10);
  protected readonly tenants = signal<Tenant[]>([]);
  protected readonly plans = signal<Plan[]>([]);
  protected readonly dialogOpen = signal(false);
  protected readonly deleteDialogOpen = signal(false);
  protected readonly deleteTargets = signal<Subscription[]>([]);

  protected readonly form = {
    tenantId: signal<string | number>(''),
    planId: signal<string | number>(''),
    startDate: signal(''),
    endDate: signal(''),
    amount: signal(''),
  };

  constructor() {
    void this.loadTenants();
    void this.loadPlans();
    effect(() => {
      this.page();
      void this.load();
    });
  }

  protected readonly tenantOptions = (): DropdownOption[] =>
    this.tenants().map((t) => ({ value: t.tenantId, label: `${t.tenantName} (${t.tenantCode})` }));

  protected readonly planOptions = (): DropdownOption[] =>
    this.plans().map((p) => ({ value: p.planId, label: `${p.planName} — $${p.monthlyPrice}/mo` }));

  protected openCreate(): void {
    this.form.tenantId.set('');
    this.form.planId.set('');
    this.form.startDate.set('');
    this.form.endDate.set('');
    this.form.amount.set(String(this.plans()[0]?.monthlyPrice ?? ''));
    this.dialogOpen.set(true);
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      await firstValueFrom(
        this.http.post('/api/subscriptions', {
          tenantId: Number(this.form.tenantId()),
          planId: Number(this.form.planId()),
          startDate: new Date(this.form.startDate()).toISOString(),
          endDate: new Date(this.form.endDate()).toISOString(),
          amount: Number(this.form.amount()),
          status: 'Active',
        }),
      );
      this.toast.success('Subscription created');
      this.dialogOpen.set(false);
      await this.load();
    } catch {
      /* handled */
    } finally {
      this.saving.set(false);
    }
  }

  protected async toggleStatus(sub: Subscription): Promise<void> {
    const status = sub.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await firstValueFrom(
        this.http.put(`/api/subscriptions/${sub.subscriptionId}`, {
          planId: sub.planId,
          startDate: new Date(sub.startDate).toISOString(),
          endDate: new Date(sub.endDate).toISOString(),
          amount: sub.amount,
          status,
        }),
      );
      this.toast.success(status === 'Active' ? 'Subscription activated' : 'Subscription deactivated');
      await this.load();
    } catch {
      /* handled */
    }
  }

  protected isSelected(sub: Subscription): boolean {
    return this.selectedRows().some((selected) => selected.subscriptionId === sub.subscriptionId);
  }

  protected allRowsSelected(): boolean {
    return this.rows().length > 0 && this.rows().every((sub) => this.isSelected(sub));
  }

  protected someRowsSelected(): boolean {
    return this.rows().some((sub) => this.isSelected(sub)) && !this.allRowsSelected();
  }

  protected toggleSelection(sub: Subscription, checked: boolean): void {
    this.selectedRows.update((selected) =>
      checked
        ? selected.some((item) => item.subscriptionId === sub.subscriptionId) ? selected : [...selected, sub]
        : selected.filter((item) => item.subscriptionId !== sub.subscriptionId),
    );
  }

  protected toggleSelectAll(checked: boolean): void {
    const pageRows = this.rows();
    this.selectedRows.update((selected) => {
      const pageIds = new Set(pageRows.map((sub) => sub.subscriptionId));
      const otherPages = selected.filter((sub) => !pageIds.has(sub.subscriptionId));
      return checked ? [...otherPages, ...pageRows] : otherPages;
    });
  }

  protected openDelete(sub: Subscription): void {
    this.deleteTargets.set([sub]);
    this.deleteDialogOpen.set(true);
  }

  protected openDeleteSelected(): void {
    const selectedIds = new Set(this.selectedRows().map((sub) => sub.subscriptionId));
    const targets = [...this.selectedRows(), ...this.rows().filter((sub) => selectedIds.has(sub.subscriptionId))];
    this.deleteTargets.set([...new Map(targets.map((sub) => [sub.subscriptionId, sub])).values()]);
    this.deleteDialogOpen.set(true);
  }

 protected async confirmDelete(): Promise<void> {
   const targets = this.deleteTargets();
   if (targets.length === 0 || this.deleting()) return;

   this.deleting.set(true);
    const deletedIds: number[] = [];
   try {
      for (const sub of targets) {
        await firstValueFrom(this.http.delete(`/api/subscriptions/${sub.subscriptionId}`));
        deletedIds.push(sub.subscriptionId);
      }
      this.toast.success(targets.length === 1 ? 'Subscription deleted' : `${targets.length} subscriptions deleted`);
      this.deleteDialogOpen.set(false);
      this.deleteTargets.set([]);
      this.selectedRows.update((selected) => selected.filter((sub) => !deletedIds.includes(sub.subscriptionId)));
      await this.load();
    } catch {
      this.selectedRows.update((selected) => selected.filter((sub) => !deletedIds.includes(sub.subscriptionId)));
      this.deleteTargets.update((pending) => pending.filter((sub) => !deletedIds.includes(sub.subscriptionId)));
      this.toast.error('Subscription deletion failed', 'Some subscriptions may already have been deleted. Refresh the list and review the remaining selections.');
      await this.load();
    } finally {
      this.deleting.set(false);
    }
  }

  private async loadTenants(): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<Paginated<Tenant>>('/api/tenants?page=1&size=100'));
      this.tenants.set(res.items);
    } catch {
      /* ignored */
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
        this.http.get<Paginated<Subscription>>(`/api/subscriptions?page=${this.page()}&size=${this.size()}`),
      );
      this.rows.set(res.items);
      this.total.set(res.totalCount);
    } catch {
      this.toast.error('Failed to load subscriptions');
    } finally {
      this.loading.set(false);
    }
  }
}
