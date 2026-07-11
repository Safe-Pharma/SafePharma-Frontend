import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  message: string;
  type: 'success' | 'error';
  id: number;
}

@Injectable({
  providedIn: 'root',
})
export class Toast {
  toasts = signal<ToastMessage[]>([]);
  private counter = 0;

  show(message: string, type: 'success' | 'error' = 'success') {
    const id = this.counter++;

    this.toasts.update((t) => [...t, { message, type, id }]);

    setTimeout(() => this.remove(id), 3000);
  }

  remove(id: number) {
    this.toasts.update((t) => t.filter((toast) => toast.id !== id));
  }
}
