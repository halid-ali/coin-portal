import {
  DOCUMENT,
  DestroyRef,
  Directive,
  ElementRef,
  afterNextRender,
  afterRenderEffect,
  inject,
  input,
  untracked,
} from '@angular/core';

/** How long a slide takes; `duration-200` on the highlight says the same. */
const SLIDE_MS = 200;

/**
 * A row of buttons where one is chosen (aria-pressed="true", or what `chosen` selects): the chosen
 * one's background is one highlight behind the buttons that slides to the next choice instead of
 * jumping (user choice 2026-10-10; the coin lists' All / Euro / World, the coin form's kind on a
 * phone). Not on the first showing, and not where the system asks for less motion (`motion-safe`);
 * when only the sizes change (counts, language) it follows without sliding, unless a slide is under
 * way (the chosen button's bolder text widens it).
 *
 * `<div [appSlidingSelection]="value" highlightClass="bg-brand-100" role="group">` with the
 * buttons inside: the value says when the choice changed, the buttons say where it is. The buttons
 * are `relative` (above the highlight) and have no background of their own when chosen. Where the
 * row looks otherwise (the coin form's cards from sm up) the highlight class hides it there.
 */
@Directive({
  selector: '[appSlidingSelection]',
  host: { class: 'relative' },
})
export class SlidingSelection {
  /** The chosen value; when it changes the highlight slides to the pressed button. */
  readonly value = input<unknown>(undefined, { alias: 'appSlidingSelection' });
  /** The highlight's color, e.g. `bg-brand-100`. */
  readonly highlightClass = input.required<string>();
  /** Selects the chosen item among the children (radio labels: `[data-chosen=true]`). */
  readonly chosen = input('[aria-pressed="true"]');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly highlight: HTMLElement;
  private placed = false;
  private slidingUntil = 0;

  constructor() {
    this.highlight = inject(DOCUMENT).createElement('span');
    this.highlight.setAttribute('aria-hidden', 'true');
    this.host.prepend(this.highlight);

    afterRenderEffect(() => {
      this.highlight.className = `pointer-events-none absolute top-0 left-0 rounded-md ease-out motion-safe:transition-[transform,width] motion-safe:duration-200 ${this.highlightClass()}`;
    });
    // A new choice: slide (the first one is just placed)
    afterRenderEffect(() => {
      this.value();
      untracked(() => this.place(this.placed));
    });
    // Sizes change (counts come and go, another language): follow
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => this.place(Date.now() < this.slidingUntil));
      afterNextRender(() => {
        observer.observe(this.host);
        for (const item of this.host.children) {
          if (item !== this.highlight) {
            observer.observe(item);
          }
        }
      });
      inject(DestroyRef).onDestroy(() => observer.disconnect());
    }
  }

  private place(slide: boolean): void {
    const button = this.host.querySelector<HTMLElement>(untracked(this.chosen));
    const style = this.highlight.style;
    if (!button) {
      style.visibility = 'hidden';
      return;
    }
    if (slide) {
      this.slidingUntil = Date.now() + SLIDE_MS;
      style.transition = '';
    } else {
      style.transition = 'none';
    }
    style.visibility = '';
    style.width = `${button.offsetWidth}px`;
    style.height = `${button.offsetHeight}px`;
    style.transform = `translate(${button.offsetLeft}px, ${button.offsetTop}px)`;
    if (!slide) {
      // Applied at once, then the transition is back for the next choice
      void this.highlight.offsetWidth;
      style.transition = '';
    }
    this.placed = true;
  }
}
