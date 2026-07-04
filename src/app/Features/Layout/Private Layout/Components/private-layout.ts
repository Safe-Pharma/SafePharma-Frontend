import { Component } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Sidebar } from './Sidebar/sidebar';
import { PrivateHeader } from './Private Header/private-header';
import { ToastComponent } from '../../../../Shared/Toasts/toast/toast';

@Component({
  selector: 'app-private-layout',
  standalone: true,
  imports: [RouterOutlet, Sidebar, PrivateHeader, ToastComponent],
  templateUrl: './private-layout.html',
})
export class privatelayout {
  constructor(private router: Router) {}

  onLogout() {
    this.router.navigateByUrl('/login');
  }
}
