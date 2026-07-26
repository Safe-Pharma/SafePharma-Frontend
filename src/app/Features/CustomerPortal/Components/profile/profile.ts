import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PortalAuthService } from '../../Services/portal-auth.service';
import { PortalI18nService } from '../../Services/portal-i18n.service';
import { PersonalInfoSection } from './personal-info/personal-info';
import { MedicineHistorySection } from './medicine-history/medicine-history';
import { AllergiesSection } from './allergies/allergies';
import { ChronicConditionsSection } from './chronic-conditions/chronic-conditions';
import { OrganFunctionsSection } from './organ-functions/organ-functions';
import { PortalSkeleton } from '../../Shared/skeleton';


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
  ],
  templateUrl: './profile.html',
})
export class PortalProfile {
  private readonly route = inject(ActivatedRoute);
  readonly portalAuth = inject(PortalAuthService);
  readonly i18n = inject(PortalI18nService);

  readonly customerId = this.portalAuth.session()?.customerId ?? '';

  readonly tabs: { id: ProfileTab; labelKey: string }[] = [
    { id: 'personal', labelKey: 'profile.personal' },
    { id: 'medical', labelKey: 'profile.medicineHistory' },
    { id: 'allergies', labelKey: 'profile.allergies' },
    { id: 'chronic', labelKey: 'profile.chronic' },
    { id: 'organs', labelKey: 'profile.organs' },
  ];

  readonly activeTab = signal<ProfileTab>(
    (this.route.snapshot.queryParamMap.get('tab') as ProfileTab) ?? 'personal',
  );

  setTab(tab: ProfileTab): void {
    this.activeTab.set(tab);
  }
}