import { Component, input } from '@angular/core';

@Component({
  selector: 'app-spinner',
  standalone: true,
  template: `
    <svg [class]="'animate-spin ' + sizeClass()" viewBox="0 0 24 24" fill="none">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.37 0 0 5.37 0 12h4z"></path>
    </svg>
  `,
})
export class Spinner {
  size = input<'sm' | 'md'>('sm');

  sizeClass() {
    return this.size() === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  }
}