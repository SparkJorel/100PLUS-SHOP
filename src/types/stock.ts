import { Timestamp } from 'firebase/firestore';

// Type de mouvement de stock
export type StockMovementType = 'in' | 'out' | 'adjustment';

// Mouvement de stock
export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  type: StockMovementType;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string;
  reference?: string;              // ID vente ou bon de livraison
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
}

// Type pour les formulaires
export type StockMovementFormData = Pick<StockMovement, 'productId' | 'type' | 'quantity' | 'reason' | 'reference'>;

// Labels pour les types de mouvement
export const MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  in: 'Entrée',
  out: 'Sortie',
  adjustment: 'Ajustement'
};

// Raisons prédéfinies
export const STOCK_REASONS = {
  in: ['Réception fournisseur', 'Retour client', 'Inventaire (ajustement +)', 'Autre'],
  out: ['Vente', 'Perte', 'Don', 'Inventaire (ajustement -)', 'Autre'],
  adjustment: ['Inventaire', 'Correction erreur', 'Autre']
} as const;
