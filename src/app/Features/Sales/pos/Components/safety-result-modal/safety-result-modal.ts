import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PatientSafetyResult, SafetyIssueSeverity } from '../../Model/patient-safety.models';

/** One card's worth of pre-resolved display data — the template stays dumb. */
interface SafetyCardView {
  result: PatientSafetyResult;
  patientName: string;
  decisionTone: 'ok' | 'warn' | 'danger';
}

const SEVERITY_WEIGHT: Record<SafetyIssueSeverity, number> = { Minor: 1, Moderate: 2, Major: 3 };

@Component({
  selector: 'app-safety-result-modal',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './safety-result-modal.html',
})
export class SafetyResultModalComponent {
  /** Results returned by /api/PatientSafety/check — one per customer checked
   *  ("Check all" makes one call per distinct customer and merges the results). */
  results = input.required<PatientSafetyResult[]>();
  /** patientRef (customerId) -> display name, so the popup doesn't just show GUIDs. */
  patientNames = input<Record<string, string>>({});
  loading = input(false);
  errorMessage = input<string | null>(null);

  closed = output<void>();

  protected readonly cards = computed<SafetyCardView[]>(() =>
    this.results().map((result) => ({
      result,
      patientName: this.patientNames()[result.patientRef] || 'Customer',
      decisionTone: this.toneFor(result),
    })),
  );

  private toneFor(result: PatientSafetyResult): 'ok' | 'warn' | 'danger' {
    if (!result.checkSucceeded) return 'warn';
    switch (result.overallDecision) {
      case 'Block':
        return 'danger';
      case 'Warn':
        return 'warn';
      case 'Approve':
        return 'ok';
    }
    // Fallback in case overallDecision wasn't set for some reason.
    const worst = result.issues.reduce(
      (max, issue) => Math.max(max, SEVERITY_WEIGHT[issue.severity] ?? 0),
      0,
    );
    if (worst >= 3 || (result.riskScore ?? 0) >= 70) return 'danger';
    if (worst >= 1 || (result.riskScore ?? 0) >= 30) return 'warn';
    return 'ok';
  }

  protected severityWeight(severity: SafetyIssueSeverity): number {
    return SEVERITY_WEIGHT[severity] ?? 0;
  }

  protected onClose(): void {
    this.closed.emit();
  }
}
