import { Routes } from '@angular/router';
import { PublicLayout } from './Features/Layout/Public Layout/Components/public-layout';
import { privatelayout } from './Features/Layout/Private Layout/Components/private-layout';

export const routes: Routes = [
  {
    path: '',
    component: PublicLayout,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./Features/landing-page/landing-page').then(m => m.LandingPage),
      },
      {
        path: 'subscribe',
        loadComponent: () =>
          import('./Features/subscribe/subscribe').then(m => m.Subscribe),
      },
    ],
  },

  {
    path: 'app',
    component: privatelayout,
    children: [
      {
        path: 'settings',
        loadComponent: () =>
          import('./Features/settings/pharmacy-settings/pharmacy-settings')
          .then(m => m.PharmacySettings),
      },
      {
        path: 'taxes',
        loadComponent: () =>
          import('./Features/Tax/taxes').then(m => m.Taxes),
      },
    ],
  },
];
