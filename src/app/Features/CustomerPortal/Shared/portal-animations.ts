import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

/**
 * Shared, reusable @angular/animations triggers for the Customer Portal.
 * Import whichever you need into a component's `animations: [...]` array,
 * then bind them in the template, e.g. `<div @fadeSlideIn>`.
 *
 * Timings are intentionally short (150-280ms) and use soft easing curves
 * so nothing feels bouncy or exaggerated, per the design brief.
 */

// Page / section entrance. Use on the top-level wrapper of a page or card.
export const fadeSlideIn = trigger('fadeSlideIn', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(8px)' }),
    animate('260ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' })),
  ]),
]);

// Staggered entrance for list/grid items (cards, rows, chips).
// Apply to the *container* with [@staggerList]="items().length" so it
// re-triggers when the list changes.
export const staggerList = trigger('staggerList', [
  transition(':enter, * => *', [
    query(':enter', [
      style({ opacity: 0, transform: 'translateY(6px)' }),
      stagger(40, [
        animate('220ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ], { optional: true }),
  ]),
]);

// Individual list item enter/leave (e.g. an allergy chip or condition card
// being added/removed one at a time, outside of a full list re-render).
export const listItem = trigger('listItem', [
  transition(':enter', [
    style({ opacity: 0, transform: 'scale(0.92) translateY(4px)' }),
    animate('220ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 1, transform: 'scale(1) translateY(0)' })),
  ]),
  transition(':leave', [
    animate('160ms ease-in', style({ opacity: 0, transform: 'scale(0.94)' })),
  ]),
]);

// Modal backdrop fade.
export const dialogOverlay = trigger('dialogOverlay', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate('180ms ease-out', style({ opacity: 1 })),
  ]),
  transition(':leave', [
    animate('150ms ease-in', style({ opacity: 0 })),
  ]),
]);

// Modal panel scale + fade.
export const dialogPanel = trigger('dialogPanel', [
  transition(':enter', [
    style({ opacity: 0, transform: 'scale(0.96) translateY(4px)' }),
    animate('220ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 1, transform: 'scale(1) translateY(0)' })),
  ]),
  transition(':leave', [
    animate('150ms ease-in', style({ opacity: 0, transform: 'scale(0.97)' })),
  ]),
]);

// Brief highlight pulse for a just-added item or a success confirmation.
export const successPulse = trigger('successPulse', [
  transition(':enter', [
    style({ opacity: 0, transform: 'scale(0.9)' }),
    animate('280ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 1, transform: 'scale(1)' })),
  ]),
  transition(':leave', [
    animate('200ms ease-in', style({ opacity: 0 })),
  ]),
]);

// Expand/collapse for sections that can be toggled.
export const collapseExpand = trigger('collapseExpand', [
  transition(':enter', [
    style({ height: '0', opacity: 0 }),
    animate('220ms cubic-bezier(0.4, 0, 0.2, 1)', style({ height: '*', opacity: 1 })),
  ]),
  transition(':leave', [
    animate('180ms cubic-bezier(0.4, 0, 0.2, 1)', style({ height: '0', opacity: 0 })),
  ]),
]);

export const portalAnimations = [
  fadeSlideIn,
  staggerList,
  listItem,
  dialogOverlay,
  dialogPanel,
  successPulse,
  collapseExpand,
];