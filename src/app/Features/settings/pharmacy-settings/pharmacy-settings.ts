import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PharmacySettings as PharmacySettingsService } from './Services/pharmacy-settings';
import { ChangeDetectorRef } from '@angular/core';
import { UserLanguageCode } from './Services/user-language';
import { I18nService } from '../../../Core/Services/i18n.service';
import { Toast } from '../../../Shared/Toasts/toast';
import { Spinner } from '../../../Shared/Components/spinner/spinner';
import { SearchableSelectComponent, SearchableSelectOption } from '../../../Shared/Components/searchable-select/searchable-select';
import { LocationService } from '../../subscribe/Services/location.service';
import { City, CountryWithCities } from '../../subscribe/Models/country-with-cities.model';
import { forkJoin } from 'rxjs';
import { PageHeaderComponent } from '../../../Shared/Components/page-header/page-header';

interface PharmacySettingsFormState {
  name: string;
  logoUrl: string | null;
  address: string;
  city: string;
  country: string;
  phone: string;
  taxRegistrationNumber: string;
}

@Component({
  selector: 'app-pharmacy-settings',
  imports: [CommonModule, FormsModule, Spinner, SearchableSelectComponent, PageHeaderComponent],
  templateUrl: './pharmacy-settings.html',
  styleUrl: './pharmacy-settings.css',
})
export class PharmacySettings implements OnInit, OnDestroy {
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  private logoRemovalRequested = false;

  selectedLanguage: UserLanguageCode = 'en';
  isLoading = false;
  settingsLoading = true;
  locationLoading = true;
  locationError: string | null = null;
  countries: CountryWithCities[] = [];
  cities: City[] = [];

  languages = [
    { value: 'en', label: 'language.english' },
    { value: 'ar', label: 'language.arabic' },
  ];

  settings: PharmacySettingsFormState = {
    name: '',
    logoUrl: null,
    address: '',
    city: '',
    country: '',
    phone: '',
    taxRegistrationNumber: '',
  };
  private savedSettings: PharmacySettingsFormState = { ...this.settings };
  validationErrors: { [key: string]: string } = {};

  @ViewChild('fileInput') private fileInput?: ElementRef<HTMLInputElement>;

  constructor(
    private settingsService: PharmacySettingsService,
    private i18n: I18nService,
    private cdr: ChangeDetectorRef,
    private toast: Toast,
    private locationService: LocationService,
  ) {}

  text(key: string, params?: Record<string, string | number>): string {
    return this.i18n.text(key, params);
  }

  ngOnInit(): void {
    this.loadLocations();
    this.settingsService.getSettings().subscribe((res) => {
      this.applySavedSettings(res.data);
      this.settingsLoading = false;
      this.cdr.detectChanges();
    }, (err) => {
      this.settingsLoading = false;
      this.toast.show(this.i18n.text('settings.loadError'), 'error');
      this.cdr.detectChanges();
    });
    this.selectedLanguage = this.i18n.tenantDefault();
  }

  ngOnDestroy(): void {
    this.revokePreviewUrl();
    this.settingsService.clearLogoPreview();
  }

  get governorateOptions(): SearchableSelectOption[] {
    return this.countries.map((country) => ({
      value: country.name,
      label: country.name,
      secondary: country.code,
    }));
  }

  get cityOptions(): SearchableSelectOption[] {
    return this.cities.map((city) => ({ value: city.name, label: city.name }));
  }

  get languageOptions(): SearchableSelectOption[] {
    return this.languages.map((language) => ({ value: language.value, label: this.i18n.text(language.label) }));
  }

  private loadLocations(): void {
    this.locationLoading = true;
    this.locationError = null;
    this.locationService.getCountries().subscribe({
      next: (result) => {
        if (result.success && result.data) {
          this.countries = result.data;
          this.syncLocationSelection();
        } else {
          this.locationError = this.i18n.text('settings.locationError');
        }
        this.locationLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.locationLoading = false;
        this.locationError = this.i18n.text('settings.locationError');
        this.cdr.detectChanges();
      },
    });
  }

  private syncLocationSelection(): void {
    if (!this.countries.length || !this.settings.country) return;
    const selected = this.findGovernorate(this.settings.country);
    if (!selected) return;

    this.settings.country = selected.name;
    this.cities = selected.cities ?? [];
    if (this.settings.city && !this.cities.some((city) => city.name === this.settings.city)) {
      this.settings.city = '';
    }
  }

  private findGovernorate(value: string): CountryWithCities | undefined {
    const normalized = value.trim().toLowerCase();
    return this.countries.find((country) =>
      [country.id, country.name, country.code].some((candidate) => candidate?.toLowerCase() === normalized),
    );
  }

  onGovernorateChange(value: string): void {
    this.settings.country = value;
    const selected = this.findGovernorate(value);
    this.cities = selected?.cities ?? [];
    if (!this.cities.some((city) => city.name === this.settings.city)) {
      this.settings.city = '';
    }
    delete this.validationErrors['Governorate'];
    delete this.validationErrors['City'];
  }

