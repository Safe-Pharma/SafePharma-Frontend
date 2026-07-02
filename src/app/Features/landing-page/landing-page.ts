import { Component } from '@angular/core';
import { Hero } from './Components/hero/hero';
import { FeaturesGrid } from './Components/features-grid/features-grid';
import { Pricing } from './Components/pricing/pricing';
import { TrustBar } from './Components/trust-bar/trust-bar';


@Component({
  selector: 'app-landing-page',
  imports: [Hero, FeaturesGrid, Pricing, TrustBar],
  templateUrl: './landing-page.html',
  styleUrls: ['./landing-page.css'],
})
export class LandingPage {

}
