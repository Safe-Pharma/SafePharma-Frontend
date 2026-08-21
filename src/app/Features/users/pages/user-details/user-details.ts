import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { UsersService } from '../../services/users.service';
import { ProfileCardComponent } from '../../components/profile-card/profile-card';
import { ActivityFeedComponent } from '../../components/activity-feed/activity-feed';
import { DetailCardComponent } from '../../components/detail-card/detail-card';
import { DetailFieldComponent } from '../../components/detail-field/detail-field';
import { EditUserDialogComponent } from '../../components/edit-user-dialog/edit-user-dialog';
import { I18nService } from '../../../../Core/Services/i18n.service';
import { PageHeaderComponent } from '../../../../Shared/Components/page-header/page-header';
 
@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [
    DatePipe,
    ProfileCardComponent,
    ActivityFeedComponent,
    DetailCardComponent,
    DetailFieldComponent,
    EditUserDialogComponent,
    PageHeaderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-details.html',
  styleUrl: './user-details.css',
})
export class UserDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly i18n = inject(I18nService);
  protected readonly usersService = inject(UsersService);
 
  private readonly paramMap = toSignal(this.route.paramMap);
 
  protected readonly user = computed(() => {
    const id = this.paramMap()?.get('id');
    return id ? this.usersService.getUserById(id) : undefined;
  });
 
  protected readonly activities = computed(() => {
    const id = this.user()?.id;
    return id ? this.usersService.getActivitiesForUser(id) : [];
  });
 
  protected readonly firstName = computed(() => this.user()?.name.split(' ')[0] ?? '');
  protected readonly lastName = computed(() =>
    this.user()?.name.split(' ').slice(1).join(' ') ?? '',
  );
 
  protected readonly isEditDialogOpen = signal(false);
 
  onBack(): void {
    this.router.navigate(['app/users']);
  }
 
  onEdit(): void {
    this.isEditDialogOpen.set(true);
  }
 
  onEditDialogClosed(): void {
    this.isEditDialogOpen.set(false);
  }
}
