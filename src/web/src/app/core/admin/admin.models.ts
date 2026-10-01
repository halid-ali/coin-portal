import { SortDirection } from '../coins/coin.models';
import { CollectionVisibility } from '../collections/collection.models';

// Mirrors src/api/Contracts/Admin/AdminContracts.cs

export interface AdminStats {
  userCount: number;
  activeUsersLast30Days: number;
  newUsersLast30Days: number;
  lockedUserCount: number;
  collectionCount: number;
  publicCollectionCount: number;
  unlistedCollectionCount: number;
  hiddenCollectionCount: number;
  coinCount: number;
  photoCount: number;
  storageBytes: number;
}

/** Active, temporarily locked out after failed sign-ins, or locked by an admin. */
export type AdminUserStatus = 'Active' | 'LockedOut' | 'Locked';
export const ADMIN_USER_STATUSES: readonly AdminUserStatus[] = ['Active', 'LockedOut', 'Locked'];

export type AdminUserSort = 'CreatedAt' | 'UserName' | 'LastSeen' | 'Storage';

export interface AdminUserQuery {
  search?: string;
  status?: AdminUserStatus;
  sort?: AdminUserSort;
  dir?: SortDirection;
  page?: number;
  pageSize?: number;
}

export interface AdminUser {
  id: string;
  userName: string;
  email: string;
  createdAtUtc: string;
  lastSeenAtUtc: string | null;
  status: AdminUserStatus;
  isAdmin: boolean;
  collectionCount: number;
  coinCount: number;
  storageBytes: number;
}

export interface AdminUserDetail extends AdminUser {
  firstName: string;
  lastName: string;
  lastSignInAtUtc: string | null;
  lockedAtUtc: string | null;
  lockedOutUntilUtc: string | null;
  publicCollectionCount: number;
  unlistedCollectionCount: number;
  photoCount: number;
  quotaBytes: number;
}

export type AdminCollectionSort = 'UpdatedAt' | 'Name' | 'CoinCount';

export interface AdminCollectionQuery {
  search?: string;
  /** Private lists the hidden ones. */
  visibility?: CollectionVisibility;
  locked?: boolean;
  sort?: AdminCollectionSort;
  dir?: SortDirection;
  page?: number;
  pageSize?: number;
}

export interface AdminCollection {
  id: number;
  name: string;
  description: string | null;
  ownerId: string;
  ownerUserName: string;
  /** The owner is locked, so nobody else sees the collection now. */
  ownerLocked: boolean;
  /** The owner is an admin too (moderation still applies to their content). */
  ownerIsAdmin: boolean;
  visibility: CollectionVisibility;
  /** While Unlisted, for the /s/<token> link. */
  shareToken: string | null;
  coinCount: number;
  coverImageId: string | null;
  updatedAtUtc: string;
  moderationLockedAtUtc: string | null;
}

export type AuditAction = 'UserLocked' | 'UserUnlocked' | 'CollectionHidden' | 'CollectionUnlocked';
export const AUDIT_ACTIONS: readonly AuditAction[] = [
  'UserLocked',
  'UserUnlocked',
  'CollectionHidden',
  'CollectionUnlocked',
];

export interface AdminAuditQuery {
  action?: AuditAction;
  userId?: string;
  collectionId?: number;
  page?: number;
  pageSize?: number;
}

export interface AdminAuditEntry {
  id: number;
  createdAtUtc: string;
  actorId: string;
  actorUserName: string;
  action: AuditAction;
  targetUserId: string | null;
  targetUserName: string | null;
  targetCollectionId: number | null;
  targetCollectionName: string | null;
  note: string | null;
}

/** Page sizes of the admin lists (the API allows up to 100). */
export const ADMIN_PAGE_SIZES: readonly number[] = [25, 50, 100];
export const ADMIN_DEFAULT_PAGE_SIZE = 25;

/** Same limit as the API (AuditLogEntry.NoteMaxLength). */
export const ADMIN_NOTE_MAX_LENGTH = 500;
