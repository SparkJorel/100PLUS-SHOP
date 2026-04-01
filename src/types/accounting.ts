import { Timestamp } from 'firebase/firestore';

// ─── Session de caisse ───────────────────────────────────────

export type CashRegisterStatus = 'open' | 'closed';

export interface CashRegisterSession {
  id: string;
  openedBy: string;                 // ID utilisateur
  openedByName: string;
  openingAmount: number;            // Montant en caisse à l'ouverture
  closingAmount: number;            // Montant compté à la fermeture
  expectedAmount: number;           // Montant attendu (ouverture + ventes)
  difference: number;               // Écart (closingAmount - expectedAmount)
  salesTotal: number;               // Total des ventes pendant la session
  salesCount: number;               // Nombre de ventes
  status: CashRegisterStatus;
  openedAt: Timestamp;
  closedAt?: Timestamp;
  notes: string;
}

// ─── Dépenses ────────────────────────────────────────────────

export type ExpenseCategory =
  | 'rent'
  | 'salary'
  | 'transport'
  | 'supplies'
  | 'utilities'
  | 'marketing'
  | 'maintenance'
  | 'other';

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  rent: 'Loyer',
  salary: 'Salaires',
  transport: 'Transport',
  supplies: 'Fournitures',
  utilities: 'Charges (eau, électricité)',
  marketing: 'Marketing',
  maintenance: 'Maintenance',
  other: 'Autre',
};

export type ExpensePaymentMethod = 'cash' | 'card' | 'mobile_money';

export interface Expense {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  paymentMethod: ExpensePaymentMethod;
  date: Timestamp;
  createdBy: string;                // ID utilisateur
  createdByName: string;
  createdAt: Timestamp;
  reference?: string;               // Référence externe (facture, reçu, etc.)
}

export interface ExpenseFormData {
  category: ExpenseCategory;
  description: string;
  amount: number;
  paymentMethod: ExpensePaymentMethod;
  date: string;                     // ISO string pour les formulaires
  reference?: string;
}

// ─── Crédits clients ─────────────────────────────────────────

export type CreditStatus = 'pending' | 'partial' | 'paid';

export interface CreditPayment {
  id: string;
  amount: number;
  paymentMethod: ExpensePaymentMethod;
  paidAt: Timestamp;
  receivedBy: string;               // ID utilisateur
  receivedByName: string;
}

export interface Credit {
  id: string;
  saleId: string;
  saleNumber: string;
  customerId: string;
  customerName: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: CreditStatus;
  payments: CreditPayment[];
  dueDate?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
