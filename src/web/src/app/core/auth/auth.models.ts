import { Language } from '../i18n/languages';
import { AccentColor } from '../theme/accent.service';
import { ThemeMode } from '../theme/theme.service';

// Mirrors src/api/Contracts/Auth/UserResponse
export interface UserResponse {
  id: string;
  userName: string;
  email: string;
  /**
   * Verified with the link from the e-mail; sharing collections, opening another one and holding
   * more than unverifiedMaxCoins coins need it.
   */
  emailConfirmed: boolean;
  /** Coins the account may hold until the address is verified (site setting); null once it is. */
  unverifiedMaxCoins: number | null;
  /**
   * When the account is deleted unless the address is verified (ISO, UTC); null once it is, or
   * when it never would be (the lifetime is off, admins, locked accounts).
   */
  unverifiedDeletionDueUtc: string | null;
  firstName: string;
  lastName: string;
  birthDate: string; // ISO date (yyyy-MM-dd)
  /** Saved UI language; null until the user chooses one in the settings. */
  language: Language | null;
  /** Saved color theme; null until the user chooses one (navbar button or settings). */
  theme: ThemeMode | null;
  /** Saved accent color; null until the user chooses one in the settings. */
  accent: AccentColor | null;
  /** The sign-in before the current session's (ISO, UTC); null if none is recorded. */
  previousSignInAtUtc: string | null;
  /** Identity roles, e.g. ['Admin']; empty for most users. */
  roles: string[];
}

/** Role names as the API sends them (src/api/Authorization/AppRoles). */
export const ADMIN_ROLE = 'Admin';

// Mirrors src/api/Contracts/Auth/RegisterRequest
export interface RegisterRequest {
  firstName: string;
  lastName: string;
  userName: string;
  email: string;
  birthDate: string; // ISO date (yyyy-MM-dd), bound to DateOnly on the API
  password: string;
  /** Current UI language: becomes the saved one and names the first collection. */
  language: Language;
  /** The "I have read the privacy policy" box; the API rejects false. */
  acceptTerms: boolean;
}

// Mirrors src/api/Contracts/Auth/LoginRequest
export interface LoginRequest {
  userNameOrEmail: string;
  password: string;
  rememberMe: boolean;
}

// Mirrors src/api/Contracts/Auth/PasswordResetCheckResponse
export interface PasswordResetCheckResponse {
  /** Whose password the reset link sets (the username may be forgotten too). */
  userName: string;
}

/**
 * Navigation state of the way to the sign-in after a password reset: the page says so and fills
 * in the username. History state only, so a reload does not repeat it.
 */
export interface PasswordResetDoneState {
  notice: 'passwordReset';
  userName: string;
}
