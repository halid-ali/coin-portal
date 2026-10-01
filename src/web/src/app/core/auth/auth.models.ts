import { Language } from '../i18n/languages';
import { AccentColor } from '../theme/accent.service';
import { ThemeMode } from '../theme/theme.service';

// Mirrors src/api/Contracts/Auth/UserResponse
export interface UserResponse {
  id: string;
  userName: string;
  email: string;
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
  acceptPrivacy: boolean;
}

// Mirrors src/api/Contracts/Auth/LoginRequest
export interface LoginRequest {
  userNameOrEmail: string;
  password: string;
  rememberMe: boolean;
}
