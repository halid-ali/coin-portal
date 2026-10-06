import { HttpErrorResponse } from '@angular/common/http';

import { Collection } from './collection.models';
import { canChoosePublic, publicationProgress, wouldUnpublish } from './publication';

const collection = (changes: Partial<Collection>): Collection => ({
  id: 1,
  name: 'Vitrin',
  description: null,
  visibility: 'Private',
  coinCount: 10,
  photographedCoinCount: 10,
  minPublicCoins: 10,
  canBePublic: true,
  coverImageId: null,
  moderationLocked: false,
  shareToken: null,
  createdAtUtc: '2026-10-05T12:00:00Z',
  updatedAtUtc: '2026-10-05T12:00:00Z',
  ...changes,
});

describe('publicationProgress', () => {
  it('is ready with every coin photographed and the minimum reached', () => {
    expect(publicationProgress(collection({}))).toEqual({
      photographed: 10,
      required: 10,
      missing: 0,
      ready: true,
    });
  });

  it('counts the missing coins and leaves the decision to the API', () => {
    const oneMissing = publicationProgress(
      collection({ coinCount: 12, photographedCoinCount: 11, canBePublic: false }),
    );
    expect(oneMissing).toEqual({ photographed: 11, required: 10, missing: 1, ready: false });
    // A rule the client does not know (e.g. both sides of other coins) still blocks it
    expect(publicationProgress(collection({ canBePublic: false })).ready).toBe(false);
  });
});

describe('canChoosePublic', () => {
  it('needs a ready collection, or one that is public already', () => {
    expect(canChoosePublic(null)).toBe(false);
    expect(canChoosePublic(collection({}))).toBe(true);
    expect(canChoosePublic(collection({ photographedCoinCount: 3, canBePublic: false }))).toBe(
      false,
    );
    // Below a raised minimum it stays public until a change takes it down
    expect(
      canChoosePublic(
        collection({ visibility: 'Public', photographedCoinCount: 3, canBePublic: false }),
      ),
    ).toBe(true);
  });
});

describe('wouldUnpublish', () => {
  const error = (status: number, body: unknown) =>
    new HttpErrorResponse({ status, error: body, url: '/api/coins/1' });

  it('reads the collections of a 409 would_unpublish', () => {
    const collections = [{ id: 4, name: 'Vitrin' }];
    expect(wouldUnpublish(error(409, { code: 'would_unpublish', collections }))).toEqual(
      collections,
    );
  });

  it('ignores other errors', () => {
    expect(wouldUnpublish(error(409, { code: 'conflict' }))).toBeNull();
    expect(wouldUnpublish(error(400, { code: 'would_unpublish' }))).toBeNull();
    expect(wouldUnpublish(new Error('x'))).toBeNull();
  });
});
