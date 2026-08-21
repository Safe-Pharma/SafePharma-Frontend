import { User } from '../models/user.model';
import { ALL_BRANCHES } from '../models/user.model';

const NAMES = [
  'Sarah Khan', 'Ahmed Saleh', 'Layla Najjar', 'Omar Sami', 'Fatima Khan',
  'Khalid Saleh', 'Noor Najjar', 'Yousef Sami', 'Mona Rashid', 'Tariq Youssef',
  'Huda Amin', 'Karim Zidan', 'Rania Fathy', 'Bilal Nasser', 'Dina Kareem',
  'Samer Adel', 'Lina Farouk', 'Adel Hassan', 'Nour Ibrahim', 'Rami Saad',
  'Salma Tarek', 'Hassan Omar', 'Mariam Zaki', 'Waleed Nabil',
];

const ROLES = ['Admin', 'Pharmacist', 'Cashier', 'Inventory Manager', 'Accountant'];
const BRANCHES = ALL_BRANCHES;

function emailOf(name: string): string {
  return name.toLowerCase().replace(' ', '.') + '@safepharma.com';
}

function isoDate(base: Date, offsetDays: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString();
}

const CREATED_BASE = new Date('2025-01-01');
const LOGIN_BASE   = new Date('2026-06-01');

export const MOCK_USERS: User[] = NAMES.map((name, i) => ({
  id:          `mock-${String(i + 1).padStart(3, '0')}`,
  name,
  email:       emailOf(name),
  role:        ROLES[i % ROLES.length],
  branch:      BRANCHES[i % BRANCHES.length],
  phone:       `+971 50 100${String(i).padStart(4, '0')}`,
  isActive:    i % 7 !== 0,
  lastLoginAt: isoDate(LOGIN_BASE, i * 3),
  createdAt:   isoDate(CREATED_BASE, i * 20),
}));
