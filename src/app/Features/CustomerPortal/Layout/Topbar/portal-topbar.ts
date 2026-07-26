import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PortalI18nService } from '../../Services/portal-i18n.service';
import { PortalAuthService } from '../../Services/portal-auth.service';

@Component({
  selector: 'portal-topbar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './portal-topbar.html',
})
export class PortalTopbar {
  readonly i18n = inject(PortalI18nService);
  readonly portalAuth = inject(PortalAuthService);

  @Input() title = '';
  @Output() openMobileNav = new EventEmitter<void>();
}