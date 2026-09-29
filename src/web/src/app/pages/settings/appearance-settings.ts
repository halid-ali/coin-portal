import { Component } from '@angular/core';

import { AccentSettings } from './accent-settings';
import { LanguageSettings } from './language-settings';
import { ThemeSettings } from './theme-settings';

/** Settings > Appearance: how the site looks to the user, one card per setting. */
@Component({
  selector: 'app-appearance-settings',
  imports: [AccentSettings, LanguageSettings, ThemeSettings],
  host: { class: 'block space-y-6' },
  template: `
    <app-language-settings class="block" />
    <app-theme-settings class="block" />
    <app-accent-settings class="block" />
  `,
})
export class AppearanceSettings {}
