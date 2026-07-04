import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { GeneralResult } from '../../../Core/Models/general-result.model';
import { CountryWithCities } from '../Models/country-with-cities.model';

@Injectable({
  providedIn: 'root',
})
export class LocationService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/location`;

  getCountries(): Observable<GeneralResult<CountryWithCities[]>> {
    return this.http.get<GeneralResult<CountryWithCities[]>>(`${this.baseUrl}/countries`);
  }
}