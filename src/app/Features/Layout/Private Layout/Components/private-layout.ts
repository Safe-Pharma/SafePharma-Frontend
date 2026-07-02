import { Component } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Sidebar } from './Sidebar/sidebar';
import { PrivateHeader } from './Private Header/private-header';


@Component({
  selector: 'app-private-layout',
  standalone: true,
  imports: [RouterOutlet, Sidebar, PrivateHeader],
  templateUrl: './private-layout.html',
})
export class privatelayout {
  constructor(private router: Router) {}

  onLogout() {
    this.router.navigateByUrl('/login');
  }
}
