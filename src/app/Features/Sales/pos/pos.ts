import { Component } from '@angular/core';
import { PosService } from './Services/pos-service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-pos',
  imports: [FormsModule],
  templateUrl: './pos.html',
  styleUrl: './pos.css',
})
export class Pos {
  constructor(private service: PosService) {}
  query: string = '';

  searchMedicine(query: string) {
    if (!query.trim()) {
      return;
    }

    this.service.searchMedicines(query).subscribe({
      next: (res: any) => {
        console.log(res);
      },
      error: (err: any) => {
        console.log(err);
      },
    });
  }
}
