import {
  collection,
  doc,
  getDocs,
  query,
  orderBy,
  Timestamp,
  onSnapshot,
  limit,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../config';
import type { SaleItem } from '../../../types';
import { revertCustomerPurchaseStats } from './customerService';

const RETURNS_COLLECTION = 'returns';
const SALES_COLLECTION = 'sales';
const PRODUCTS_COLLECTION = 'products';

export type ReturnType = 'refund' | 'exchange';

export interface Return {
  id: string;
  saleId: string;
  saleNumber: string;
  type: ReturnType;
  items: ReturnItem[];
  totalRefund: number;
  reason: string;
  processedBy: string;
  processedByName: string;
  createdAt: Timestamp;
}

export interface ReturnItem {
  productId: string;
  productName: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export function subscribeToReturns(callback: (returns: Return[]) => void) {
  const q = query(
    collection(db, RETURNS_COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(100)
  );
  return onSnapshot(q, (snapshot) => {
    const returns = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Return));
    callback(returns);
  });
}

export async function createReturn(data: {
  saleId: string;
  saleNumber: string;
  type: ReturnType;
  items: ReturnItem[];
  totalRefund: number;
  reason: string;
  customerId?: string;
  processedBy: string;
  processedByName: string;
}): Promise<string> {
  const returnId = await runTransaction(db, async (transaction) => {
    // Restore stock for returned items
    for (const item of data.items) {
      const productRef = doc(db, PRODUCTS_COLLECTION, item.productId);
      const productSnap = await transaction.get(productRef);

      if (productSnap.exists()) {
        const currentQuantity = productSnap.data().quantity;
        transaction.update(productRef, {
          quantity: currentQuantity + item.quantity,
          updatedAt: Timestamp.now(),
        });
      }
    }

    // Create the return record
    const returnRef = doc(collection(db, RETURNS_COLLECTION));
    transaction.set(returnRef, {
      saleId: data.saleId,
      saleNumber: data.saleNumber,
      type: data.type,
      items: data.items,
      totalRefund: data.totalRefund,
      reason: data.reason,
      processedBy: data.processedBy,
      processedByName: data.processedByName,
      createdAt: Timestamp.now(),
    });

    return returnRef.id;
  });

  // Revert customer purchase stats for the refund amount
  if (data.customerId && data.totalRefund > 0) {
    await revertCustomerPurchaseStats(data.customerId, data.totalRefund);
  }

  return returnId;
}
