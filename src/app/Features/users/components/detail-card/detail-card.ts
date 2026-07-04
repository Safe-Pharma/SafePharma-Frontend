import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-detail-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="detail-card">
      <h3 class="title">{{ title() }}</h3>
      <div class="body">
        <ng-content />
      </div>
    </section>
  `,
  styles: [`
    .detail-card {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 20px;
    }
    .title {
      margin: 0 0 16px;
      font-size: 15px;
      font-weight: 700;
      color: #111827;
    }
    .body {
      display: grid;
      grid-template-columns: 1fr 1fr;
      row-gap: 18px;
      column-gap: 24px;
    }
  `],
})
export class DetailCardComponent {
  title = input.required<string>();
}