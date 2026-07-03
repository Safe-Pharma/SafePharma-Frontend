import { Routes } from '@angular/router';
import { PublicLayout } from './Features/Layout/Public Layout/Components/public-layout';
import { privatelayout } from './Features/Layout/Private Layout/Components/private-layout';
import { Subscribe } from './Features/subscribe/subscribe';

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
      // { path: 'login', loadComponent: () => import().then(m => m.Login) },
      // { path: 'subscribe', loadComponent: () => import().then(m => m.Subscribe) },
      { path: 'subscribe', component: Subscribe }
    ],
  },

  {
    path: 'app',
    component: privatelayout,
    children: [
     /* {
        path: '',
        loadComponent: () =>
          import('./Features/dashboard/dashboard').then(m => m.Dashboard),
      }, */
      //{ path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
];