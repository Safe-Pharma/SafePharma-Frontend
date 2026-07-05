import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PharmacySettings as PharmacySettingsService } from './Services/pharmacy-settings';
import { ChangeDetectorRef } from '@angular/core';
import { UserLanguage } from './Services/user-language';
import { Toast } from '../../../Shared/Toasts/toast';

@Component({
  selector: 'app-pharmacy-settings',
  imports: [CommonModule, FormsModule],
  templateUrl: './pharmacy-settings.html',
  styleUrl: './pharmacy-settings.css',
})
export class PharmacySettings implements OnInit {
  selectedFile: File | null = null;
  previewUrl: string | null = null;

  selectedLanguage: string = 'en';
  isLoading = false;

  languages = [
    { value: 'en', label: 'English' },
    { value: 'ar', label: 'Arabic' },
  ];

  settings = {
    name: '',
    logoUrl: null,
    address: '',
    city: '',
    country: '',
    phone: '',
    taxRegistrationNumber: '',
  };
  validationErrors: { [key: string]: string } = {};

  constructor(
    private settingsService: PharmacySettingsService,
    private userLanguageService: UserLanguage,
    private cdr: ChangeDetectorRef,
    private toast: Toast,
  ) {}

  ngOnInit(): void {
    this.settingsService.getSettings().subscribe((res) => {
      this.settings = {
        name: res.data.name || '',
        logoUrl: res.data.logoUrl || null,
        address: res.data.address === 'null' ? '' : res.data.address || '',
        city: res.data.city === 'null' ? '' : res.data.city || '',
        country: res.data.country === 'null' ? '' : res.data.country || '',
        phone: res.data.phone === 'null' ? '' : res.data.phone || '',
        taxRegistrationNumber:
          res.data.taxRegistrationNumber === 'null' ? '' : res.data.taxRegistrationNumber || '',
      };
      this.cdr.detectChanges();
    });
    this.userLanguageService.getLanguage().subscribe((res) => {
      this.selectedLanguage = res.message ?? 'en';
    });
  }
  onSubmit(): void {
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

    if (this.selectedFile) {
      formData.append('LogoFile', this.selectedFile);
    }

    this.settingsService.updateSettings(formData).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.cdr.detectChanges();
        console.log('Updated successfully', res);
        this.toast.show('Settings saved successfully!', 'success');
      },
      error: (err) => {
        this.isLoading = false;
        this.cdr.detectChanges();

        if (err.error?.errors) {
          const errors = err.error.errors;
          Object.keys(errors).forEach((key) => {
            this.validationErrors[key] = errors[key][0].errorMessage;
          });
          this.toast.show('Please fix the errors below.', 'error');
        } else {
          this.toast.show('Something went wrong.', 'error');
        }
        this.cdr.detectChanges();
      },
    });
    this.userLanguageService.updateLanguage(this.selectedLanguage).subscribe();
  }
  onLogoSelected(event: any) {
    const file = event.target.files[0];

    if (!file) return;

    this.selectedFile = file;

    const reader = new FileReader();

    reader.onload = () => {
      this.previewUrl = reader.result as string;
    };

    reader.readAsDataURL(file);
  }
}
