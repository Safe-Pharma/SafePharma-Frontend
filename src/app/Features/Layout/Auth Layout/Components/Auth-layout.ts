import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthHeader } from './Header/Auth-header';
import { ToastComponent } from '../../../../Shared/Toasts/toast/toast';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet, AuthHeader, ToastComponent],
  templateUrl: './auth-layout.html',
})
export class AuthLayout {}
