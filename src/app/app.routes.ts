import { Routes } from '@angular/router';
import { PublicLayout } from './Features/Layout/Public Layout/Components/public-layout';
import { privatelayout } from './Features/Layout/Private Layout/Components/private-layout';
import { AuditPage } from './Features/audit-page/audit-page';
import { AuthLayout } from './Features/Layout/Auth Layout/Components/Auth-layout';
import { Login } from './Features/Authentication/login/login';
import { ProfilePage } from './Features/Profile/profile-page';
import { ChangePassword } from './Features/Authentication/change-password/change-password';
import { InventoryPage } from './Features/inventory-page/inventory-page';
import { portalAuthGuard } from './Core/Guards/portal-auth.guard';
import { staffAuthGuard } from './Core/Guards/staff-auth.guard';
import { ownerAuthGuard } from './Core/Guards/owner-auth.guard';

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
          import('./Features/Authentication/set-password/set-password').then(
            (m) => m.CreatePasswordComponent,
          ),
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
    children: [
      { path: 'login', component: Login },
      {
        path: 'owner-login',
        loadComponent: () =>
          import('./Features/Authentication/owner-login/owner-login').then((m) => m.OwnerLogin),
      },
    ],
  },

  {
    path: 'app',
    component: privatelayout,
    canActivate: [staffAuthGuard],
    canActivateChild: [staffAuthGuard],
    children: [
      {
        path: 'settings',
        loadComponent: () =>
          import('./Features/settings/pharmacy-settings/pharmacy-settings').then(
            (m) => m.PharmacySettings,
          ),
        data: {
          title: 'Settings',
        },
      },
      { path: 'profile', component: ProfilePage },
      {
        path: 'taxes',
        loadComponent: () => import('./Features/Tax/Components/taxes').then((m) => m.Taxes),
        data: {
          title: 'Taxes',
        },
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./Features/users/pages/users-list/users-list').then((m) => m.UsersListComponent),
        data: {
          title: 'Users',
        },
      },
      {
        path: 'users/:id',
        loadComponent: () =>
          import('./Features/users/pages/user-details/user-details').then(
            (m) => m.UserDetailComponent,
          ),
      },
      { path: 'change-password', component: ChangePassword },
      {
        path: 'suppliers',
        loadComponent: () =>
          import('./Features/Supplier/Components/Supplier').then((m) => m.Suppliers),
        data: {
          title: 'Suppliers',
        },
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./Features/PharmacyDashborad/Components/pharmacy_dashborad').then(
            (m) => m.DashboardPage,
          ),
        data: {
          title: 'Dashboard',
        },
      },
      {
        path: 'purchases',
        loadComponent: () =>
          import('./Features/PurchaseOrder/purchase-order-page/purchase-order-page').then(
            (m) => m.PurchaseOrderPage,
          ),
        data: {
          title: 'Purchases',
        },
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./Features/Medicine/Components/medicines-list/medicines-list').then(
            (m) => m.MedicinesListComponent,
          ),
        data: { title: 'Medicines' },
      },
      {
        path: 'products/:id',
        loadComponent: () =>
          import('./Features/Medicine/Components/medicine-details/medicine-details').then(
            (m) => m.MedicineDetailsComponent,
          ),
        data: { title: 'Medicine Details' },
      },
      {
        path: 'customers',
        loadComponent: () =>
          import('./Features/Customer/Components/customers-list/customers-list').then(
            (m) => m.CustomersListComponent,
          ),
        data: { title: 'Customers' },
      },
      {
        path: 'customers/:id',
        loadComponent: () =>
          import('./Features/Customer/Components/customer-details/customer-details').then(
            (m) => m.CustomerDetailsComponent,
          ),
        data: { title: 'Customer Details' },
      },
      {
        path: 'pos',
        loadComponent: () => import('./Features/Sales/pos/pos').then((m) => m.Pos),
        data: { title: 'Pos' },
      },
      {
        path: 'sales',
        loadComponent: () => import('./Features/Sales/Sales/sales').then((m) => m.Sales),
        data: { title: 'Sales' },
      },

      /* {

        path: '',
        loadComponent: () =>
          import('./Features/dashboard/dashboard').then(m => m.Dashboard),
      }, */
      {
        path: 'audit',
        component: AuditPage,
        data: {
          title: 'Audit',
        },
      },
      {
        path: 'inventory',
        component: InventoryPage,
        data: {
          title: 'Inventory',
        },
      },
      //{ path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  {
    path: 'portal/login',
    loadComponent: () =>
      import('./Features/CustomerPortal/Auth/portal-login/portal-login').then((m) => m.PortalLogin),
  },
  {
    path: 'portal/otp',
    loadComponent: () =>
      import('./Features/CustomerPortal/Auth/portal-otp/portal-otp').then((m) => m.PortalOtp),
  },
  {
    path: 'portal',
    canActivate: [portalAuthGuard],
    canActivateChild: [portalAuthGuard],
    loadComponent: () =>
      import('./Features/CustomerPortal/Layout/portal-layout').then((m) => m.PortalLayout),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./Features/CustomerPortal/Components/dashboard/dashboard').then(
            (m) => m.PortalDashboard,
          ),
        data: { title: 'Dashboard' },
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./Features/CustomerPortal/Components/profile/profile').then(
            (m) => m.PortalProfile,
          ),
        data: { title: 'My Profile' },
      },
      {
        path: 'purchases',
        loadComponent: () =>
          import('./Features/CustomerPortal/Components/purchase-history/purchase-history').then(
            (m) => m.PurchaseHistoryPage,
          ),
        data: { title: 'Purchase History' },
      },
      {
        path: 'purchases/:id',
        loadComponent: () =>
          import('./Features/CustomerPortal/Components/receipt-details/receipt-details').then(
            (m) => m.ReceiptDetailsPage,
          ),
        data: { title: 'Receipt Details' },
      },
      {
        path: 'relatives',
        loadComponent: () =>
          import('./Features/CustomerPortal/Components/relatives/relatives').then(
            (m) => m.RelativesPage,
          ),
        data: { title: 'Relatives' },
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  {
    path: 'portal',
    canActivate: [portalAuthGuard],
    canActivateChild: [portalAuthGuard],
    loadComponent: () =>
      import('./Features/CustomerPortal/Layout/portal-layout').then((m) => m.PortalLayout),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./Features/CustomerPortal/Components/dashboard/dashboard').then(
            (m) => m.PortalDashboard,
          ),
        data: { title: 'Dashboard' },
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./Features/CustomerPortal/Components/profile/profile').then(
            (m) => m.PortalProfile,
          ),
        data: { title: 'My Profile' },
      },
      {
        path: 'purchases',
        loadComponent: () =>
          import('./Features/CustomerPortal/Components/purchase-history/purchase-history').then(
            (m) => m.PurchaseHistoryPage,
          ),
        data: { title: 'Purchase History' },
      },
      {
        path: 'purchases/:id',
        loadComponent: () =>
          import('./Features/CustomerPortal/Components/receipt-details/receipt-details').then(
            (m) => m.ReceiptDetailsPage,
          ),
        data: { title: 'Receipt Details' },
      },
    ],
  },
  {
    path: 'owner-login',
    loadComponent: () =>
      import('./Features/Authentication/owner-login/owner-login').then((m) => m.OwnerLogin),
  },
  {
    path: 'owner-dashboard',
    canActivate: [ownerAuthGuard],
    loadComponent: () =>
      import('./Features/owner-dashboard/owner-dashboard').then(
        (m) => m.PharmaciesDashboardComponent,
      ),
    data: { title: 'Owner Dashboard' },
  },
];
