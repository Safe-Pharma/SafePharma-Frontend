import { BadgeTone } from './status-badge';

// The Sales feature elsewhere in the app owns the canonical status enum; until that's
// exported/shared, this mirrors the numeric codes the portal spec's sales payload uses.
// Adjust the mapping here if the backend's enum values differ.
const LABELS: Record<number, string> = {
  0: 'Pending',
  1: 'Completed',
  2: 'Refunded',
  3: 'Cancelled',
};

const TONES: Record<number, BadgeTone> = {
  0: 'warning',
  1: 'success',
  2: 'destructive',
  3: 'muted',
};

export function receiptStatusLabel(status: number): string {
  return LABELS[status] ?? 'Unknown';
}

export function receiptStatusTone(status: number): BadgeTone {
  return TONES[status] ?? 'muted';
}