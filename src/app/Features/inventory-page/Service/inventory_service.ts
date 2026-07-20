import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class InventoryService {
  private BaseUrl = `https://localhost:7259/api/Batch/`;

  constructor(private http: HttpClient) {}

  getAllInventory(): Observable<any[]> {
    console.log('Fetching inventory data from:', this.BaseUrl);
    return this.http.get<any>(this.BaseUrl).pipe(map((response) => response.data));
  }
  editBatchStock(id: string, newStock: number): Observable<number> {
    const safeId = encodeURIComponent(id ?? '');
    return this.http.put<any>(`${this.BaseUrl}${safeId}?newStock=${newStock}`, {});
  }

  deleteBatch(id: string): Observable<void> {
    const safeId = encodeURIComponent(id ?? '');
    return this.http.delete<any>(`${this.BaseUrl}${safeId}`);
  }
}
