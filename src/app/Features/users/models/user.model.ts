// ── API response shapes (match the backend exactly) ─────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  branch: string | null;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface PaginationMetadata {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PagedResult<T> {
  items: T[];
  metadata: PaginationMetadata;
}

// ── UI helpers ────────────────────────────────────────────────────────────────

export type UserStatus = 'Active' | 'Inactive';

export const ALL_ROLES: string[] = [
  'Admin',
  'Pharmacist',
  'Cashier',
  'Inventory Manager',
  'Accountant',
];

export const ALL_STATUSES: UserStatus[] = ['Active', 'Inactive'];

export const ALL_BRANCHES: string[] = [
  'Main Branch',
  'Downtown',
  'North Plaza',
  'Westside',
  'Airport Mall',
];