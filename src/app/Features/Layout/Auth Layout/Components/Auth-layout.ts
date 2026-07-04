import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthHeader } from './Header/Auth-header';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet, AuthHeader],
  templateUrl: './auth-layout.html',
})
export class AuthLayout {}
