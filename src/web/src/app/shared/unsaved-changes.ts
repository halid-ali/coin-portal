import { Injector, inject } from '@angular/core';
import { CanDeactivateFn, Router } from '@angular/router';
import { translate } from '@jsverse/transloco';

// Type only: the guard sits on eagerly imported routes, the dialog loads when it is needed
import type { ConfirmDialogService } from './confirm-dialog/confirm-dialog.service';

/** A page that can hold input not saved yet (see unsavedChangesGuard). */
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

/**
 * Router state of a link that leaves without saving on purpose: the Cancel button discards the
 * changes without a question (`<a [routerLink]="…" [state]="discardChanges">`).
 */
export const DISCARD_CHANGES_STATE = { discardChanges: true } as const;

/** Asks before unsaved input is dropped; true when the user chooses to leave. */
export function confirmDiscardChanges(confirm: ConfirmDialogService): Promise<boolean> {
  return confirm.confirm({
    title: translate('unsaved.title'),
    message: translate('unsaved.message'),
    confirmText: translate('unsaved.leave'),
    cancelText: translate('unsaved.stay'),
    danger: true,
  });
}

/**
 * canDeactivate for pages with unsaved input: links, the menu and the browser's back button ask
 * first. Closing or reloading the tab is the page's own `beforeunload` listener.
 */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  const injector = inject(Injector);
  const state = inject(Router).currentNavigation()?.extras.state;
  if (!component.hasUnsavedChanges() || state?.['discardChanges']) {
    return true;
  }
  return import('./confirm-dialog/confirm-dialog.service').then(({ ConfirmDialogService }) =>
    confirmDiscardChanges(injector.get(ConfirmDialogService)),
  );
};
