import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';
import { MigrationService } from '../../core/migration.service';
import {
  MigrationHistoryRow,
  MigrationPermission,
  MigrationRunResult,
  MigrationStatus,
  MigrationStatusResponse,
  Paginated,
  Tenant,
} from '../../core/models';
import { PermissionService } from '../../core/permission.service';
import { ToastService } from '../../core/toast.service';
import { BaseButton } from '../../shared/base-button';
import { BaseDropdown, DropdownOption } from '../../shared/base-controls';
import { BaseEmpty, BasePill } from '../../shared/base-data';
import { BaseDialog, BaseLoader } from '../../shared/base-feedback';

@Component({
  selector: 'app-migrations',
  standalone: true,
  imports: [DatePipe, LucideAngularModule, BaseButton, BaseDialog, BaseDropdown, BaseEmpty, BaseLoader, BasePill],
  template: `
    <base-loader [loading]="running()" message="Applying migrations to the tenant database..."></base-loader>

    <div class="page-header">
      <div>
        <h1>Tenant Migrations</h1>
        <div class="page-sub">
          Apply pending schema migrations to a tenant database. Migrations always run in ascending
          version order, each in its own transaction.
        </div>
      </div>
      <div class="page-actions">
        <base-button variant="secondary" icon="refresh-cw" [loading]="loadingStatus() || loadingHistory()" (click)="refresh()">
          Refresh
        </base-button>
      </div>
    </div>

    <div class="card mb-3">
      <div class="card-pad">
        <base-dropdown
          label="Tenant"
          icon="building-2"
          placeholder="Select a tenant to inspect"
          [options]="tenantOptions()"
          [(value)]="selectedTenantId"
          (valueChange)="onTenantChange()">
        </base-dropdown>

        @if (tenantLoadError()) {
          <div class="field-error mt-1">{{ tenantLoadError() }}</div>
        }

        @if (!selectedTenantId()) {
          <div class="empty-hint mt-3">
            <i-lucide name="mouse-pointer-click" [size]="15"></i-lucide>
            Select a tenant above to see its current version and pending migrations.
          </div>
        }
      </div>
    </div>

    @if (selectedTenantId()) {
      <div class="grid grid-4 mb-3">
        <div class="card stat-card">
          <span class="stat-icon" style="background: var(--info-soft); color: var(--info)">
            <i-lucide name="database" [size]="18"></i-lucide>
          </span>
          <div>
            <div class="stat-label">Current Version</div>
            <div class="stat-value">{{ status()?.currentVersion ?? '—' }}</div>
          </div>
        </div>
        <div class="card stat-card">
          <span class="stat-icon" style="background: var(--accent-soft); color: var(--accent)">
            <i-lucide name="target" [size]="18"></i-lucide>
          </span>
          <div>
            <div class="stat-label">Target Version</div>
            <div class="stat-value">{{ status()?.targetVersion ?? '—' }}</div>
          </div>
        </div>
        <div class="card stat-card">
          <span class="stat-icon" style="background: var(--warning-soft); color: var(--warning)">
            <i-lucide name="list-checks" [size]="18"></i-lucide>
          </span>
          <div>
            <div class="stat-label">Pending</div>
            <div class="stat-value">{{ status()?.pendingCount ?? 0 }}</div>
          </div>
        </div>
        <div class="card stat-card">
          <span class="stat-icon" [style.background]="statusTint()" [style.color]="statusColor()">
            <i-lucide [name]="statusIcon()" [size]="18"></i-lucide>
          </span>
          <div>
            <div class="stat-label">Status</div>
            <div class="stat-value stat-sm">
              <base-pill [status]="status()?.status ?? ''" [label]="statusLabel()"></base-pill>
            </div>
          </div>
        </div>
      </div>

      @if (status()?.lastError) {
        <div class="card card-pad mb-3" style="border-left: 3px solid var(--danger)">
          <div class="flex gap-2">
            <i-lucide name="circle-alert" [size]="17" style="color: var(--danger)"></i-lucide>
            <div style="flex:1; min-width:0">
              <div style="font-weight:600">Last run failed</div>
              <div class="text-muted" style="font-size:12.5px">{{ status()?.lastError }}</div>
            </div>
          </div>
        </div>
      }

      <div class="card mb-3">
        <div class="card-header">
          <div>
            <h3>Pending Migrations</h3>
            <div class="card-sub">
              @if (status()?.databaseName) {
                Applied to {{ status()?.databaseName }}
              } @else {
                These will be applied in order. Each script and its version bump share one transaction.
              }
            </div>
          </div>
          <div class="card-actions">
            <base-button
              icon="play"
              [loading]="running()"
              [disabled]="!canRun()"
              (click)="openRunConfirm()">
              Run Pending
            </base-button>
          </div>
        </div>

        @if (loadingStatus()) {
          <div class="flex" style="justify-content:center; padding: 36px">
            <span class="spinner spinner-lg" style="color: var(--accent)"></span>
          </div>
        } @else if (statusError()) {
          <div class="card-pad">
            <div class="field-error">{{ statusError() }}</div>
          </div>
        } @else if ((status()?.pendingMigrations?.length ?? 0) === 0) {
          <base-empty icon="circle-check-big" title="Up to date" subtitle="This tenant has no pending migrations."></base-empty>
        } @else {
          <div class="table-wrap">
            <table class="btable">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Version</th>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Script</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                @for (m of status()?.pendingMigrations; track m.migrationId; let i = $index) {
                  <tr>
                    <td class="text-muted">{{ i + 1 }}</td>
                    <td><span class="badge">{{ m.version }}</span></td>
                    <td style="font-weight:600">{{ m.migrationCode }}</td>
                    <td>{{ m.migrationName }}</td>
                    <td class="text-muted">{{ m.scriptName }}</td>
                    <td><base-pill [status]="m.status" [label]="m.status"></base-pill></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h3>Execution History</h3>
            <div class="card-sub">Most recent attempts for this tenant.</div>
          </div>
          <div class="card-actions">
            <base-button variant="ghost" size="sm" icon="refresh-cw" [loading]="loadingHistory()" (click)="refreshHistory()"></base-button>
          </div>
        </div>

        @if (loadingHistory()) {
          <div class="flex" style="justify-content:center; padding: 36px">
            <span class="spinner spinner-lg" style="color: var(--accent)"></span>
          </div>
        } @else if (historyError()) {
          <div class="card-pad"><div class="field-error">{{ historyError() }}</div></div>
        } @else if (history().length === 0) {
          <base-empty icon="history" title="No migrations have been run" subtitle="Execution history will appear here."></base-empty>
        } @else {
          <div class="table-wrap">
            <table class="btable">
              <thead>
                <tr>
                  <th>Version</th>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Started</th>
                  <th>Duration</th>
                  <th>By</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                @for (h of history(); track h.historyId) {
                  <tr>
                    <td><span class="badge">{{ h.version }}</span></td>
                    <td style="font-weight:600">{{ h.migrationCode }}</td>
                    <td>{{ h.migrationName }}</td>
                    <td><base-pill [status]="h.status" [label]="h.status"></base-pill></td>
                    <td class="text-muted">{{ h.startedAt | date: 'MMM d, y HH:mm' }}</td>
                    <td class="text-muted">{{ duration(h) }}</td>
                    <td class="text-muted">{{ h.executedBy || '—' }}</td>
                    <td class="text-muted" style="max-width: 260px">{{ h.errorMessage || '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    }

    <base-dialog [open]="confirmOpen()" title="Run Pending Migrations" [footer]="true" (closeRequest)="confirmOpen.set(false)">
      <p style="margin:0 0 10px">
        Apply <strong>{{ status()?.pendingCount }}</strong> migration{{ (status()?.pendingCount ?? 0) === 1 ? '' : 's' }}
        to <strong>{{ status()?.databaseName }}</strong> for
        <strong>{{ status()?.tenantName }}</strong>?
      </p>
      <div class="text-muted" style="font-size:12.5px">
        Versions {{ status()?.currentVersion }} &rarr; {{ status()?.targetVersion }} will run in order, each in its own
        transaction. If one fails the run stops and the tenant stays at the last version that succeeded.
      </div>

      <div dialog-actions class="dialog-footer">
        <base-button variant="secondary" (click)="confirmOpen.set(false)">Cancel</base-button>
        <base-button icon="play" [loading]="running()" (click)="run()">Run Migrations</base-button>
      </div>
    </base-dialog>

    <base-dialog [open]="resultOpen()" title="Migration Result" size="lg" [footer]="true" (closeRequest)="resultOpen.set(false)">
      @if (result(); as r) {
        <div class="flex gap-2 mb-3">
          <i-lucide [name]="r.hasFailures ? 'circle-alert' : 'circle-check-big'" [size]="19"
            [style.color]="r.hasFailures ? 'var(--danger)' : 'var(--success)'"></i-lucide>
          <div style="flex:1; min-width:0">
            <div style="font-weight:600">{{ r.message }}</div>
            <div class="text-muted" style="font-size:12.5px">
              {{ r.databaseName }} &middot; {{ r.fromVersion }} &rarr; {{ r.toVersion }}
            </div>
          </div>
        </div>

        @if (r.executed.length > 0) {
          <div class="table-wrap">
            <table class="btable">
              <thead>
                <tr>
                  <th>Version</th>
                  <th>Code</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                @for (e of r.executed; track e.historyId ?? e.version) {
                  <tr>
                    <td><span class="badge">{{ e.version }}</span></td>
                    <td style="font-weight:600">{{ e.migrationCode }}</td>
                    <td><base-pill [status]="e.status" [label]="e.status"></base-pill></td>
                    <td class="text-muted">{{ e.durationMs != null ? (e.durationMs + ' ms') : '—' }}</td>
                    <td class="text-muted" style="max-width: 260px">{{ e.errorMessage || '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }

      <div dialog-actions class="dialog-footer">
        <base-button (click)="resultOpen.set(false)">Close</base-button>
      </div>
    </base-dialog>
  `,
})
export class MigrationsPage implements OnInit {
  private readonly migrations = inject(MigrationService);
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly permissions = inject(PermissionService);

