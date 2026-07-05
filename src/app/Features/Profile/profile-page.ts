import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthSessionService } from '../../Core/Services/auth-session.service';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './profile.html',
})
export class ProfilePage {
  readonly session = inject(AuthSessionService);
  readonly user = this.session.user;
}