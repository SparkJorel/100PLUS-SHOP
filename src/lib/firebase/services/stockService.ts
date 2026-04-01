import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  onSnapshot,
  limit,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../config';
import type { StockMovement } from '../../../types';

const STOCK_MOVEMENTS_COLLECTION = 'stockMovements';
const PRODUCTS_COLLECTION = 'products';

export async function getStockMovements(): Promise<StockMovement[]> {
  const q = query(
    collection(db, STOCK_MOVEMENTS_COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(100)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as StockMovement));
}

export function subscribeToStockMovements(callback: (movements: StockMovement[]) => void) {
  const q = query(
    collection(db, STOCK_MOVEMENTS_COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(100)
  );
  return onSnapshot(q, (snapshot) => {
    const movements = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as StockMovement));
    callback(movements);
  });
}

export async function getProductStockMovements(productId: string): Promise<StockMovement[]> {
  const q = query(
    collection(db, STOCK_MOVEMENTS_COLLECTION),
    where('productId', '==', productId)
  );
  const snapshot = await getDocs(q);
  const movements = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as StockMovement));
  return movements.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
}

export async function createStockMovement(data: {
  productId: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reason: string;
  reference?: string;
  createdBy: string;
  createdByName: string;
}): Promise<string> {
  const movementId = await runTransaction(db, async (transaction) => {
    const productRef = doc(db, PRODUCTS_COLLECTION, data.productId);
    const productSnap = await transaction.get(productRef);

    if (!productSnap.exists()) {
      throw new Error('Produit introuvable');
    }

    const productData = productSnap.data();
    const previousQuantity = productData.quantity;
    let newQuantity: number;

    switch (data.type) {
      case 'in':
        newQuantity = previousQuantity + data.quantity;
        break;
      case 'out':
        if (previousQuantity < data.quantity) {
          throw new Error('Stock insuffisant');
        }
        newQuantity = previousQuantity - data.quantity;
        break;
      case 'adjustment':
        newQuantity = data.quantity;
        break;
      default:
        throw new Error('Type de mouvement invalide');
    }

    // Update product stock atomically
    transaction.update(productRef, {
      quantity: newQuantity,
      updatedAt: Timestamp.now(),
    });

    // Create movement record atomically
    const movementRef = doc(collection(db, STOCK_MOVEMENTS_COLLECTION));
    transaction.set(movementRef, {
      productId: data.productId,
      productName: productData.name,
      productCode: productData.code,
      type: data.type,
      quantity: data.type === 'adjustment' ? Math.abs(newQuantity - previousQuantity) : data.quantity,
      previousQuantity,
      newQuantity,
      reason: data.reason,
      reference: data.reference || null,
      createdBy: data.createdBy,
      createdByName: data.createdByName,
      createdAt: Timestamp.now(),
    });

    return movementRef.id;
  });

  return movementId;
}

export async function getLowStockProducts(): Promise<
  Array<{ id: string; name: string; code: string; quantity: number; minStock: number }>
> {
  const q = query(
    collection(db, PRODUCTS_COLLECTION),
    where('isActive', '==', true)
  );
  const snapshot = await getDocs(q);

  const lowStockProducts: Array<{
    id: string;
    name: string;
    code: string;
    quantity: number;
    minStock: number;
  }> = [];

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    if (data.quantity <= data.minStock) {
      lowStockProducts.push({
        id: doc.id,
        name: data.name,
        code: data.code,
        quantity: data.quantity,
        minStock: data.minStock,
      });
    }
  });

  return lowStockProducts;
}
