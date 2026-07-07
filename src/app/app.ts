import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PublicLayout } from './Features/Layout/Public Layout/Components/public-layout';
import { privatelayout } from './Features/Layout/Private Layout/Components/private-layout';
import { PharmacySettings } from "./Features/settings/pharmacy-settings/pharmacy-settings";
import { PurchaseOrderPage } from "./Features/PurchaseOrder/purchase-order-page/purchase-order-page";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, PublicLayout, privatelayout, PharmacySettings, PurchaseOrderPage],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('front');
}
