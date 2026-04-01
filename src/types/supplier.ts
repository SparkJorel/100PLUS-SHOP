import { Timestamp } from 'firebase/firestore';

// Fournisseur
export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Type pour les formulaires (sans id et timestamps)
export type SupplierFormData = Omit<Supplier, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>;

// Article d'un bon de livraison
export interface DeliveryNoteItem {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  total: number;
}

// Statut du bon de livraison
export type DeliveryNoteStatus = 'pending' | 'received' | 'partial';

// Bon de livraison
export interface DeliveryNote {
  id: string;
  supplierId: string;
  supplierName: string;
  reference: string;
  items: DeliveryNoteItem[];
  totalAmount: number;
  status: DeliveryNoteStatus;
  receivedBy?: string;
  receivedByName?: string;
  createdAt: Timestamp;
  receivedAt?: Timestamp;
}

// Labels pour les statuts de livraison
export const DELIVERY_STATUS_LABELS: Record<DeliveryNoteStatus, string> = {
  pending: 'En attente',
  received: 'Reçu',
  partial: 'Partiel',
};
