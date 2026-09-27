/** A pending image change (coin photo, collection cover) that is applied when the form is saved. */
export type ImageChange = { type: 'upload'; image: Blob } | { type: 'remove' };
