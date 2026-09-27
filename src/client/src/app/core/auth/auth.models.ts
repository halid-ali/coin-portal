// Mirrors CoinPortal.Api/Contracts/Auth/UserResponse
export interface UserResponse {
  id: string;
  userName: string;
  email: string;
  firstName: string;
  lastName: string;
}

// Mirrors CoinPortal.Api/Contracts/Auth/RegisterRequest
export interface RegisterRequest {
  firstName: string;
  lastName: string;
  userName: string;
  email: string;
  birthDate: string; // ISO date (yyyy-MM-dd), bound to DateOnly on the API
  password: string;
}

// Mirrors CoinPortal.Api/Contracts/Auth/LoginRequest
export interface LoginRequest {
  userNameOrEmail: string;
  password: string;
  rememberMe: boolean;
}