  protected readonly tenants = signal<Tenant[]>([]);
  protected readonly tenantLoadError = signal('');
  protected readonly selectedTenantId = signal<string | number>('');

  protected readonly status = signal<MigrationStatusResponse | null>(null);
  protected readonly statusError = signal('');
  protected readonly loadingStatus = signal(false);

  protected readonly history = signal<MigrationHistoryRow[]>([]);
  protected readonly historyError = signal('');
  protected readonly loadingHistory = signal(false);

  protected readonly running = signal(false);
  protected readonly confirmOpen = signal(false);
  protected readonly resultOpen = signal(false);
  protected readonly result = signal<MigrationRunResult | null>(null);

  protected readonly tenantOptions = computed<DropdownOption[]>(() =>
    this.tenants().map((t) => ({
      value: t.tenantId,
      label: `${t.tenantName} (${t.tenantCode})${t.databaseProvisioned ? '' : ' — no database'}`,
    })),
  );

  protected readonly canRun = computed(
    () =>
      this.permissions.has(MigrationPermission.Run) &&
      !!this.selectedTenantId() &&
      (this.status()?.pendingCount ?? 0) > 0 &&
      !this.running() &&
      !this.loadingStatus(),
  );

  protected readonly statusLabel = computed(() => this.humanize(this.status()?.status));

