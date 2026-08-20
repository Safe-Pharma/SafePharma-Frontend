import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { InventoryService } from '../../Service/inventory_service';
import { Spinner } from '../../../../Shared/Components/spinner/spinner';
interface newStockBatchDto {
  batchId: string;
  newStock: number;
}
@Component({
  selector: 'app-batch-details',
  standalone: true,
  imports: [CommonModule, FormsModule, Spinner],
  templateUrl: './batch-details.html',
  styleUrl: './batch-details.css',
})
export class BatchDetailsComponent {
  @Input() batches: any[] = [];
  @Input() formatDate!: (dateString: string) => string;
  @Input() getDaysLeftColor!: (daysLeft: number) => string;

  isEditModalOpen = false;
  isDeleteModalOpen = false;
  isSaving = false;
  isDeleting = false;
  selectedBatch: any = null;
  newQuantity = 0;

  constructor(private inventoryService: InventoryService) {}

  openEditQuantityDialog(batch: any) {
    this.selectedBatch = batch;
    this.newQuantity = Number(batch?.quantityRemaining ?? 0);
    this.isEditModalOpen = true;
  }

  closeEditModal() {
    if (this.isSaving) return;
    this.isEditModalOpen = false;
    this.selectedBatch = null;
    this.newQuantity = 0;
  }

  saveQuantity() {
    if (!this.selectedBatch || this.isSaving) return;

    const batchId = this.selectedBatch?.id ?? this.selectedBatch?.batchNumber ?? '';
    const newStockBatchDto: newStockBatchDto = {
      batchId: batchId,
      newStock: this.newQuantity,
    };

    this.isSaving = true;
    this.inventoryService
      .editBatchStock(newStockBatchDto)
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: () => {
          this.selectedBatch.quantityRemaining = this.newQuantity;
          this.isSaving = false;
          this.closeEditModal();
        },
        error: (err) => {
          console.error('Failed to update batch stock', err);
          alert('Failed to update stock.');
        },
      });
  }

  openDeleteDialog(batch: any) {
    this.selectedBatch = batch;
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal() {
    if (this.isDeleting) return;
    this.isDeleteModalOpen = false;
    this.selectedBatch = null;
  }

  deleteBatch() {
    if (!this.selectedBatch || this.isDeleting) return;

    const batchId = this.selectedBatch?.id ?? this.selectedBatch?.batchNumber ?? '';
    this.isDeleting = true;
    this.inventoryService
      .deleteBatch(batchId)
      .pipe(finalize(() => (this.isDeleting = false)))
      .subscribe({
        next: () => {
          this.batches = this.batches.filter((batch) => batch !== this.selectedBatch);
          this.isDeleting = false;
          this.closeDeleteModal();
          alert('Batch deleted successfully.');
        },
        error: (err) => {
          console.error('Failed to delete batch', err);
          alert('Failed to delete batch.');
        },
      });
  }

  shouldShowDelete(batch: any): boolean {
    const expiryDate = batch?.expiryDate ?? '';
    return (
      expiryDate === '0' || expiryDate === 0 || expiryDate === '0000-00-00' || expiryDate === null
    );
  }
}
