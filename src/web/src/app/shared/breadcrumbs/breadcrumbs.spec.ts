import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { provideTestTransloco, useTestLanguage } from '../../core/i18n/testing';
import { Breadcrumbs, Crumb } from './breadcrumbs';

describe('Breadcrumbs', () => {
  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideTestTransloco()] });
    await useTestLanguage('tr');
  });

  async function render(items: readonly Crumb[]): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(Breadcrumbs);
    fixture.componentRef.setInput('items', items);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('links the pages above and marks the current one', async () => {
    const element = await render([
      { key: 'nav.explore', link: '/explore', icon: 'explore' },
      { text: '@ayse', link: ['/u', 'ayse'], avatar: 'A' },
      { text: 'Vitrin' },
    ]);

    expect(element.querySelector('nav')!.getAttribute('aria-label')).toBe('Sayfa yolu');
    const links = [...element.querySelectorAll('a')];
    // The avatar's initial is decoration (aria-hidden): the name is the text
    expect(links.map((a) => a.querySelector('.truncate')!.textContent)).toEqual([
      'Keşfet',
      '@ayse',
    ]);
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/explore', '/u/ayse']);

    const current = element.querySelector('[aria-current=page]')!;
    expect(current.textContent!.trim()).toBe('Vitrin');
    expect(current.closest('a')).toBeNull();
    // Phones leave the current page out: the heading below says it
    expect(current.closest('li')!.classList).toContain('hidden');
    expect(current.closest('li')!.classList).toContain('sm:flex');
  });

  it('keeps icons, avatars and separators away from screen readers', async () => {
    const element = await render([
      { key: 'nav.collections', link: '/collections', icon: 'collections' },
      { text: '@ayse', link: ['/u', 'ayse'], avatar: 'A' },
      { text: 'Vitrin' },
    ]);

    for (const decoration of element.querySelectorAll('svg, li > a > span:first-child')) {
      if (!decoration.classList.contains('truncate')) {
        expect(decoration.getAttribute('aria-hidden')).toBe('true');
      }
    }
    expect(element.querySelectorAll('li > svg')).toHaveLength(2);
  });

  it('takes a whole address, query included', async () => {
    const link = TestBed.inject(Router).parseUrl('/explore?country=DE&page=2');
    const element = await render([{ key: 'nav.explore', link }, { text: '@ayse' }]);

    expect(element.querySelector('a')!.getAttribute('href')).toBe('/explore?country=DE&page=2');
  });
});
