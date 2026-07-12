import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Toast } from '../toast';

@Component({
  selector: 'app-toast',
  imports: [CommonModule],
  templateUrl: './toast.html',
  styleUrl: './toast.css',
})
export class ToastComponent {
  constructor(public toastService: Toast) {}
}