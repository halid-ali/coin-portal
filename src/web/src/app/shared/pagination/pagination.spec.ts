import { TestBed } from '@angular/core/testing';

import { provideTestTransloco, useTestLanguage } from '../../core/i18n/testing';
import { Pagination } from './pagination';

describe('Pagination', () => {
  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideTestTransloco()] });
    await useTestLanguage('tr');
  });

  async function create(page: number, totalPages: number, disabled = false) {
    const fixture = TestBed.createComponent(Pagination);
    fixture.componentRef.setInput('page', page);
    fixture.componentRef.setInput('totalPages', totalPages);
    fixture.componentRef.setInput('totalCount', totalPages * 10);
    fixture.componentRef.setInput('pageSize', 10);
    fixture.componentRef.setInput('options', [10, 25]);
    fixture.componentRef.setInput('disabled', disabled);
    const pages: number[] = [];
    fixture.componentInstance.pageChange.subscribe((p) => pages.push(p));
    await fixture.whenStable();
    const button = (label: string) =>
      (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
        `button[aria-label="${label}"]`,
      )!;
    return { fixture, pages, button };
  }

  it('reads the current page as words, not "2 / 3"', async () => {
    const { fixture } = await create(2, 3);
    const nav = (fixture.nativeElement as HTMLElement).querySelector('nav')!;

    expect(nav.querySelector('nav > span > [aria-hidden=true]')!.textContent!.trim()).toBe('2 / 3');
    expect(nav.querySelector('nav > span > .sr-only')!.textContent).toBe('Sayfa 2, toplam 3');
    expect(nav.querySelector('[aria-current]')).toBeNull();
  });

  it('moves between pages', async () => {
    const { pages, button } = await create(2, 3);
    button('Sonraki sayfa').click();
    button('Önceki sayfa').click();
    button('Son sayfa').click();
    button('İlk sayfa').click();
    expect(pages).toEqual([3, 1, 3, 1]);
  });

  it('keeps the buttons focusable where they lead nowhere, and ignores them', async () => {
    const { pages, button } = await create(3, 3);
    const next = button('Sonraki sayfa');
    // Not disabled: a pressed button that becomes disabled drops the keyboard focus
    expect(next.disabled).toBe(false);
    expect(next.getAttribute('aria-disabled')).toBe('true');
    expect(button('Önceki sayfa').hasAttribute('aria-disabled')).toBe(false);

    next.click();
    button('Son sayfa').click();
    expect(pages).toEqual([]);
  });

  it('ignores presses while a page loads', async () => {
    const { pages, button } = await create(1, 3, true);
    expect(button('Sonraki sayfa').getAttribute('aria-disabled')).toBe('true');
    button('Sonraki sayfa').click();
    expect(pages).toEqual([]);
  });

  // page, page size, total -> the range shown next to the total
  it.each([
    [1, 25, 120, '1–25 / 120'],
    [2, 25, 120, '26–50 / 120'],
    [5, 25, 120, '101–120 / 120'],
    [1, 0, 120, '1–120 / 120'], // "all" on one page
    [1, 25, 0, '0 / 0'],
  ])('page %i of %i per page with %i items shows %s', async (page, pageSize, total, expected) => {
    const fixture = TestBed.createComponent(Pagination);
    fixture.componentRef.setInput('page', page);
    fixture.componentRef.setInput('totalPages', pageSize ? Math.ceil(total / pageSize) : 1);
    fixture.componentRef.setInput('totalCount', total);
    fixture.componentRef.setInput('pageSize', pageSize);
    fixture.componentRef.setInput('options', [25, 50, 0]);
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).querySelector('span.whitespace-nowrap')!;
    expect(text.textContent!.trim()).toBe(expected);
  });

  it('offers the page sizes, "all" by name, and reports a choice', async () => {
    const fixture = TestBed.createComponent(Pagination);
    fixture.componentRef.setInput('page', 1);
    fixture.componentRef.setInput('totalPages', 5);
    fixture.componentRef.setInput('totalCount', 120);
    fixture.componentRef.setInput('pageSize', 25);
    fixture.componentRef.setInput('options', [25, 50, 0]);
    const sizes: number[] = [];
    fixture.componentInstance.pageSizeChange.subscribe((size) => sizes.push(size));
    await fixture.whenStable();
    const select = (fixture.nativeElement as HTMLElement).querySelector('select')!;

    expect([...select.options].map((o) => o.textContent!.trim())).toEqual(['25', '50', 'Tümü']);
    expect(select.selectedIndex).toBe(0);
    select.selectedIndex = 2;
    select.dispatchEvent(new Event('change'));

    expect(sizes).toEqual([0]);
  });
});
