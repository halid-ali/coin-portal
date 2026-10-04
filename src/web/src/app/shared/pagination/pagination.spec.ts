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
});
