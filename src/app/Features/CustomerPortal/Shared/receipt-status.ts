import { BadgeTone } from './status-badge';

const LABELS: Record<string, string> = {
  completed: 'Completed',
  open: 'Open',
  cancelled: 'Cancelled',
  '0': 'Pending',
  '1': 'Completed',
  '2': 'Open',
  '3': 'Cancelled',
};

const TONES: Record<string, BadgeTone> = {
  open: 'warning',
  completed: 'success',
  cancelled: 'destructive',
  //open: 'muted',
  '0': 'warning',
  '1': 'success',
  '2': 'destructive',
  '3': 'muted',
};

function normalizeReceiptStatus(status: string | number | null | undefined): string {
  if (status === null || status === undefined) {
    return '';
  }

  const value = String(status).trim();
  if (!value) {
    return '';
  }

  return value.toLowerCase();
}

export function receiptStatusLabel(status: string | number | null | undefined): string {
  const normalized = normalizeReceiptStatus(status);
  return LABELS[normalized] ?? 'Unknown';
}

export function receiptStatusTone(status: string | number | null | undefined): BadgeTone {
  const normalized = normalizeReceiptStatus(status);
  return TONES[normalized] ?? 'muted';
}
