import { ChangeDetectionStrategy, Component, OnInit, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ALL_STATUSES } from '../../models/user.model';
import { RolesStateService } from '../../services/roles-state.service';
import { I18nService } from '../../../../Core/Services/i18n.service';

type StatusFilter = 'All' | 'Active' | 'Inactive';

@Component({
  selector: 'app-users-filter-bar',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './users-filter-bar.html',
  styleUrl: './users-filter-bar.css',
})
export class UsersFilterBarComponent implements OnInit {
  private readonly rolesState = inject(RolesStateService);
  protected readonly i18n = inject(I18nService);

  search = input('');
  role   = input<string>('');
  status = input<StatusFilter>('All');

  searchChange = output<string>();
  roleChange   = output<string>();
  statusChange = output<StatusFilter>();

  readonly roles    = this.rolesState.roles;
  readonly statuses: StatusFilter[] = ['All', ...ALL_STATUSES];

  ngOnInit(): void {
    this.rolesState.load(); // no-op if already loaded
  }

  onSearchInput(value: string): void { this.searchChange.emit(value); }
  onRoleChange(value: string): void  { this.roleChange.emit(value); }
  onStatusChange(value: string): void { this.statusChange.emit(value as StatusFilter); }
}
