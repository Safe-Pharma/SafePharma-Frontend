import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { User } from '../../models/user.model';
import { UserAvatarComponent } from '../user-avatar/user-avatar';
import { StatusBadgeComponent } from '../status-badge/status-badge';

@Component({
  selector: 'app-profile-card',
  standalone: true,
  imports: [UserAvatarComponent, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile-card.html',
  styleUrl: './profile-card.css',
})
export class ProfileCardComponent {
  user = input.required<User>();
}