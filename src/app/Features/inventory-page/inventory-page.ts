import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService } from './Service/inventory_service';
import { ModalOverlayDirective } from '../../Shared/Components/modal-overlay/modal-overlay';
interface newStockBatchDto {
  batchId: string;
  newStock: number;
}
interface Batch {
  id?: string;
  batchNumber: string;
  expiryDate: string;
  quantityRemaining: number;
  daysLeft: number;
}

interface Medicine {
  sku: string;
  name: string;
  category: string;
  batches: Batch[];
  onHand: number;
  minStock: number;
  status: 'In Stock' | 'Low' | 'Out';
  expanded?: boolean;
}

@Component({
  selector: 'app-inventory-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalOverlayDirective],
  templateUrl: './inventory-page.html',
  styleUrl: './inventory-page.css',
})
export class InventoryPage implements OnInit {
  searchQuery: string = '';

  medicines = signal<Medicine[]>([]);
  filteredMedicines = signal<Medicine[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);
  selectedBatch: Batch | null = null;
  newQuantity = 0;
  isEditModalOpen = false;
  isDeleteModalOpen = false;

  constructor(private inventoryService: InventoryService) {}

  ngOnInit() {
    this.loading.set(true);
    this.inventoryService.getAllInventory().subscribe({
      next: (data) => {
        const normalized = this.normalizeInventoryData(data);
        this.medicines.set(normalized);
        this.filteredMedicines.set(normalized);
        this.loading.set(false);
        console.log('Fetched inventory data:', this.medicines());
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Could not load inventory.');
      },
    });
  }

  private normalizeInventoryData(data: any[] = []): Medicine[] {
    return (Array.isArray(data) ? data : []).map((medicine, index) => {
      const onHand = Number(medicine?.onHand ?? 0);
      const minStock = Number(medicine?.minStock ?? medicine?.minStockLevel ?? 0);
      const stockLevel = Number(medicine?.stockLevel ?? 0);

      const batches: Batch[] = Array.isArray(medicine?.batches)
        ? medicine.batches.map((batch: any) => {
            const batchId =
              batch?.id ??
              batch?.batchId ??
              batch?.batchID ??
              batch?.BatchId ??
              batch?.BatchID ??
              batch?.batchNumber ??
              batch?.BatchNumber ??
              '';

            return {
              id: String(batchId),
              batchNumber: batch?.batchNumber ?? batch?.BatchNumber ?? '',
              expiryDate: batch?.expiryDate ?? batch?.expiry ?? '',
              quantityRemaining: Number(batch?.quantityRemaining ?? batch?.quantity ?? 0),
              daysLeft: Number(batch?.daysLeft ?? 0),
            };
          })
        : Array.isArray(medicine?.Count)
          ? medicine.Count.map((batch: any) => {
              const batchId =
                batch?.id ??
                batch?.batchId ??
                batch?.batchID ??
                batch?.BatchId ??
                batch?.BatchID ??
                batch?.batchNumber ??
                batch?.BatchNumber ??
                '';

              return {
                id: String(batchId),
                batchNumber: batch?.batchNumber ?? batch?.BatchNumber ?? '',
                expiryDate: batch?.expiryDate ?? batch?.expiry ?? '',
                quantityRemaining: Number(batch?.quantityRemaining ?? batch?.quantity ?? 0),
                daysLeft: Number(batch?.daysLeft ?? 0),
              };
            })
          : Array.from({ length: Number(medicine?.batchesCount ?? 0) }, () => ({
              id: '',
              batchNumber: '',
              expiryDate: '',
              quantityRemaining: 0,
              daysLeft: 0,
            }));

      return {
        sku: medicine?.sku ?? medicine?.medeicineCode ?? `MED-${index + 1}`,
        name: medicine?.name ?? medicine?.medeicineName ?? 'Unknown Medicine',
        category: medicine?.category ?? medicine?.medeicineCategory ?? 'Uncategorized',
        batches,
        onHand,
        minStock,
        status: this.getMappedStatus(onHand, minStock, stockLevel),
        expanded: false,
      };
    });
  }

  private getMappedStatus(
    onHand: number,
    minStock: number,
    stockLevel: number,
  ): Medicine['status'] {
    const effectiveStock = stockLevel > 0 ? stockLevel : onHand;
    if (effectiveStock <= 0 || onHand <= 0) return 'Out';
    if (onHand <= minStock) return 'Low';
    return 'In Stock';
  }

  private refreshMedicineState(medicine: Medicine, batches: Batch[]): Medicine {
    const updatedOnHand = batches.reduce(
      (sum, batch) => sum + Number(batch.quantityRemaining ?? 0),
      0,
    );
    return {
      ...medicine,
      batches,
      onHand: updatedOnHand,
      status: this.getMappedStatus(updatedOnHand, medicine.minStock, updatedOnHand > 0 ? 1 : 0),
    };
  }

  getBatchCount(medicine: Medicine): number {
    return medicine.batches?.length ?? 0;
  }

