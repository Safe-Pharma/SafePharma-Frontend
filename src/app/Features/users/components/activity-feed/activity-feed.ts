import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { UserActivity } from '../../models/activity.model';
import { TimeAgoPipe } from '../../../../Shared/Pipes/Date/time-ago-pipe';
import { I18nService } from '../../../../Core/Services/i18n.service';

@Component({
  selector: 'app-activity-feed',
  standalone: true,
  imports: [TimeAgoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './activity-feed.html',
  styleUrl: './activity-feed.css',
})
export class ActivityFeedComponent {
  protected readonly i18n = inject(I18nService);
  activities = input.required<UserActivity[]>();
}
