import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../Core/Services/i18n.service';
import { PageHeaderComponent } from '../../Shared/Components/page-header/page-header';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [RouterLink, PageHeaderComponent],
  templateUrl: './reports.html',
  styleUrl: './reports.css',
})
export class ReportsPage {
  protected readonly i18n = inject(I18nService);
}
