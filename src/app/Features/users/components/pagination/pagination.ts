import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pagination">
      <span class="range">Showing {{ rangeStart() }}–{{ rangeEnd() }} of {{ total() }}</span>
      <div class="controls">
        <button class="btn" [disabled]="page() === 1" (click)="prev.emit()">Previous</button>
        <span class="page-label">Page {{ page() }} of {{ totalPages() }}</span>
        <button class="btn" [disabled]="page() === totalPages()" (click)="next.emit()">Next</button>
      </div>
    </div>
  `,
  styles: [`
    .pagination {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
    }
    .range { font-size: 13px; color: #6b7280; }
    .controls { display: flex; align-items: center; gap: 12px; }
    .page-label { font-size: 13px; color: #6b7280; }
    .btn {
      height: 32px;
      padding: 0 14px;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      background: #fff;
      font-size: 13px;
      font-weight: 500;
      color: #111827;
      cursor: pointer;
    }
    .btn:hover:not(:disabled) { background: #f9fafb; }
    .btn:disabled { color: #9ca3af; cursor: not-allowed; }
  `],
})
export class PaginationComponent {
  page = input.required<number>();
  totalPages = input.required<number>();
  rangeStart = input.required<number>();
  rangeEnd = input.required<number>();
  total = input.required<number>();

  prev = output<void>();
  next = output<void>();
}