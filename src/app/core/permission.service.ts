import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from './auth.service';

/** Platform roles that implicitly hold every platform-console permission. */
const ADMIN_ROLES = ['PlatformAdmin', 'SuperAdmin', 'Administrator'];

/**
 * Mirrors the server-side authorization decision for UI affordances only.
 * The API remains the sole authority: a hidden button is convenience, not
 * security. A 403 from the server is always surfaced to the user.
 */
@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly auth = inject(AuthService);

  readonly permissions = computed<string[]>(() => {
    const user = this.auth.user();
    if (!user) return [];
    if (ADMIN_ROLES.includes(user.role)) return ['*'];
    return user.permissions ?? [];
  });

  has(required: string | string[]): boolean {
    const owned = this.permissions();
    if (owned.includes('*')) return true;
    const list = Array.isArray(required) ? required : [required];
    return list.some((p) => owned.includes(p));
  }
}