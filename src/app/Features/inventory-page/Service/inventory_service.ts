import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment.production';
interface newStockBatchDto {
  batchId: string;
  newStock: number;
}

@Injectable({
  providedIn: 'root',
})
export class InventoryService {
  private BaseUrl = `${environment.apiUrl}/Batch/`;

  constructor(private http: HttpClient) {}

  getAllInventory(): Observable<any[]> {
    console.log('Fetching inventory data from:', this.BaseUrl);
    return this.http.get<any>(this.BaseUrl).pipe(map((response) => response.data));
  }
  editBatchStock(newStockBatch: newStockBatchDto): Observable<number> {
    console.log('Updating batch stock with data:', newStockBatch);
    return this.http.put<any>(`${this.BaseUrl}`, newStockBatch);
  }

  deleteBatch(id: string): Observable<void> {
    const safeId = encodeURIComponent(id ?? '');
    return this.http.delete<any>(`${this.BaseUrl}${safeId}`);
  }
}
