import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  Timestamp,
  onSnapshot,
  limit,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../config';
import type { Sale, SaleItem } from '../../../types';
import { updateCustomerPurchaseStats, revertCustomerPurchaseStats } from './customerService';

const SALES_COLLECTION = 'sales';
const PRODUCTS_COLLECTION = 'products';
const COUNTERS_COLLECTION = 'counters';

// Generate sale number with sequential counter: VNT-YYYYMMDD-XXX
async function generateSaleNumber(transaction: Parameters<Parameters<typeof runTransaction>[1]>[0]): Promise<string> {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const counterDocId = `sales-${dateStr}`;
  const counterRef = doc(db, COUNTERS_COLLECTION, counterDocId);
  const counterSnap = await transaction.get(counterRef);

  let nextCount = 1;
  if (counterSnap.exists()) {
    nextCount = (counterSnap.data().count || 0) + 1;
  }

  transaction.set(counterRef, { count: nextCount, date: dateStr }, { merge: true });

  return `VNT-${dateStr}-${String(nextCount).padStart(3, '0')}`;
}

export async function getSales(): Promise<Sale[]> {
  const q = query(collection(db, SALES_COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Sale));
}

export function subscribeToSales(callback: (sales: Sale[]) => void) {
  const q = query(collection(db, SALES_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const sales = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Sale));
    callback(sales);
  });
}

export async function getRecentSales(count: number = 5): Promise<Sale[]> {
  const q = query(
    collection(db, SALES_COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(count)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Sale));
}

export async function getSaleById(id: string): Promise<Sale | null> {
  const docRef = doc(db, SALES_COLLECTION, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Sale;
  }
  return null;
}

export async function getSalesByDate(startDate: Date, endDate: Date): Promise<Sale[]> {
  const q = query(
    collection(db, SALES_COLLECTION),
    where('createdAt', '>=', Timestamp.fromDate(startDate)),
    where('createdAt', '<=', Timestamp.fromDate(endDate)),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Sale));
}

export async function getTodaySales(): Promise<Sale[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return getSalesByDate(today, tomorrow);
}

export async function createSale(saleData: {
  items: SaleItem[];
  customerId?: string;
  customerName?: string;
  customerType: 'maison' | 'lambda';
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'mobile_money';
  soldBy: string;
  soldByName: string;
}): Promise<string> {
  const saleId = await runTransaction(db, async (transaction) => {
    // Generate sequential sale number inside the transaction
    const saleNumber = await generateSaleNumber(transaction);

    // Update stock for each item
    for (const item of saleData.items) {
      const productRef = doc(db, PRODUCTS_COLLECTION, item.productId);
      const productSnap = await transaction.get(productRef);

      if (!productSnap.exists()) {
        throw new Error(`Produit ${item.productName} introuvable`);
      }

      const currentQuantity = productSnap.data().quantity;
      if (currentQuantity < item.quantity) {
        throw new Error(`Stock insuffisant pour ${item.productName}`);
      }

      transaction.update(productRef, {
        quantity: currentQuantity - item.quantity,
        updatedAt: Timestamp.now(),
      });
    }

    // Create the sale
    const saleRef = doc(collection(db, SALES_COLLECTION));
    transaction.set(saleRef, {
      ...saleData,
      saleNumber,
      status: 'completed',
      createdAt: Timestamp.now(),
      syncedAt: Timestamp.now(),
    });

    return saleRef.id;
  });

  // Update customer purchase stats if it's a registered customer
  if (saleData.customerId) {
    await updateCustomerPurchaseStats(saleData.customerId, saleData.total);
  }

  return saleId;
}

export async function cancelSale(id: string): Promise<void> {
  const sale = await getSaleById(id);
  if (!sale) {
    throw new Error('Vente introuvable');
  }

  if (sale.status === 'cancelled') {
    throw new Error('Cette vente est déjà annulée');
  }

  await runTransaction(db, async (transaction) => {
    // Restore stock for each item
    for (const item of sale.items) {
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

    // Update sale status
    transaction.update(doc(db, SALES_COLLECTION, id), {
      status: 'cancelled',
      syncedAt: Timestamp.now(),
    });
  });

  // Revert customer purchase stats if it was a registered customer
  if (sale.customerId) {
    await revertCustomerPurchaseStats(sale.customerId, sale.total);
  }
}
