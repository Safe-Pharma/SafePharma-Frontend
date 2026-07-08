import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';

@Component({
  selector: 'app-copy-field',
  standalone: true,
  imports: [NgTemplateOutlet],
  templateUrl: './copy-field.html',
  styleUrl: './copy-field.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CopyField {
  readonly label = input<string>();
  readonly value = input.required<string>();
  readonly variant = input<'hero' | 'row'>('row');

  protected readonly copied = signal(false);
  private resetTimeout?: ReturnType<typeof setTimeout>;

  async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.value());
      this.copied.set(true);
      clearTimeout(this.resetTimeout);
      this.resetTimeout = setTimeout(() => this.copied.set(false), 1500);
    } catch {
      this.copied.set(false);
    }
  }
}