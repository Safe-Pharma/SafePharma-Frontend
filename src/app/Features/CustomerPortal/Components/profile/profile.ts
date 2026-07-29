import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PortalAuthService } from '../../Services/portal-auth.service';
import { PortalI18nService } from '../../Services/portal-i18n.service';
import { PersonalInfoSection } from './personal-info/personal-info';
import { MedicineHistorySection } from './medicine-history/medicine-history';
import { AllergiesSection } from './allergies/allergies';
import { ChronicConditionsSection } from './chronic-conditions/chronic-conditions';
import { OrganFunctionsSection } from './organ-functions/organ-functions';
import { PortalSkeleton } from '../../Shared/skeleton';
import { PortalEmptyStateComponent } from '../../Shared/empty-state';
import { fadeSlideIn, staggerList, listItem, dialogOverlay, dialogPanel, successPulse } from '../../Shared/portal-animations';

type ProfileTab = 'personal' | 'medical' | 'allergies' | 'chronic' | 'organs';

@Component({
  selector: 'app-portal-profile',
  standalone: true,
  imports: [
    PersonalInfoSection,
    MedicineHistorySection,
    AllergiesSection,
    ChronicConditionsSection,
    OrganFunctionsSection,
    PortalSkeleton,
    PortalEmptyStateComponent,
  ],
  templateUrl: './profile.html',
  animations: [fadeSlideIn, staggerList, listItem, dialogOverlay, dialogPanel, successPulse],
})
export class PortalProfile implements OnInit {
  private readonly route = inject(ActivatedRoute);
  readonly portalAuth = inject(PortalAuthService);
  protected readonly i18n = inject(PortalI18nService);

  readonly customerId = signal('');

  // labelKey values must match the actual keys in portal-i18n.service.ts,
  // which are nested under 'profile.tabs.*' — not 'profile.*'.
  readonly tabs: { id: ProfileTab; labelKey: string }[] = [
    { id: 'personal', labelKey: 'profile.tabs.personal' },
    { id: 'medical', labelKey: 'profile.tabs.medical' },
    { id: 'allergies', labelKey: 'profile.tabs.allergies' },
    { id: 'chronic', labelKey: 'profile.tabs.chronic' },
    { id: 'organs', labelKey: 'profile.tabs.organs' },
  ];

  readonly activeTab = signal<ProfileTab>(
    (this.route.snapshot.queryParamMap.get('tab') as ProfileTab) ?? 'personal',
  );

  ngOnInit(): void {
    this.syncCustomerId(this.route.snapshot.queryParamMap.get('customerId'));

    this.route.queryParamMap.subscribe((params) => {
      this.syncCustomerId(params.get('customerId'));
      const tab = params.get('tab') as ProfileTab | null;
      if (tab) {
        this.activeTab.set(tab);
      }
    });
  }

  private syncCustomerId(customerId: string | null): void {
    this.customerId.set(customerId ?? this.portalAuth.session()?.customerId ?? '');
  }

  setTab(tab: ProfileTab): void {
    this.activeTab.set(tab);
  }
}