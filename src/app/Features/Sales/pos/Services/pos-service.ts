import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class PosService {
  private medicineSearchApi = 'https://localhost:7259/api/MedicineSearch';

  constructor(private http: HttpClient) {}

  searchMedicines(query: string, pageNumber: number = 1, pageSize: number = 20) {
    return this.http.get(
      `${this.medicineSearchApi}/search?query=${query}&pageNumber=${pageNumber}&pageSize=${pageSize}`,
    );
  }
}
