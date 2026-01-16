import { Timestamp } from 'firebase/firestore';

// Rôles utilisateur
export type UserRole = 'admin' | 'vendeur';

// Utilisateur
export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  lastLogin?: Timestamp;
  createdAt: Timestamp;
}

// Type pour les formulaires
export type UserFormData = Omit<User, 'id' | 'createdAt' | 'lastLogin' | 'isActive'>;

// Labels pour les rôles
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrateur',
  vendeur: 'Vendeur'
};

// Permissions par rôle
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: [
    'products:read', 'products:write', 'products:delete',
    'stock:read', 'stock:write',
    'customers:read', 'customers:write', 'customers:delete',
    'sales:read', 'sales:write', 'sales:cancel',
    'reports:read',
    'users:read', 'users:write', 'users:delete',
    'settings:read', 'settings:write'
  ],
  vendeur: [
    'products:read',
    'stock:read',
    'customers:read', 'customers:write',
    'sales:read', 'sales:write',
  ]
};