  protected statusIcon(): string {
    switch (this.status()?.status) {
      case MigrationStatus.UpToDate:
        return 'circle-check-big';
      case MigrationStatus.Pending:
        return 'list-checks';
      case MigrationStatus.Running:
        return 'loader';
      case MigrationStatus.Failed:
        return 'circle-alert';
      default:
        return 'help-circle';
    }
  }

  protected statusTint(): string {
    switch (this.status()?.status) {
      case MigrationStatus.UpToDate:
        return 'var(--success-soft)';
      case MigrationStatus.Failed:
        return 'var(--danger-soft)';
      case MigrationStatus.Running:
      case MigrationStatus.Pending:
        return 'var(--info-soft)';
      default:
        return 'var(--accent-soft)';
    }
  }

  protected statusColor(): string {
    switch (this.status()?.status) {
      case MigrationStatus.UpToDate:
        return 'var(--success)';
      case MigrationStatus.Failed:
        return 'var(--danger)';
      case MigrationStatus.Running:
      case MigrationStatus.Pending:
        return 'var(--info)';
      default:
        return 'var(--accent)';
    }
  }

  async ngOnInit(): Promise<void> {
    await this.loadTenants();
  }

  protected onTenantChange(): void {
    this.status.set(null);
    this.statusError.set('');
    this.history.set([]);
    this.historyError.set('');
    const tenantId = this.tenantId();
    if (!tenantId) return;
    void this.loadStatus(tenantId);
    void this.loadHistory(tenantId);
  }

