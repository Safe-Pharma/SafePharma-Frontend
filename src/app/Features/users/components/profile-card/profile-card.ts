import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { User } from '../../models/user.model';
import { UserAvatarComponent } from '../user-avatar/user-avatar';
import { StatusBadgeComponent } from '../status-badge/status-badge';
import { I18nService } from '../../../../Core/Services/i18n.service';

@Component({
  selector: 'app-profile-card',
  standalone: true,
  imports: [UserAvatarComponent, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile-card.html',
  styleUrl: './profile-card.css',
})
export class ProfileCardComponent {
  protected readonly i18n = inject(I18nService);
  user = input.required<User>();
}
