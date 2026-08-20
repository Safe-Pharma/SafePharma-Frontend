import { Component, OnInit, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { PharmacyService } from './Service/pharmacy_service';
import { PharmacyReadDto } from './Models/pharmacy-read.dto';
import { Router } from '@angular/router';
import { AuthSessionService } from '../../Core/Services/auth-session.service';
import { Spinner } from '../../Shared/Components/spinner/spinner';
import { formatCurrency } from '../../Shared/utils/currency.util';

interface Pharmacy {
  id: string;
  name: string;
  nameAr: string;
  initials: string;
  avatarColor: string;
  ownerName: string;
  ownerEmail: string;
  city: string;
  plan: 'Starter' | 'Professional' | 'Enterprise';
  users: number;
  mrr: number;
  renewsDate: string;
  status: 'Active' | 'Inactive';
  activated: boolean;
  commercialRegistration: string | null;
  address: string;
  country: string;
  phone: string;
  businessEmail: string;
  isActive: boolean;
}

interface StatCard {
  label: string;
  value: WritableSignal<string>;
  change: string;
  changeType: 'positive' | 'negative';
  icon: string;
  iconBg: string;
  iconColor: string;
}

@Component({
  selector: 'app-owner-dashboard',
  imports: [CommonModule, FormsModule, Spinner],
  templateUrl: './owner-dashboard.html',
  styleUrl: './owner-dashboard.css',
})
export class PharmaciesDashboardComponent implements OnInit {
  constructor(
    private pharmacyService: PharmacyService,
    private authSession: AuthSessionService,
    private router: Router,
  ) {}

  // Top Stats
  stats = signal<StatCard[]>([
    {
      label: 'Total Pharmacies',
      value: signal('0'),
      change: '',
      changeType: 'positive',
      icon: 'building',
      iconBg: 'var(--primary-soft)',
      iconColor: 'var(--primary)',
    },
    {
      label: 'Active Pharmacies',
      value: signal('0'),
      change: '',
      changeType: 'positive',
      icon: 'check-circle',
      iconBg: 'var(--success-soft)',
      iconColor: 'var(--success)',
    },
    {
      label: 'Inactive',
      value: signal('0'),
      change: '',
      changeType: 'positive',
      icon: 'pause-circle',
      iconBg: 'var(--warning-soft)',
      iconColor: 'var(--warning)',
    },
  ]);

  // Plan distribution
  planDistribution = signal([
    { name: 'Starter', count: 4, percentage: 33 },
    { name: 'Professional', count: 4, percentage: 33 },
    { name: 'Enterprise', count: 4, percentage: 33 },
  ]);

  activeUsers = signal(136);

  // Filters
  searchQuery = signal('');
  selectedPlan = signal('');
  selectedStatus = signal('');

  // Pharmacies data
  pharmacies = signal<Pharmacy[]>([]);
  filteredPharmacies = signal<Pharmacy[]>([]);
  loading = signal(true);
  updatingPharmacyId = signal<string | null>(null);

  ngOnInit() {
    this.loadPharmacies();
  }

  loadPharmacies() {
    this.loading.set(true);
    this.pharmacyService
      .getAllPharmacies()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => {
          const pharmacies = data.map(
            (pharmacy: PharmacyReadDto, index): Pharmacy => ({
              ...pharmacy,
              nameAr: '',
              initials: pharmacy.name.slice(0, 2).toUpperCase(),
              avatarColor: index % 2 === 0 ? 'var(--primary)' : 'var(--success)',
              ownerName: pharmacy.businessEmail,
              ownerEmail: pharmacy.businessEmail,
              plan: 'Starter',
              users: 0,
              mrr: 0,
              renewsDate: '-',
              status: pharmacy.isActive ? 'Active' : 'Inactive',
              activated: pharmacy.isActive,
            }),
          );

          this.pharmacies.set(pharmacies);
          this.filteredPharmacies.set(pharmacies);
          this.updateStats(data);
        },
        error: (error) => console.error('Failed to load pharmacies:', error),
      });
  }

  private updateStats(data: PharmacyReadDto[]): void {
    const activeCount = data.filter((pharmacy) => pharmacy.isActive).length;
    this.stats()
      .find((card) => card.label === 'Total Pharmacies')
      ?.value.set(String(data.length));
    this.stats()
      .find((card) => card.label === 'Active Pharmacies')
      ?.value.set(String(activeCount));
    this.stats()
      .find((card) => card.label === 'Inactive')
      ?.value.set(String(data.length - activeCount));
  }

  onFilterChange() {
    const query = this.searchQuery().toLowerCase();
    const plan = this.selectedPlan();
    const status = this.selectedStatus();

    const filtered = this.pharmacies().filter((p) => {
      const matchSearch =
        !query ||
        p.name.toLowerCase().includes(query) ||
        p.ownerName.toLowerCase().includes(query) ||
        p.city.toLowerCase().includes(query);

      const matchPlan = !plan || p.plan === plan;
      const matchStatus = !status || p.status === status;

      return matchSearch && matchPlan && matchStatus;
    });

    this.filteredPharmacies.set(filtered);
  }

  toggleActivation(pharmacy: Pharmacy) {
    if (this.updatingPharmacyId()) {
      return;
    }

    const nextActiveState = !pharmacy.activated;
    this.updatingPharmacyId.set(pharmacy.id);

    this.pharmacyService.updateActiveState(pharmacy.id, nextActiveState).subscribe({
      next: (isActive) => {
        const updateRow = (row: Pharmacy): Pharmacy =>
          row.id === pharmacy.id
            ? {
                ...row,
                status: isActive ? 'Active' : 'Inactive',
                activated: isActive,
                isActive,
              }
            : row;

        const updatedPharmacies = this.pharmacies().map(updateRow);
        this.pharmacies.set(updatedPharmacies);
        this.filteredPharmacies.update((rows) => rows.map(updateRow));
        this.updateStats(updatedPharmacies);
        this.updatingPharmacyId.set(null);
      },
      error: (error) => {
        console.error('Failed to update pharmacy status:', error);
        this.updatingPharmacyId.set(null);
      },
    });
  }

  logout(): void {
    this.authSession.clearToken();
    this.router.navigateByUrl('/owner-login');
  }

  getPlanBadgeStyle(plan: string): { bg: string; color: string; dot: string } {
    const styles: { [key: string]: { bg: string; color: string; dot: string } } = {
      Starter: {
        bg: 'var(--muted)',
        color: 'var(--muted-foreground)',
        dot: 'var(--muted-foreground)',
      },
      Professional: { bg: 'var(--success-soft)', color: 'var(--success)', dot: 'var(--success)' },
      Enterprise: { bg: 'var(--primary-soft)', color: 'var(--primary)', dot: 'var(--primary)' },
    };
    return styles[plan] || styles['Starter'];
  }

  formatMRR(value: number): string {
    return formatCurrency(value);
  }

  formatDate(dateString: string): string {
    return dateString;
  }
}
