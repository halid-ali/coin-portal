/**
 * jsdom has <dialog> but not its modal methods: showModal() and close() are stubbed so components
 * built on them (ConfirmDialog, the crop and account dialogs) can be tested. close() fires the
 * close event like a browser does.
 */
export function stubModalDialogs(): void {
  const proto = HTMLDialogElement.prototype;
  proto.showModal ??= function (this: HTMLDialogElement) {
    this.open = true;
  };
  if (!proto.close || !('__stub' in proto.close)) {
    const close = function (this: HTMLDialogElement) {
      if (this.open) {
        this.open = false;
        this.dispatchEvent(new Event('close'));
      }
    };
    proto.close = Object.assign(close, { __stub: true });
  }
}

/**
 * Escape on an open modal dialog, as a browser handles it: a cancelable `cancel` event, then
 * close() unless a listener prevented it.
 */
export function pressEscape(dialog: HTMLDialogElement): void {
  if (dialog.dispatchEvent(new Event('cancel', { cancelable: true }))) {
    dialog.close();
  }
}