  protected openRunConfirm(): void {
    if (!this.canRun()) return;
    this.confirmOpen.set(true);
  }

  protected async run(): Promise<void> {
    const tenantId = this.tenantId();
    if (!tenantId || this.running()) return;

    this.running.set(true);
    this.confirmOpen.set(false);
    try {
      const result = await this.migrations.run(tenantId);
      this.result.set(result);
      this.resultOpen.set(true);

      if (result.hasFailures) {
        this.toast.error('Migration failed', result.message);
      } else if (result.status === MigrationStatus.UpToDate) {
        this.toast.info('Nothing to migrate', result.message);
      } else {
        this.toast.success('Migrations applied', result.message);
      }
    } catch {
      /* handled by the interceptor */
    } finally {
      this.running.set(false);
      // Always re-read the authoritative version after a run attempt.
      await this.reload();
    }
  }

  protected refresh(): void {
    void this.reload();
  }

  protected refreshHistory(): void {
    const tenantId = this.tenantId();
    if (tenantId) void this.loadHistory(tenantId);
  }

  protected duration(row: MigrationHistoryRow): string {
    if (row.durationMs == null) return '—';
    if (row.durationMs < 1000) return row.durationMs + ' ms';
    return (row.durationMs / 1000).toFixed(1) + ' s';
  }

  private async reload(): Promise<void> {
    const tenantId = this.tenantId();
    if (!tenantId) return;
    await Promise.all([this.loadStatus(tenantId), this.loadHistory(tenantId)]);
  }

  private async loadTenants(): Promise<void> {
    try {
      // Reuses the existing tenant list endpoint; no duplicate list API is added.
      const page = await firstValueFrom(
        this.http.get<Paginated<Tenant>>('/api/tenants?page=1&size=200'),
      );
      this.tenants.set(page.items);
    } catch {
      this.tenantLoadError.set('Could not load tenants.');
    }
  }

  private async loadStatus(tenantId: number): Promise<void> {
    this.loadingStatus.set(true);
    this.statusError.set('');
    try {
      this.status.set(await this.migrations.getStatus(tenantId));
    } catch (error) {
      this.status.set(null);
      this.statusError.set(this.messageOf(error, 'Could not read the migration status for this tenant.'));
    } finally {
      this.loadingStatus.set(false);
    }
  }

  private async loadHistory(tenantId: number): Promise<void> {
    this.loadingHistory.set(true);
    this.historyError.set('');
    try {
      this.history.set(await this.migrations.getHistory(tenantId));
    } catch (error) {
      this.history.set([]);
      this.historyError.set(this.messageOf(error, 'Could not load the migration history for this tenant.'));
    } finally {
      this.loadingHistory.set(false);
    }
  }

  private tenantId(): number | null {
    const raw = this.selectedTenantId();
    const id = Number(raw);
    return raw !== '' && Number.isFinite(id) && id > 0 ? id : null;
  }

  private humanize(status?: string | null): string {
    switch (status) {
      case MigrationStatus.UpToDate:
        return 'Up to date';
      case MigrationStatus.Pending:
        return 'Pending';
      case MigrationStatus.Running:
        return 'Running';
      case MigrationStatus.Success:
        return 'Success';
      case MigrationStatus.Failed:
        return 'Failed';
      default:
        return 'Unknown';
    }
  }

  private messageOf(error: unknown, fallback: string): string {
    const body = (error as { error?: { message?: string; errors?: string[] } })?.error;
    if (body?.errors?.length) return body.errors.join('. ');
    return body?.message || fallback;
  }
}