import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PublicHeader } from './Header/public-header';
import { Footer } from './Footer/footer';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterOutlet, PublicHeader, Footer],
  templateUrl: './public-layout.html',
})
export class PublicLayout {}
