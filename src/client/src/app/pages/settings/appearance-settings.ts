import { Component } from '@angular/core';

import { LanguageSettings } from './language-settings';
import { ThemeSettings } from './theme-settings';

/** Settings > Appearance: how the site looks to the user, one card per setting. */
@Component({
  selector: 'app-appearance-settings',
  imports: [LanguageSettings, ThemeSettings],
  host: { class: 'block space-y-6' },
  template: `
    <app-language-settings class="block" />
    <app-theme-settings class="block" />
  `,
})
export class AppearanceSettings {}
