import { Routes } from '@angular/router';
import { PublicLayout } from './Features/Layout/Public Layout/Components/public-layout';
import { privatelayout } from './Features/Layout/Private Layout/Components/private-layout';
import { AuthLayout } from './Features/Layout/Auth Layout/Components/Auth-layout';
import { Login } from './Features/Authentication/login/login';
import { ChangePassword } from './Features/Authentication/change-password/change-password';
import { ProfilePage } from './Features/Profile/profile-page';

export const routes: Routes = [
  {
    path: '',
    component: PublicLayout,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./Features/landing-page/landing-page').then((m) => m.LandingPage),
      },
      {
        path: 'subscribe',
        loadComponent: () => import('./Features/subscribe/subscribe').then((m) => m.Subscribe),
      },
      {
      path: 'create-password',
      loadComponent: () =>
        import('./Features/Authentication/set-password/set-password').then(m => m.CreatePasswordComponent),
    }
    ],
  },

  {
    path: '',
    component: AuthLayout,
    children: [{ path: 'login', component: Login }],
  },

  {
    path: 'app',
    component: privatelayout,
    children: [
      {
        path: 'settings',
        loadComponent: () =>
          import('./Features/settings/pharmacy-settings/pharmacy-settings').then(
            (m) => m.PharmacySettings,
          ),
      },
      { path: 'profile', component: ProfilePage },
      {
        path: 'taxes',
        loadComponent: () => import('./Features/Tax/taxes').then((m) => m.Taxes),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./Features/users/pages/users-list/users-list').then((m) => m.UsersListComponent),
      },
      { path: 'change-password', component: ChangePassword },
    ],
  },
];
