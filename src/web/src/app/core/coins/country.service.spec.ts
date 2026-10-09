import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { provideTestTransloco, useTestLanguage } from '../i18n/testing';
import { CountryService } from './country.service';

describe('CountryService', () => {
  let http: HttpTestingController;
  let countries: CountryService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideTestTransloco()],
    });
    http = TestBed.inject(HttpTestingController);
    countries = TestBed.inject(CountryService);
    await useTestLanguage('tr');
  });

  afterEach(() => http.verify());

  function load(): void {
    countries.load();
    http.expectOne('/api/countries').flush([
      { code: 'AT', name: 'Austria' },
      { code: 'DE', name: 'Germany' },
    ]);
  }

  it('names and sorts the countries in the active language', async () => {
    load();
    // Almanya before Avusturya
    expect(countries.countries().map((c) => c.code)).toEqual(['DE', 'AT']);
    expect(countries.name('DE')).toBe('Almanya');

    await useTestLanguage('en');

    // Austria before Germany
    expect(countries.countries().map((c) => c.code)).toEqual(['AT', 'DE']);
  });

  it('loads once, and again after a failure', () => {
    countries.load();
    expect(countries.settled()).toBe(false);
    http.expectOne('/api/countries').flush(null, { status: 500, statusText: 'Error' });
    // Settled with no countries: a list sorted by their order does not wait forever
    expect(countries.settled()).toBe(true);

    load();
    countries.load();

    http.expectNone('/api/countries');
  });

  it('falls back to the code for a name the browser does not know', () => {
    expect(countries.name('??')).toBe('??');
  });

  it('lists the euro issuers apart, sorted the same way', () => {
    countries.load();
    http.expectOne('/api/countries').flush([
      { code: 'AT', name: 'Austria', euroIssuer: true },
      { code: 'DE', name: 'Germany', euroIssuer: true },
      { code: 'TR', name: 'Türkiye', euroIssuer: false },
    ]);

    expect(countries.countries().map((c) => c.code)).toEqual(['DE', 'AT', 'TR']);
    expect(countries.euroCountries().map((c) => c.code)).toEqual(['DE', 'AT']);
  });

  // Browsers map these codes to today's countries (SU → Russia), so the names are ours
  it('names former countries itself, in the active language', async () => {
    expect(['SU', 'DD', 'YU', 'CS'].map((c) => countries.name(c))).toEqual([
      'Sovyetler Birliği',
      'Doğu Almanya',
      'Yugoslavya',
      'Çekoslovakya',
    ]);
    await useTestLanguage('de');
    expect(countries.name('DD')).toBe('DDR');
  });
});
