export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  errors: string[];
}

export interface Paginated<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export interface PlatformUser {
  platformUserId: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  /** Platform permission codes granted to this user; may be empty. */
  permissions: string[];
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: PlatformUser;
}

export interface Plan {
  planId: number;
  planCode: string;
  planName: string;
  description?: string;
  countryCode: string;
  countryName: string;
  currencyCode: string;
  monthlyPrice: number;
  annualPrice: number;
  maxUsers: number;
  maxCompanies: number;
  isActive: boolean;
  createdDate: string;
}

export interface Tenant {
  tenantId: number;
  tenantCode: string;
  tenantName: string;
  companyName?: string;
  databaseName: string;
  planId?: number;
  planName?: string;
  currencyCode?: string;
  contactEmail?: string;
  adminUsername?: string;
  adminPassword?: string;
  status: string;
  subscriptionStatus?: string;
  subscriptionStart?: string;
  subscriptionEnd?: string;
  databaseProvisioned: boolean;
  createdDate: string;
}

export interface Subscription {
  subscriptionId: number;
  tenantId: number;
  tenantCode: string;
  tenantName: string;
  planId: number;
  planCode: string;
  planName: string;
  startDate: string;
  endDate: string;
  amount: number;
  status: string;
  createdDate: string;
}

export interface DashboardData {
  totalTenants: number;
  activeTenants: number;
  totalPlans: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  expiringSoonCount: number;
  monthlyRecurringRevenue: number;
  recentTenants: RecentTenant[];
}

export interface RecentTenant {
  tenantId: number;
  tenantCode: string;
  tenantName: string;
  status: string;
  createdDate: string;
}

/* ---------------- Tenant database migration management ---------------- */

/** Mirrors MigrationStatus on the API. */
export const MigrationStatus = {
  UpToDate: 'UP_TO_DATE',
  Pending: 'PENDING',
  Running: 'RUNNING',
  Success: 'SUCCESS',
  Failed: 'FAILED',
} as const;

/**
 * Mirrors MigrationPermissions on the API. The API is authoritative; these are
 * only used to hide affordances a user cannot use.
 */
export const MigrationPermission = {
  View: 'migrations.view',
  Run: 'migrations.run',
} as const;

export interface PendingMigration {
  migrationId: number;
  version: number;
  migrationCode: string;
  migrationName: string;
  scriptName: string;
  status: string;
}

export interface MigrationStatusResponse {
  tenantId: number;
  tenantName: string;
  databaseName: string;
  currentVersion: number;
  targetVersion: number;
  pendingCount: number;
  status: string;
  lastError?: string | null;
  lastRunAt?: string | null;
  pendingMigrations: PendingMigration[];
}

export interface MigrationExecution {
  historyId?: number | null;
  version: number;
  migrationCode: string;
  migrationName: string;
  startedAt?: string | null;
  completedAt?: string | null;
  durationMs?: number | null;
  status: string;
  errorMessage?: string | null;
}

export interface MigrationRunResult {
  executionId: string;
  tenantId: number;
  databaseName: string;
  fromVersion: number;
  toVersion: number;
  status: string;
  message: string;
  hasFailures: boolean;
  executed: MigrationExecution[];
}

export interface MigrationHistoryRow {
  historyId: number;
  executionId: string;
  tenantId: number;
  version: number;
  migrationCode: string;
  migrationName: string;
  startedAt: string;
  completedAt?: string | null;
  durationMs?: number | null;
  status: string;
  executedBy?: string | null;
  errorMessage?: string | null;
}
