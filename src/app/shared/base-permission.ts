import { Directive, EmbeddedViewRef, Input, TemplateRef, ViewContainerRef, effect, inject } from '@angular/core';
import { PermissionService } from '../core/permission.service';

@Directive({
  selector: '[basePermission]',
  standalone: true,
})
export class BasePermission {
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly template = inject(TemplateRef<unknown>);
  private readonly permissions = inject(PermissionService);

  private view: EmbeddedViewRef<unknown> | null = null;
  private required: string | string[] = [];

  constructor() {
    // Re-evaluate whenever the authenticated user's permissions change, which
    // happens on login, silent refresh and logout.
    effect(() => {
      const granted = this.permissions.has(this.required);
      if (granted && !this.view) {
        this.view = this.viewContainer.createEmbeddedView(this.template);
      } else if (!granted && this.view) {
        this.viewContainer.clear();
        this.view = null;
      }
    });
  }

  @Input() set basePermission(permission: string | string[]) {
    this.required = permission;
  }
}