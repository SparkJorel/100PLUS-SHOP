import { Timestamp } from 'firebase/firestore';

// Types de clients
export type CustomerType = 'maison' | 'lambda';

// Client maison (enregistré dans la base de données)
export interface Customer {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  address?: string;
  totalPurchases: number;          // Montant total des achats
  purchasesCount: number;          // Nombre d'achats
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Type pour les formulaires
export type CustomerFormData = Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'totalPurchases' | 'purchasesCount' | 'isActive'>;
