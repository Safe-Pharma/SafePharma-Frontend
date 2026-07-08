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
        path: 'subscribe/:subscriptionId/payment',
        loadComponent: () =>
          import('./Features/subscribe/payment-instructions/payment-instructions').then(
            (m) => m.PaymentInstructions,
          ),
      },
      {
        path: 'subscribe/:subscriptionId/payment/proof',
        loadComponent: () =>
          import('./Features/subscribe/submit-payment-proof/submit-payment-proof').then(
            (m) => m.SubmitPaymentProof,
          ),
      },
      {
        path: 'subscribe/:subscriptionId/payment/review',
        loadComponent: () =>
          import('./Features/subscribe/payment-under-review/payment-under-review').then(
            (m) => m.PaymentUnderReview,
          ),
      },
      {
        path: 'subscribe/:subscriptionId/status',
        loadComponent: () =>
          import('./Features/subscribe/subscription-status/subscription-status').then(
            (m) => m.SubscriptionStatus,
          ),
      },
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
           data: {
               title: 'Settings'
                         }
      },
      { path: 'profile', component: ProfilePage },
      {
        path: 'taxes',
        loadComponent: () => import('./Features/Tax/Components/taxes').then((m) => m.Taxes),
              data: {
               title: 'Taxes'
                         }
      
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./Features/users/pages/users-list/users-list').then((m) => m.UsersListComponent),
              data: {
               title: 'Users'
                         }
      },
      { path: 'change-password', component: ChangePassword },
      {
        path: 'suppliers',
        loadComponent: () =>
          import('./Features/Supplier/Components/Supplier').then((m) => m.Suppliers),
              data: { 
               title: 'Suppliers'
                         }
      },
      {
        path: 'purchases',
        loadComponent: () =>
          import('./Features/PurchaseOrder/purchase-order-page/purchase-order-page').then(
            (m) => m.PurchaseOrderPage,
          ),
              data: { 
               title: 'Purchases'
                         }
      },
    ],
  },
];
