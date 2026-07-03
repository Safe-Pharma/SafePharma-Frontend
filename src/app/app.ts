import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PublicLayout } from './Features/Layout/Public Layout/Components/public-layout';
import { privatelayout } from './Features/Layout/Private Layout/Components/private-layout';
import { PharmacySettings } from "./Features/settings/pharmacy-settings/pharmacy-settings";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, PublicLayout, privatelayout, PharmacySettings],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('front');
}
