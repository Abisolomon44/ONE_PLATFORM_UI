import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { MigrationHistoryRow, MigrationRunResult, MigrationStatusResponse } from './models';

/**
 * Tenant database migration API.
 *
 * The only value the client ever supplies is a tenant id. Script names,
 * SQL text, connection strings and the execution order are all decided
 * server-side, and the authorization check lives on the API, never here.
 */
@Injectable({ providedIn: 'root' })
export class MigrationService {
  private readonly http = inject(HttpClient);

  /** Current vs target version plus the ordered pending list for a tenant. */
  getStatus(tenantId: number): Promise<MigrationStatusResponse> {
    return firstValueFrom(this.http.get<MigrationStatusResponse>(`/api/tenants/${tenantId}/migration-status`));
  }

  /**
   * Runs every pending migration for the tenant. Takes no body, so there is no
   * path by which the browser can submit SQL or a connection string.
   */
  run(tenantId: number): Promise<MigrationRunResult> {
    return firstValueFrom(this.http.post<MigrationRunResult>(`/api/tenants/${tenantId}/migration/run`, null));
  }

  /** Recent execution log, newest first. */
  getHistory(tenantId: number, take = 50): Promise<MigrationHistoryRow[]> {
    return firstValueFrom(this.http.get<MigrationHistoryRow[]>(`/api/tenants/${tenantId}/migration/history?take=${take}`));
  }
}