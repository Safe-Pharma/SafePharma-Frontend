import { UserActivity } from '../models/activity.model';

const DAY = 24 * 60 * 60 * 1000;

/**
 * Placeholder activity feed. Same shape for every user for now —
 * swap this out for a real audit-log endpoint keyed by userId later.
 */
export function getMockActivities(): UserActivity[] {
  const now = Date.now();
  return [
    {
      id: 'act_1',
      message: 'Logged in from Chrome / macOS',
      timestamp: new Date(now - 1 * DAY).toISOString(),
    },
    {
      id: 'act_2',
      message: 'Updated price for Amoxicillin 500mg',
      timestamp: new Date(now - 2 * DAY).toISOString(),
    },
    {
      id: 'act_3',
      message: 'Created sale #INV-20431',
      timestamp: new Date(now - 3 * DAY).toISOString(),
    },
  ];
}