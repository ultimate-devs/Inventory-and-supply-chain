export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  INVENTORY_MANAGER: 'inventory_manager',
  PROCUREMENT_OFFICER: 'procurement_officer',
  ANALYST: 'analyst',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt?: string;
  createdAt?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}