  onSearch(query: string) {
    this.searchQuery = query;
    const searchText = this.searchQuery.toLowerCase();

    const filtered = this.medicines().filter((medicine) => {
      const sku = (medicine?.sku ?? '').toLowerCase();
      const name = (medicine?.name ?? '').toLowerCase();
      const category = (medicine?.category ?? '').toLowerCase();

      return sku.includes(searchText) || name.includes(searchText) || category.includes(searchText);
    });

    this.filteredMedicines.set(filtered);
  }

  toggleExpand(medicine: Medicine) {
    const updated = this.filteredMedicines().map((m) =>
      m.sku === medicine.sku ? { ...m, expanded: !m.expanded } : m,
    );
    this.filteredMedicines.set(updated);
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'In Stock': 'text-green-700 bg-green-50 border-green-200',
      Low: 'text-orange-700 bg-orange-50 border-orange-200',
      Out: 'text-red-700 bg-red-50 border-red-200',
    };
    return colors[status] || 'text-gray-700 bg-gray-50 border-gray-200';
  }

  getStatusDotColor(status: string): string {
    const colors: { [key: string]: string } = {
      'In Stock': 'bg-green-500',
      Low: 'bg-orange-400',
      Out: 'bg-red-500',
    };
    return colors[status] || 'bg-gray-500';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }

  getDaysLeftColor(daysLeft: number): string {
    if (daysLeft <= 30) return 'text-red-600 font-semibold';
    if (daysLeft <= 60) return 'text-orange-600 font-semibold';
    return 'text-gray-700';
  }

  getOnHandValue(): number {
    return this.medicines().reduce((sum, medicine) => sum + Number(medicine.onHand ?? 0), 0);
  }

  getActiveSkus(): number {
    return this.medicines().length;
  }

  getBelowMinStockCount(): number {
    return this.medicines().filter(
      (medicine) => Number(medicine.onHand ?? 0) <= Number(medicine.minStock ?? 0),
    ).length;
  }

  getExpiringSoonCount(): number {
    return this.medicines().reduce((count, medicine) => {
      const expiring =
        medicine.batches?.filter((batch: Batch) => Number(batch.daysLeft ?? 0) <= 30).length ?? 0;
      return count + expiring;
    }, 0);
  }

  openEditQuantityDialog(batch: Batch) {
    this.selectedBatch = batch;
    this.newQuantity = Number(batch.quantityRemaining ?? 0);
    this.isEditModalOpen = true;
  }

  closeEditModal() {
    this.isEditModalOpen = false;
    this.selectedBatch = null;
    this.newQuantity = 0;
  }

  saveQuantity() {
    if (!this.selectedBatch) return;

    const batchId = String(this.selectedBatch?.id ?? '').trim();

    const newStockBatchDto: newStockBatchDto = {
      batchId: batchId,
      newStock: this.newQuantity,
    };

    this.inventoryService.editBatchStock(newStockBatchDto).subscribe({
      next: () => {
        this.medicines.update((items) =>
          items.map((medicine) => {
            const updatedBatches = medicine.batches.map((batch) =>
              batch.id === this.selectedBatch?.id ||
              batch.batchNumber === this.selectedBatch?.batchNumber
                ? { ...batch, quantityRemaining: this.newQuantity }
                : batch,
            );

            return this.refreshMedicineState(medicine, updatedBatches);
          }),
        );

        this.filteredMedicines.set(this.medicines());
        this.closeEditModal();
      },
      error: (err) => {
        console.error('Failed to update batch stock', err);
        alert('Failed to update stock.');
      },
    });
  }

  openDeleteDialog(batch: Batch) {
    this.selectedBatch = batch;
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal() {
    this.isDeleteModalOpen = false;
    this.selectedBatch = null;
  }

  deleteBatch() {
    if (!this.selectedBatch) return;

    const batchId = String(this.selectedBatch?.id ?? this.selectedBatch?.batchNumber ?? '').trim();
    if (!batchId) {
      alert('Batch identifier is missing.');
      return;
    }

    this.inventoryService.deleteBatch(batchId).subscribe({
      next: () => {
        this.medicines.update((items) =>
          items.map((medicine) => {
            const updatedBatches = medicine.batches.filter(
              (batch) =>
                batch.id !== this.selectedBatch?.id &&
                batch.batchNumber !== this.selectedBatch?.batchNumber,
            );

            return this.refreshMedicineState(medicine, updatedBatches);
          }),
        );
        this.filteredMedicines.set(this.medicines());
        this.closeDeleteModal();
      },
      error: (err) => {
        console.error('Failed to delete batch', err);
        alert('Failed to delete batch.');
      },
    });
  }

  shouldShowDelete(batch: Batch): boolean {
    const expiryDate = batch?.expiryDate ?? '';
    const normalizedExpiry = String(expiryDate).trim();
    return normalizedExpiry === '0' || normalizedExpiry === '' || batch.daysLeft <= 0;
  }

  scrollToAlerts(): void {
    document.querySelector('[data-inventory-table]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
