import { DOCUMENT } from '@angular/common';
import { AfterViewInit, Directive, ElementRef, Inject, OnDestroy, Renderer2 } from '@angular/core';

/**
 * Moves an overlay out of routed/scrolling layout containers and mounts it
 * directly under <body>. This makes the overlay independent of parent
 * stacking contexts, transforms, filters, and overflow clipping.
 */
@Directive({
  selector: '[appModalOverlay]',
  standalone: true,
})
export class ModalOverlayDirective implements AfterViewInit, OnDestroy {
  private readonly host: HTMLElement;
  private mountedOnBody = false;

  constructor(
    @Inject(DOCUMENT) private readonly document: Document,
    private readonly elementRef: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2,
  ) {
    this.host = this.elementRef.nativeElement;
  }

  ngAfterViewInit(): void {
    const body = this.document.body;
    if (body && this.host.parentNode !== body) {
      this.renderer.appendChild(body, this.host);
      this.mountedOnBody = true;
    }
    this.renderer.addClass(this.host, 'app-modal-overlay');
  }

  ngOnDestroy(): void {
    const body = this.document.body;
    if (this.mountedOnBody && body && this.host.parentNode === body) {
      this.renderer.removeChild(body, this.host);
    }
  }
}
