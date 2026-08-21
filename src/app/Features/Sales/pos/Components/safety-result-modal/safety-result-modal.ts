import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  PatientSafetyResult,
  SafetyCheckedMedicine,
  SafetyIssue,
  SafetyIssueSeverity,
} from '../../Model/patient-safety.models';
import { ModalOverlayDirective } from '../../../../../Shared/Components/modal-overlay/modal-overlay';
import { I18nService } from '../../../../../Core/Services/i18n.service';
import { POS_DICT } from '../../pos.i18n';

type SafetyTone = 'ok' | 'warn' | 'danger';

interface SafetyMedicineView {
  key: string;
  medicine: SafetyCheckedMedicine;
  tone: SafetyTone;
  label: string;
  conclusion: string;
  issues: SafetyIssue[];
}

interface SafetyCardView {
  result: PatientSafetyResult;
  patientName: string;
  decisionTone: SafetyTone;
  medicines: SafetyMedicineView[];
}

const SEVERITY_WEIGHT: Record<SafetyIssueSeverity, number> = { Minor: 1, Moderate: 2, Major: 3 };

@Component({
  selector: 'app-safety-result-modal',
  standalone: true,
  imports: [CommonModule, ModalOverlayDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './safety-result-modal.html',
})
export class SafetyResultModalComponent {
  private readonly i18n = inject(I18nService);
  results = input.required<PatientSafetyResult[]>();
  patientNames = input<Record<string, string>>({});
  medicines = input<SafetyCheckedMedicine[]>([]);
  loading = input(false);
  errorMessage = input<string | null>(null);

  closed = output<void>();

  protected readonly expandedMedicineIds = signal<Record<string, boolean>>({});

  protected readonly cards = computed<SafetyCardView[]>(() =>
    this.results().map((result) => {
      const patientMedicines = this.medicines().filter(
        (medicine) => !medicine.customerId || medicine.customerId === result.patientRef,
      );
      return {
        result,
        patientName: this.patientNames()[result.patientRef] || this.t('toast.customerFallback'),
        decisionTone: this.toneFor(result),
        medicines: patientMedicines.map((medicine) => this.medicineView(result, medicine)),
      };
    }),
  );

  protected toggleMedicine(key: string): void {
    this.expandedMedicineIds.update((current) => ({ ...current, [key]: !current[key] }));
  }

  protected isExpanded(key: string): boolean {
    return Boolean(this.expandedMedicineIds()[key]);
  }

  protected toneLabel(tone: SafetyTone): string {
    return tone === 'ok' ? this.t('safety.safe') : tone === 'danger' ? this.t('safety.highRisk') : this.t('safety.warning');
  }

  protected t(key: string, params?: Record<string, string | number>): string { return this.i18n.t(POS_DICT, key, params); }

  protected severityWeight(severity: SafetyIssueSeverity): number {
    return SEVERITY_WEIGHT[severity] ?? 0;
  }

  private medicineView(result: PatientSafetyResult, medicine: SafetyCheckedMedicine): SafetyMedicineView {
    const issues = result.issues.filter((issue) =>
      issue.relatedDrugRefs?.some((ref) => ref === medicine.pharmacyMedicineId || ref === medicine.id),
    );
    const tone = issues.length > 0 ? this.toneForIssues(result, issues) : this.toneFor(result);
    const conclusion = issues[0]?.reason ||
      (result.checkSucceeded ? this.t('safety.noIssues') : result.failureReason || this.t('safety.couldNotComplete'));

    return {
      key: `${result.patientRef}:${medicine.id}`,
      medicine,
      tone,
      label: this.toneLabel(tone),
      conclusion,
      issues,
    };
  }

  private toneFor(result: PatientSafetyResult): SafetyTone {
    if (!result.checkSucceeded) return 'warn';
    if (result.overallDecision === 'Block') return 'danger';
    if (result.overallDecision === 'Warn') return 'warn';
    if (result.overallDecision === 'Approve') return 'ok';
    return this.toneForIssues(result, result.issues);
  }

  private toneForIssues(result: PatientSafetyResult, issues: SafetyIssue[]): SafetyTone {
    const worst = issues.reduce(
      (max, issue) => Math.max(max, SEVERITY_WEIGHT[issue.severity] ?? 0),
      0,
    );
    if (worst >= 3 || (result.riskScore ?? 0) >= 70) return 'danger';
    if (worst >= 1 || (result.riskScore ?? 0) >= 30 || !result.checkSucceeded) return 'warn';
    return 'ok';
  }

  protected onClose(): void {
    this.closed.emit();
  }
}