  onCityChange(value: string): void {
    this.settings.city = value;
    delete this.validationErrors['City'];
  }

  retryLocations(): void {
    this.loadLocations();
  }

  onLanguageChange(value: string): void {
    this.selectedLanguage = value === 'ar' ? 'ar' : 'en';
  }

  onSubmit(): void {
    if (this.isLoading) {
      return;
    }
    this.isLoading = true;
    this.cdr.detectChanges();

    this.validationErrors = {};

    const formData = new FormData();

    formData.append('Name', this.settings.name);
    formData.append('Address', this.settings.address);
    formData.append('City', this.settings.city);
    formData.append('Country', this.settings.country);
    formData.append('Phone', this.settings.phone);
    formData.append('TaxRegistrationNumber', this.settings.taxRegistrationNumber);
    // Settings controls the tenant default; the Navbar controls the user override.
    formData.append('PreferredLanguage', this.selectedLanguage === 'ar' ? 'Arabic' : 'English');
    formData.append('DefaultLanguage', this.selectedLanguage);

    if (this.selectedFile) {
      formData.append('LogoFile', this.selectedFile);
    }
    if (this.logoRemovalRequested) {
      formData.append('RemoveLogo', 'true');
    }

    forkJoin({
      settings: this.settingsService.updateSettings(formData),
    }).subscribe({
      next: () => {
        this.settingsService.getSettings(true).subscribe({
          next: (res) => {
            this.applySavedSettings(res.data);
            this.i18n.setTenantDefault(this.selectedLanguage);
            this.isLoading = false;
            this.cdr.detectChanges();
            this.toast.show(this.i18n.text('settings.saveSuccess'), 'success');
          },
          error: () => {
            this.isLoading = false;
            this.cdr.detectChanges();
            this.toast.show(this.i18n.text('settings.saveFallback'), 'success');
          },
        });
      },
      error: (err) => {
        this.isLoading = false;
        this.cdr.detectChanges();

        if (err.error?.errors) {
          const errors = err.error.errors;
          Object.keys(errors).forEach((key) => {
            this.validationErrors[key] = errors[key][0].errorMessage;
          });
            this.toast.show(this.i18n.text('settings.validationError'), 'error');
        } else {
          this.toast.show(this.i18n.text('common.somethingWentWrong'), 'error');
        }
        this.cdr.detectChanges();
      },
    });
  }

  cancelChanges(): void {
    this.settings = { ...this.savedSettings };
    this.selectedFile = null;
    this.logoRemovalRequested = false;
    this.revokePreviewUrl();
    this.settingsService.clearLogoPreview();
    this.selectedLanguage = this.i18n.tenantDefault();
    this.validationErrors = {};
    this.fileInput?.nativeElement && (this.fileInput.nativeElement.value = '');
    this.syncLocationSelection();
    this.cdr.detectChanges();
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    this.revokePreviewUrl();
    this.selectedFile = file;
    this.logoRemovalRequested = false;
    this.previewUrl = URL.createObjectURL(file);
    this.settingsService.setLogoPreview(this.previewUrl);
  }

  removeLogo(): void {
    this.selectedFile = null;
    this.logoRemovalRequested = true;
    this.revokePreviewUrl();
    this.settings.logoUrl = null;
    this.settingsService.setLogoPreview(null);
    if (this.fileInput?.nativeElement) this.fileInput.nativeElement.value = '';
  }

  private applySavedSettings(data: any): void {
    const next: PharmacySettingsFormState = {
      name: data?.name || '',
      logoUrl: data?.logoUrl || null,
      address: data?.address === 'null' ? '' : data?.address || '',
      city: data?.city === 'null' ? '' : data?.city || '',
      country: data?.country === 'null' ? '' : data?.country || '',
      phone: data?.phone === 'null' ? '' : data?.phone || '',
      taxRegistrationNumber:
        data?.taxRegistrationNumber === 'null' ? '' : data?.taxRegistrationNumber || '',
    };

    this.settings = next;
    const tenantLanguage = this.i18n.normalize(
      data?.preferredLanguage ?? data?.defaultLanguage ?? data?.language,
    );
    if (tenantLanguage) {
      this.selectedLanguage = tenantLanguage;
      this.i18n.setTenantDefault(tenantLanguage);
    }
    this.savedSettings = { ...next };
    this.selectedFile = null;
    this.logoRemovalRequested = false;
    this.revokePreviewUrl();
    this.settingsService.clearLogoPreview();
    if (this.fileInput?.nativeElement) this.fileInput.nativeElement.value = '';
    this.syncLocationSelection();
  }

  private revokePreviewUrl(): void {
    if (this.previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(this.previewUrl);
    }
    this.previewUrl = null;
  }
}
