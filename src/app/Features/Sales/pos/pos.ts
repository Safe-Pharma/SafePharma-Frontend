import { Component, OnInit } from '@angular/core';
import { PosService } from './Services/pos-service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';

interface MedicineSearchResult {
  pharmacyMedicineId: string;
  tradeNameAr: string;
  tradeNameEn: string;
  scientificName: string;
  barcode: string | null;
  sellingPrice: number;
  stockQuantity: number;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
}

interface SaleItem {
  id: string;
  pharmacyMedicineId: string;
  medicineName: string;
  customerId: string | null;
  customerName: string;
  batchId: string;
  batchNumber: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxAmount: number;
  lineTotal: number;
}

interface Sale {
  id: string;
  invoiceNumber: string;
  subTotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  status: number;
  items: SaleItem[];
}

@Component({
  selector: 'app-pos',
  imports: [FormsModule, CommonModule],
  templateUrl: './pos.html',
  styleUrl: './pos.css',
})
export class Pos implements OnInit {
  constructor(
    private service: PosService,
    private cdr: ChangeDetectorRef,
  ) {}

  // search
  query = '';
  searchResults: MedicineSearchResult[] = [];
  quantityMap: { [id: string]: number } = {};

  // sale state
  sale: Sale | null = null;
  saleId = '';
  invoiceNumber = '';

  // customer
  customers: Customer[] = [];
  selectedCustomer: Customer | null = null;
  showCustomerDropdown = false;

  itemCustomerMap: { [pharmacyMedicineId: string]: Customer | null } = {};
  openCustomerPickerFor: string | null = null;

  ngOnInit(): void {
    this.createDraftSale();
    this.loadCustomers();
  }

  createDraftSale() {
    this.service.createDraftSale().subscribe({
      next: (res: any) => {
        this.sale = res.data;
        this.saleId = res.data.id;
        this.invoiceNumber = res.data.invoiceNumber;
        this.cdr.detectChanges();
      },
    });
  }

  loadCustomers() {
    this.service.getCustomers().subscribe({
      next: (res: any) => {
        console.log(res);
        this.customers = res.data ?? res;
        this.cdr.detectChanges();
      },
      error: (err) => console.log(err),
    });
  }

  toggleCustomerDropdown() {
    this.showCustomerDropdown = !this.showCustomerDropdown;
  }

  selectCustomer(customer: Customer | null) {
  this.selectedCustomer = customer;
  this.showCustomerDropdown = false;

  const dto = {
    customerId: customer ? customer.id : '00000000-0000-0000-0000-000000000000',
  };

  this.service.setSaleCustomer(this.saleId, dto).subscribe({
    next: (res: any) => {
      this.sale = res.data;
      this.cdr.detectChanges();
    },
    error: (err) => console.log(err),
  });
}

  searchMedicine(query: string) {
    if (!query.trim()) {
      this.searchResults = [];
      return;
    }
    this.service.searchMedicines(query).subscribe({
      next: (res: any) => {
        this.searchResults = res.data.items;
        this.cdr.detectChanges();
      },
      error: (err) => console.log(err),
    });
  }

  getQuantity(pharmacyMedicineId: string): number {
    return this.quantityMap[pharmacyMedicineId] || 1;
  }

  setQuantity(pharmacyMedicineId: string, value: number) {
    this.quantityMap[pharmacyMedicineId] = value;
  }

  addToCart(item: MedicineSearchResult) {
    const quantity = this.getQuantity(item.pharmacyMedicineId);

    const dto = {
      pharmacyMedicineId: item.pharmacyMedicineId,
      customerId: this.selectedCustomer
        ? this.selectedCustomer.id
        : '00000000-0000-0000-0000-000000000000',
      quantity,
      discount: 0,
      taxAmount: 0,
    };

    this.service.addItemToSale(this.saleId, dto).subscribe({
      next: (res: any) => {
        this.sale = res.data;
        this.query = '';
        this.searchResults = [];
        this.cdr.detectChanges();
      },
      error: (err) => console.log(err),
    });
  }

  increaseQuantity(item: SaleItem) {
    this.updateItemQuantity(item, item.quantity + 1);
  }

  decreaseQuantity(item: SaleItem) {
    if (item.quantity <= 1) return;
    this.updateItemQuantity(item, item.quantity - 1);
  }

  private updateItemQuantity(item: SaleItem, newQuantity: number) {
    const dto = {
      customerId: item.customerId ?? '00000000-0000-0000-0000-000000000000',
      quantity: newQuantity,
      discount: item.discount,
      taxAmount: item.taxAmount,
    };

    this.service.updateSaleItem(this.saleId, item.id, dto).subscribe({
      next: (res: any) => {
        this.sale = res.data;
        this.cdr.detectChanges();
      },
      error: (err) => console.log(err),
    });
  }

  removeItem(item: SaleItem) {
    this.service.removeSaleItem(this.saleId, item.id).subscribe({
      next: (res: any) => {
        this.sale = res.data;
        this.cdr.detectChanges();
      },
      error: (err) => console.log(err),
    });
  }
  getItemCustomer(pharmacyMedicineId: string): Customer | null {
    return this.itemCustomerMap[pharmacyMedicineId] ?? null;
  }

  selectItemCustomer(pharmacyMedicineId: string, customer: Customer | null) {
    this.itemCustomerMap[pharmacyMedicineId] = customer;
    this.openCustomerPickerFor = null;
  }

  openItemCustomerPickerId: string | null = null;

  toggleItemCustomerPicker(itemId: string) {
    this.openItemCustomerPickerId = this.openItemCustomerPickerId === itemId ? null : itemId;
    this.cdr.detectChanges();
  }

  selectCartItemCustomer(item: SaleItem, customer: Customer | null) {
    const dto = {
      customerId: customer ? customer.id : '00000000-0000-0000-0000-000000000000',
      quantity: item.quantity,
      discount: item.discount,
      taxAmount: item.taxAmount,
    };
    this.service.updateSaleItem(this.saleId, item.id, dto).subscribe({
      next: (res: any) => {
        this.sale = res.data;
        this.cdr.detectChanges();
      },
      error: (err) => console.log(err),
    });
    this.openItemCustomerPickerId = null;
  }
}
