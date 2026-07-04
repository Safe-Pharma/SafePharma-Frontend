import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { UserActivity } from '../../models/activity.model';
import { TimeAgoPipe } from '../../../../Shared/Pipes/Date/time-ago-pipe';

@Component({
  selector: 'app-activity-feed',
  standalone: true,
  imports: [TimeAgoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './activity-feed.html',
  styleUrl: './activity-feed.css',
})
export class ActivityFeedComponent {
  activities = input.required<UserActivity[]>();
}