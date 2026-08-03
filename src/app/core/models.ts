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
