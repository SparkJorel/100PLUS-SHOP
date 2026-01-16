import { Timestamp } from 'firebase/firestore';
import type { CustomerType } from './customer';

// Méthodes de paiement
export type PaymentMethod = 'cash' | 'card' | 'mobile_money';

// Statut de la vente
export type SaleStatus = 'completed' | 'cancelled';

// Article dans une vente
export interface SaleItem {
  productId: string;
  productCode: string;
  productName: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;               // Prix appliqué (detail ou maison)
  total: number;
}

// Vente
export interface Sale {
  id: string;
  saleNumber: string;              // Numéro de facture (ex: VNT-20260116-001)
  customerId?: string;             // null si client lambda
  customerName?: string;
  customerType: CustomerType;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  status: SaleStatus;
  soldBy: string;                  // ID utilisateur
  soldByName: string;
  createdAt: Timestamp;
  syncedAt?: Timestamp;            // Pour tracking sync offline
}

// Labels pour les méthodes de paiement
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Espèces',
  card: 'Carte bancaire',
  mobile_money: 'Mobile Money'
};

// Labels pour les statuts
export const SALE_STATUS_LABELS: Record<SaleStatus, string> = {
  completed: 'Complétée',
  cancelled: 'Annulée'
};
