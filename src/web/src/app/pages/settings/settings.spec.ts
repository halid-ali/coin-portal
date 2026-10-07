import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { provideTestTransloco, useTestLanguage } from '../../core/i18n/testing';
import { Settings } from './settings';

@Component({ template: '' })
class Blank {}

describe('Settings', () => {
  // jsdom has no scrollIntoView: the test adds one
  afterEach(() => delete (Element.prototype as Partial<Element>).scrollIntoView);

  it('moves the chosen section into view (the tab row scrolls on phones)', async () => {
    const scrolled: Element[] = [];
    Element.prototype.scrollIntoView = function (this: Element) {
      scrolled.push(this);
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'settings',
            component: Settings,
            children: ['profile', 'appearance', 'security', 'account'].map((path) => ({
              path,
              component: Blank,
            })),
          },
        ]),
        provideTestTransloco(),
      ],
    });
    await useTestLanguage('tr');
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/settings/security');

    expect(scrolled.map((e) => e.getAttribute('href'))).toEqual(['/settings/security']);
  });
});
