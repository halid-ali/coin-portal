import { Language } from '../i18n/languages';

// Mirrors CoinPortal.Api/Contracts/Auth/UserResponse
export interface UserResponse {
  id: string;
  userName: string;
  email: string;
  firstName: string;
  lastName: string;
  /** Saved UI language; null until the user chooses one in the settings. */
  language: Language | null;
}

// Mirrors CoinPortal.Api/Contracts/Auth/RegisterRequest
export interface RegisterRequest {
  firstName: string;
  lastName: string;
  userName: string;
  email: string;
  birthDate: string; // ISO date (yyyy-MM-dd), bound to DateOnly on the API
  password: string;
  /** Current UI language: becomes the saved one and names the first collection. */
  language: Language;
}

// Mirrors CoinPortal.Api/Contracts/Auth/LoginRequest
export interface LoginRequest {
  userNameOrEmail: string;
  password: string;
  rememberMe: boolean;
}
