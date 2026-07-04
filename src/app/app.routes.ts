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
      
       {
            path: 'subscribe',
            loadComponent: () =>
                import('./Features/subscribe/subscribe')
                .then(m => m.Subscribe),
        },
           {
        path: 'change-password',
        loadComponent: () =>
          import('./Features/Authentication/change-password/change-password').then(
            (m) => m.ChangePassword
          ),
      },
       {
        path: 'login',
        loadComponent: () =>
          import('./Features/Authentication/login/login').then(
            (m) => m.Login
          ),
      },
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

        {
            path: 'settings',
            loadComponent: () =>
                import('./Features/settings/pharmacy-settings/pharmacy-settings')
                .then(m => m.PharmacySettings),
        },
         {
            path: 'taxes',
            loadComponent: () =>
                import('./Features/Tax/taxes')
                .then(m => m.Taxes),
        },
        
    ],

  },
];
