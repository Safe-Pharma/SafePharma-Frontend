export interface City {
  id: string;
  name: string;
}

export interface CountryWithCities {
  id: string;
  name: string;
  code: string;
  cities: City[];
}