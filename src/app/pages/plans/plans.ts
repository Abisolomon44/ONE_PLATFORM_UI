import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { BasePill } from '../../shared/base-data';
import { BaseButton } from '../../shared/base-button';
import { BaseDialog } from '../../shared/base-feedback';
import { BaseInput } from '../../shared/base-controls';
import { Paginated, Plan } from '../../core/models';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-plans',
  standalone: true,
  imports: [LucideAngularModule, BasePill, BaseButton, BaseDialog, BaseInput],
  template: `
    <div class="page-header">
      <div>
        <h1>Plans</h1>
        <div class="page-sub">Pricing tiers available for tenant subscriptions.</div>
      </div>
      <div class="page-actions">
        <base-button icon="plus" (click)="openCreate()">New Plan</base-button>
      </div>
    </div>

    <div class="grid grid-3">
      @for (plan of plans(); track plan.planId) {
        <div class="card">
          <div class="card-body">
            <div class="flex-between">
              <div>
                <div style="font-size: 13px; font-weight: 800; letter-spacing: 0.8px; color: var(--accent)">{{ plan.planCode }}</div>
                <h3 class="mt-1" style="font-size: 18px">{{ plan.planName }}</h3>
              </div>
              <base-pill [status]="plan.isActive ? 'active' : 'inactive'" [label]="plan.isActive ? 'Active' : 'Inactive'"></base-pill>
            </div>
            @if (plan.description) {
              <div class="text-muted mt-1" style="font-size: 12.5px">{{ plan.description }}</div>
            }
            <div class="flex gap-1" style="margin-top: 10px">
              <span class="badge">{{ plan.countryName }}</span>
              <span class="badge">{{ plan.currencyCode }}</span>
            </div>
            <div class="flex gap-2" style="align-items: baseline; margin-top: 14px">
              <span style="font-size: 26px; font-weight: 800">{{ plan.monthlyPrice }} {{ plan.currencyCode }}</span>
              <span class="text-muted" style="font-size: 12.5px">/ month</span>
            </div>
            <div class="text-muted" style="font-size: 12.5px; margin-top: 2px">or {{ plan.annualPrice }} {{ plan.currencyCode }}/year</div>

            <div style="border-top: 1px solid var(--border); margin: 14px 0; padding-top: 12px; display: flex; flex-direction: column; gap: 8px">
              <div class="flex gap-2"><i-lucide name="users" [size]="15" style="color: var(--text-3)"></i-lucide><span>{{ plan.maxUsers }} max users</span></div>
              <div class="flex gap-2"><i-lucide name="building-2" [size]="15" style="color: var(--text-3)"></i-lucide><span>{{ plan.maxCompanies }} max companies</span></div>
            </div>

            <div class="flex gap-2" style="margin-top: 4px">
              <base-button variant="secondary" size="sm" icon="square-pen" (click)="openEdit(plan)">Edit</base-button>
              @if (!plan.isActive) {
                <base-button variant="outline" size="sm" (click)="toggleActive(plan)">Activate</base-button>
              } @else {
                <base-button variant="ghost" size="sm" (click)="toggleActive(plan)">Deactivate</base-button>
              }
            </div>
          </div>
        </div>
      }
    </div>

    <base-dialog [open]="dialogOpen()" [title]="editing() ? 'Edit Plan' : 'Create Plan'" (closeRequest)="dialogOpen.set(false)">
      <base-input label="Plan Code" icon="badge" [(value)]="form.planCode" hint="Uppercase short code, e.g. PRO"></base-input>
      <base-input label="Plan Name" [(value)]="form.planName"></base-input>
      <base-input label="Description" [(value)]="form.description"></base-input>
      <div class="grid grid-2" style="gap: 0 16px">
        <base-input label="Country Code" icon="globe" [(value)]="form.countryCode" hint="ISO code, e.g. US"></base-input>
        <base-input label="Country Name" [(value)]="form.countryName"></base-input>
        <base-input label="Currency Code" icon="banknote" [(value)]="form.currencyCode" hint="ISO code, e.g. USD"></base-input>
        <base-input label="Max Companies" type="number" [(value)]="form.maxCompanies"></base-input>
        <base-input label="Monthly Price" type="number" [(value)]="form.monthlyPrice"></base-input>
        <base-input label="Annual Price" type="number" [(value)]="form.annualPrice"></base-input>
        <base-input label="Max Users" type="number" [(value)]="form.maxUsers"></base-input>
      </div>
      <div class="dialog-footer" style="padding: 18px 0 0; border-top: 1px solid var(--border); margin-top: 6px">
        <base-button variant="secondary" (click)="dialogOpen.set(false)">Cancel</base-button>
        <base-button [loading]="saving()" [disabled]="!form.planCode() || !form.planName()" (click)="save()">Save Plan</base-button>
      </div>
    </base-dialog>
  `,
})
export class PlansPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  protected readonly plans = signal<Plan[]>([]);
  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<Plan | null>(null);
  protected readonly saving = signal(false);

  protected readonly form = {
    planCode: signal(''),
    planName: signal(''),
    description: signal(''),
    countryCode: signal(''),
    countryName: signal(''),
    currencyCode: signal(''),
    monthlyPrice: signal(''),
    annualPrice: signal(''),
    maxUsers: signal(''),
    maxCompanies: signal(''),
  };

  constructor() {
    void this.load();
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.form.planCode.set('');
    this.form.planName.set('');
    this.form.description.set('');
    this.form.countryCode.set('US');
    this.form.countryName.set('United States');
    this.form.currencyCode.set('USD');
    this.form.monthlyPrice.set('');
    this.form.annualPrice.set('');
    this.form.maxUsers.set('');
    this.form.maxCompanies.set('');
    this.dialogOpen.set(true);
  }

  protected openEdit(plan: Plan): void {
    this.editing.set(plan);
    this.form.planCode.set(plan.planCode);
    this.form.planName.set(plan.planName);
    this.form.description.set(plan.description ?? '');
    this.form.countryCode.set(plan.countryCode);
    this.form.countryName.set(plan.countryName);
    this.form.currencyCode.set(plan.currencyCode);
    this.form.monthlyPrice.set(String(plan.monthlyPrice));
    this.form.annualPrice.set(String(plan.annualPrice));
    this.form.maxUsers.set(String(plan.maxUsers));
    this.form.maxCompanies.set(String(plan.maxCompanies));
    this.dialogOpen.set(true);
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    const payload = {
      planCode: this.form.planCode().toUpperCase(),
      planName: this.form.planName(),
      description: this.form.description() || null,
      countryCode: this.form.countryCode().toUpperCase(),
      countryName: this.form.countryName(),
      currencyCode: this.form.currencyCode().toUpperCase(),
      monthlyPrice: Number(this.form.monthlyPrice()),
      annualPrice: Number(this.form.annualPrice()),
      maxUsers: Number(this.form.maxUsers()),
      maxCompanies: Number(this.form.maxCompanies()),
      isActive: this.editing()?.isActive ?? true,
    };
    try {
      if (this.editing()) {
        await firstValueFrom(this.http.put(`/api/plans/${this.editing()!.planId}`, payload));
        this.toast.success('Plan updated');
      } else {
        await firstValueFrom(this.http.post('/api/plans', payload));
        this.toast.success('Plan created');
      }
      this.dialogOpen.set(false);
      await this.load();
    } catch {
      /* handled */
    } finally {
      this.saving.set(false);
    }
  }

  protected async toggleActive(plan: Plan): Promise<void> {
    await firstValueFrom(
      this.http.put(`/api/plans/${plan.planId}`, {
        planCode: plan.planCode,
        planName: plan.planName,
        description: plan.description,
        countryCode: plan.countryCode,
        countryName: plan.countryName,
        currencyCode: plan.currencyCode,
        monthlyPrice: plan.monthlyPrice,
        annualPrice: plan.annualPrice,
        maxUsers: plan.maxUsers,
        maxCompanies: plan.maxCompanies,
        isActive: !plan.isActive,
      }),
    );
    this.toast.success(plan.isActive ? 'Plan deactivated' : 'Plan activated');
    await this.load();
  }

  private async load(): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<Paginated<Plan>>('/api/plans?page=1&size=100'));
      this.plans.set(res.items);
    } catch {
      this.toast.error('Failed to load plans');
    }
  }
}
