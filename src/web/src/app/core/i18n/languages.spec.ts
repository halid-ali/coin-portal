import { TestBed } from '@angular/core/testing';

import { LanguageService } from './language.service';
import { isLanguage, matchBrowserLanguage } from './languages';
import { plural } from './plural';
import { provideTestTransloco, useTestLanguage } from './testing';

describe('languages', () => {
  it('picks the first supported browser language, ignoring the region', () => {
    expect(matchBrowserLanguage(['fr-FR', 'de-AT', 'en'])).toBe('de');
    expect(matchBrowserLanguage(['BG'])).toBe('bg');
    expect(matchBrowserLanguage(['fr', 'it'])).toBeNull();
    expect(matchBrowserLanguage([])).toBeNull();
  });

  it('knows the supported codes', () => {
    expect(isLanguage('tr')).toBe(true);
    expect(isLanguage('fr')).toBe(false);
    expect(isLanguage(null)).toBe(false);
  });
});

describe('LanguageService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideTestTransloco()] });
  });

  it('switches the language and remembers it on this browser', async () => {
    const service = TestBed.inject(LanguageService);
    await service.use('de');
    expect(service.current()).toBe('de');
    expect(document.documentElement.lang).toBe('de');
    expect(service.deviceLanguage()).toBe('de');
  });
});

describe('plural', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideTestTransloco()] }));

  it('picks the form for the count', async () => {
    await useTestLanguage('en');
    expect(plural('common.coinCount', 1, 'en')).toBe('1 coin');
    expect(plural('common.coinCount', 3, 'en')).toBe('3 coins');
    await useTestLanguage('bg');
    expect(plural('coin.quantityBadge', 2, 'bg')).toBe('2 броя');
  });
});
