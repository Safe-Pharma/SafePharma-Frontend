import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PurchaseOrderApiService } from '../Services/purchase-order-api';
import { EgpCurrencyPipe } from '../../../Shared/Pipes/egp-currency.pipe';
import { I18nService } from '../../../Core/Services/i18n.service';
import { PageHeaderComponent } from '../../../Shared/Components/page-header/page-header';

@Component({
  selector: 'app-purchase-order-details-page',
  standalone: true,
  imports: [CommonModule, RouterLink, EgpCurrencyPipe, PageHeaderComponent],
  templateUrl: './purchase-order-details-page.html',
  styleUrl: './purchase-order-details-page.css',
})
export class PurchaseOrderDetailsPage implements OnInit {
  protected readonly i18n = inject(I18nService);
  text(key: string): string { return this.i18n.text(key); }
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly notFound = signal(false);
  readonly order = signal<any | null>(null);
  private id = '';

  constructor(
    private route: ActivatedRoute,
    private api: PurchaseOrderApiService,
  ) {}

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    this.load();
  }

  load(): void {
    if (!this.id) {
      this.loading.set(false);
      this.notFound.set(true);
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.notFound.set(false);
    this.api.getPurchaseOrderById(this.id).subscribe({
      next: (res: any) => {
        const data = res?.data ?? res;
        if (!data) {
          this.notFound.set(true);
        } else {
          this.order.set(data);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        if (err?.status === 404) this.notFound.set(true);
        else if (err?.status === 401 || err?.status === 403) this.error.set('You do not have permission to view this purchase order.');
        else this.error.set(this.text('purchase.errorLoad'));
      },
    });
  }
}
