import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { PortalSidebar } from './Sidebar/portal-sidebar';
import { PortalTopbar } from './Topbar/portal-topbar';
import { PortalAuthService } from '../Services/portal-auth.service';
import { ToastComponent } from '../../../Shared/Toasts/toast/toast';

@Component({
  selector: 'app-portal-layout',
  standalone: true,
  imports: [RouterOutlet, PortalSidebar, PortalTopbar, ToastComponent],
  templateUrl: './portal-layout.html',
})
export class PortalLayout {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly portalAuth = inject(PortalAuthService);

  readonly mobileNavOpen = signal(false);

  readonly pageTitle = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.readDeepestTitle(this.route)),
    ),
    { initialValue: this.readDeepestTitle(this.route) },
  );

  onLogout(): void {
    this.portalAuth.clearToken();
    this.router.navigateByUrl('/portal/login');
  }

  private readDeepestTitle(route: ActivatedRoute): string {
    let current = route;
    let title = 'Portal';
    while (current.firstChild) {
      current = current.firstChild;
      const data = current.snapshot.data as { title?: string };
      if (data?.title) title = data.title;
    }
    return title;
  }
}