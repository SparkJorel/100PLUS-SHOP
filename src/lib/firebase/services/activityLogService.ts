import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  Timestamp,
  onSnapshot,
  limit,
} from 'firebase/firestore';
import { db } from '../config';

// Types
export type ActivityAction =
  | 'sale_created'
  | 'sale_cancelled'
  | 'product_created'
  | 'product_updated'
  | 'product_deleted'
  | 'stock_movement'
  | 'customer_created'
  | 'customer_updated'
  | 'expense_created'
  | 'cash_register_opened'
  | 'cash_register_closed'
  | 'return_created'
  | 'credit_payment'
  | 'delivery_received'
  | 'user_updated'
  | 'inventory_completed';

export interface ActivityLog {
  id: string;
  action: ActivityAction;
  description: string;
  userId: string;
  userName: string;
  metadata?: Record<string, any>;
  createdAt: Timestamp;
}

export const ACTIVITY_ACTION_LABELS: Record<ActivityAction, string> = {
  sale_created: 'Vente',
  sale_cancelled: 'Annulation vente',
  product_created: 'Nouveau produit',
  product_updated: 'Modification produit',
  product_deleted: 'Suppression produit',
  stock_movement: 'Mouvement stock',
  customer_created: 'Nouveau client',
  customer_updated: 'Modification client',
  expense_created: 'Dépense',
  cash_register_opened: 'Ouverture caisse',
  cash_register_closed: 'Fermeture caisse',
  return_created: 'Retour/échange',
  credit_payment: 'Paiement créance',
  delivery_received: 'Réception livraison',
  user_updated: 'Modification utilisateur',
  inventory_completed: 'Inventaire',
};

const ACTIVITY_LOG_COLLECTION = 'activityLog';

export async function logActivity(data: {
  action: ActivityAction;
  description: string;
  userId: string;
  userName: string;
  metadata?: Record<string, any>;
}): Promise<string> {
  const docRef = await addDoc(collection(db, ACTIVITY_LOG_COLLECTION), {
    action: data.action,
    description: data.description,
    userId: data.userId,
    userName: data.userName,
    metadata: data.metadata || null,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

export function subscribeToActivityLog(
  callback: (logs: ActivityLog[]) => void,
  limitCount: number = 100
) {
  const q = query(
    collection(db, ACTIVITY_LOG_COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  return onSnapshot(q, (snapshot) => {
    const logs = snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as ActivityLog)
    );
    callback(logs);
  });
}

export async function getActivityLogByDate(
  startDate: Date,
  endDate: Date
): Promise<ActivityLog[]> {
  const q = query(
    collection(db, ACTIVITY_LOG_COLLECTION),
    where('createdAt', '>=', Timestamp.fromDate(startDate)),
    where('createdAt', '<=', Timestamp.fromDate(endDate)),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() } as ActivityLog)
  );
}
