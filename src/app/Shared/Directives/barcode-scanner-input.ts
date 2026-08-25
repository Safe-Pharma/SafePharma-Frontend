import { Directive, HostListener } from '@angular/core';

/**
 * Consumes the function-key prefix emitted by the barcode scanner.
 *
 * F12 is a keyboard event rather than text, so preventing its default action
 * discards the scanner prefix while allowing the following barcode characters
 * to continue through the input normally. Keeping this on the marked input
 * avoids changing F12 behavior elsewhere in the application.
 */
@Directive({
  selector: 'input[appBarcodeScannerInput]',
  standalone: true,
})
export class BarcodeScannerInputDirective {
  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'F12' && event.code !== 'F12') return;

    event.preventDefault();
    event.stopPropagation();
  }
}
