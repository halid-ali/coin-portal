import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { PagedResponse } from '../coins/coin.models';
import {
  AdminAuditEntry,
  AdminAuditQuery,
  AdminCollection,
  AdminCollectionQuery,
  AdminDeleteUsersResult,
  AdminSettings,
  AdminSettingsImpact,
  AdminStats,
  AdminUser,
  AdminUserDetail,
  AdminUserQuery,
  AdminVerificationRequests,
} from './admin.models';

const API = '/api/admin';

/** Query object -> HTTP params, leaving out empty values (the API defaults apply). */
function toParams(query: object): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params = params.set(key, String(value));
    }
  }
  return params;
}

/** The admin panel's API (api/admin/*); every call needs the Admin role. */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);

  stats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${API}/stats`);
  }

  users(query: AdminUserQuery): Observable<PagedResponse<AdminUser>> {
    return this.http.get<PagedResponse<AdminUser>>(`${API}/users`, { params: toParams(query) });
  }

  user(id: string): Observable<AdminUserDetail> {
    return this.http.get<AdminUserDetail>(`${API}/users/${encodeURIComponent(id)}`);
  }

  /** The note goes to the audit log only. */
  lockUser(id: string, note: string): Observable<void> {
    return this.http.put<void>(`${API}/users/${encodeURIComponent(id)}/lock`, { note });
  }

  unlockUser(id: string, note: string): Observable<void> {
    return this.http.delete<void>(`${API}/users/${encodeURIComponent(id)}/lock`, {
      body: { note },
    });
  }

  collections(query: AdminCollectionQuery): Observable<PagedResponse<AdminCollection>> {
    return this.http.get<PagedResponse<AdminCollection>>(`${API}/collections`, {
      params: toParams(query),
    });
  }

  /** Deletes the user with everything they own (not admins: 403 cannot_delete_admin). */
  deleteUser(id: string, note: string): Observable<void> {
    return this.http.delete<void>(`${API}/users/${encodeURIComponent(id)}`, { body: { note } });
  }

  /** Marks the user's e-mail address verified (nothing happens when it is already). */
  confirmEmail(id: string, note: string): Observable<void> {
    return this.http.post<void>(`${API}/users/${encodeURIComponent(id)}/confirm-email`, { note });
  }

  verificationRequests(): Observable<AdminVerificationRequests> {
    return this.http.get<AdminVerificationRequests>(`${API}/verification-requests`);
  }

  /** Starts sending in the background; 409 already_running while a run goes. */
  startVerificationRequests(note: string): Observable<AdminVerificationRequests> {
    return this.http.post<AdminVerificationRequests>(`${API}/verification-requests`, { note });
  }

  /** Deletes the selected users like deleteUser, one audit entry each; admins are skipped. */
  deleteUsers(userIds: readonly string[], note: string): Observable<AdminDeleteUsersResult> {
    return this.http.post<AdminDeleteUsersResult>(`${API}/users/bulk-delete`, { userIds, note });
  }

  /** Hides the collection: private, share link removed, locked against sharing. */
  lockCollection(id: number, note: string): Observable<void> {
    return this.http.put<void>(`${API}/collections/${id}/lock`, { note });
  }

  unlockCollection(id: number, note: string): Observable<void> {
    return this.http.delete<void>(`${API}/collections/${id}/lock`, { body: { note } });
  }

  settings(): Observable<AdminSettings> {
    return this.http.get<AdminSettings>(`${API}/settings`);
  }

  /** The note goes to the audit log only (with the old and new value). */
  updateSettings(settings: AdminSettings, note: string): Observable<AdminSettings> {
    return this.http.put<AdminSettings>(`${API}/settings`, { ...settings, note });
  }

  settingsImpact(minPublicCoins: number): Observable<AdminSettingsImpact> {
    return this.http.get<AdminSettingsImpact>(`${API}/settings/impact`, {
      params: toParams({ minPublicCoins }),
    });
  }

  audit(query: AdminAuditQuery): Observable<PagedResponse<AdminAuditEntry>> {
    return this.http.get<PagedResponse<AdminAuditEntry>>(`${API}/audit`, {
      params: toParams(query),
    });
  }
}
