import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const PALETTE = [
  { bg: '#DBEAFE', fg: '#2563EB' },
  { bg: '#D1FAE5', fg: '#059669' },
  { bg: '#EDE9FE', fg: '#7C3AED' },
  { bg: '#FEE2E2', fg: '#DC2626' },
  { bg: '#FFEDD5', fg: '#EA580C' },
];

@Component({
  selector: 'app-user-avatar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="avatar" [class.lg]="size() === 'lg'" [style.background]="color().bg" [style.color]="color().fg">
      {{ initials() }}
    </span>
  `,
  styles: [`
    .avatar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      font-size: 12px;
      font-weight: 600;
      flex-shrink: 0;
    }
    .avatar.lg {
      width: 72px;
      height: 72px;
      font-size: 26px;
    }
  `],
})
export class UserAvatarComponent {
  name = input.required<string>();
  size = input<'sm' | 'lg'>('sm');

  initials = computed(() =>
    this.name()
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join(''),
  );

  color = computed(() => PALETTE[this.hash(this.name()) % PALETTE.length]);

  private hash(str: string): number {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h;
  }
}