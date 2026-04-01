import {
  collection,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  onSnapshot,
  limit,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../config';
import type { Supplier, SupplierFormData, DeliveryNote, DeliveryNoteItem } from '../../../types';

const SUPPLIERS_COLLECTION = 'suppliers';
const DELIVERY_NOTES_COLLECTION = 'deliveryNotes';
const PRODUCTS_COLLECTION = 'products';
const STOCK_MOVEMENTS_COLLECTION = 'stockMovements';

// ============ SUPPLIERS ============

export function subscribeToSuppliers(callback: (suppliers: Supplier[]) => void) {
  const q = query(
    collection(db, SUPPLIERS_COLLECTION),
    where('isActive', '==', true),
    orderBy('name', 'asc')
  );
  return onSnapshot(q, (snapshot) => {
    const suppliers = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Supplier));
    callback(suppliers);
  });
}

export async function createSupplier(data: SupplierFormData): Promise<string> {
  const docRef = await addDoc(collection(db, SUPPLIERS_COLLECTION), {
    ...data,
    isActive: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function updateSupplier(id: string, data: Partial<SupplierFormData>): Promise<void> {
  await updateDoc(doc(db, SUPPLIERS_COLLECTION, id), {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteSupplier(id: string): Promise<void> {
  // Soft delete
  await updateDoc(doc(db, SUPPLIERS_COLLECTION, id), {
    isActive: false,
    updatedAt: Timestamp.now(),
  });
}

// ============ DELIVERY NOTES ============

export function subscribeToDeliveryNotes(callback: (notes: DeliveryNote[]) => void) {
  const q = query(
    collection(db, DELIVERY_NOTES_COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(100)
  );
  return onSnapshot(q, (snapshot) => {
    const notes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as DeliveryNote));
    callback(notes);
  });
}

export async function createDeliveryNote(data: {
  supplierId: string;
  supplierName: string;
  reference: string;
  items: DeliveryNoteItem[];
  totalAmount: number;
  status: 'pending' | 'received' | 'partial';
  receivedBy?: string;
  receivedByName?: string;
}): Promise<string> {
  const noteId = await runTransaction(db, async (transaction) => {
    // Read all product documents first (required before writes in a transaction)
    const productSnaps = await Promise.all(
      data.items.map((item) => {
        const productRef = doc(db, PRODUCTS_COLLECTION, item.productId);
        return transaction.get(productRef);
      })
    );

    // Validate all products exist
    productSnaps.forEach((snap, index) => {
      if (!snap.exists()) {
        throw new Error(`Produit introuvable: ${data.items[index].productName}`);
      }
    });

    // Create the delivery note
    const noteRef = doc(collection(db, DELIVERY_NOTES_COLLECTION));
    const now = Timestamp.now();

    transaction.set(noteRef, {
      supplierId: data.supplierId,
      supplierName: data.supplierName,
      reference: data.reference,
      items: data.items,
      totalAmount: data.totalAmount,
      status: data.status,
      receivedBy: data.receivedBy || null,
      receivedByName: data.receivedByName || null,
      createdAt: now,
      receivedAt: data.status === 'received' ? now : null,
    });

    // Update product quantities and create stock movements
    data.items.forEach((item, index) => {
      const productSnap = productSnaps[index];
      const productData = productSnap.data()!;
      const previousQuantity = productData.quantity;
      const newQuantity = previousQuantity + item.quantity;

      // Update product quantity
      const productRef = doc(db, PRODUCTS_COLLECTION, item.productId);
      transaction.update(productRef, {
        quantity: newQuantity,
        updatedAt: now,
      });

      // Create stock movement
      const movementRef = doc(collection(db, STOCK_MOVEMENTS_COLLECTION));
      transaction.set(movementRef, {
        productId: item.productId,
        productName: item.productName,
        productCode: productData.code || '',
        type: 'in',
        quantity: item.quantity,
        previousQuantity,
        newQuantity,
        reason: 'Réception fournisseur',
        reference: noteRef.id,
        createdBy: data.receivedBy || '',
        createdByName: data.receivedByName || '',
        createdAt: now,
      });
    });

    return noteRef.id;
  });

  return noteId;
}

export async function getDeliveryNote(id: string): Promise<DeliveryNote | null> {
  const docRef = doc(db, DELIVERY_NOTES_COLLECTION, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as DeliveryNote;
  }
  return null;
}
