import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  Timestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../config';
import type { Customer, CustomerFormData } from '../../../types';

const CUSTOMERS_COLLECTION = 'customers';

export async function getCustomers(): Promise<Customer[]> {
  const q = query(
    collection(db, CUSTOMERS_COLLECTION),
    where('isActive', '==', true)
  );
  const snapshot = await getDocs(q);
  const customers = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Customer));
  return customers.sort((a, b) => a.fullName.localeCompare(b.fullName));
}

export function subscribeToCustomers(callback: (customers: Customer[]) => void) {
  const q = query(
    collection(db, CUSTOMERS_COLLECTION),
    where('isActive', '==', true)
  );
  return onSnapshot(q, (snapshot) => {
    const customers = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Customer));
    customers.sort((a, b) => a.fullName.localeCompare(b.fullName));
    callback(customers);
  });
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const docRef = doc(db, CUSTOMERS_COLLECTION, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Customer;
  }
  return null;
}

export async function searchCustomers(searchTerm: string): Promise<Customer[]> {
  const customers = await getCustomers();
  const term = searchTerm.toLowerCase();
  return customers.filter(
    (c) =>
      c.fullName.toLowerCase().includes(term) ||
      c.phone.includes(term) ||
      (c.email && c.email.toLowerCase().includes(term))
  );
}

export async function createCustomer(data: CustomerFormData): Promise<string> {
  const docRef = await addDoc(collection(db, CUSTOMERS_COLLECTION), {
    ...data,
    totalPurchases: 0,
    purchasesCount: 0,
    isActive: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function updateCustomer(id: string, data: Partial<CustomerFormData>): Promise<void> {
  await updateDoc(doc(db, CUSTOMERS_COLLECTION, id), {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteCustomer(id: string): Promise<void> {
  // Soft delete
  await updateDoc(doc(db, CUSTOMERS_COLLECTION, id), {
    isActive: false,
    updatedAt: Timestamp.now(),
  });
}

export async function updateCustomerPurchaseStats(
  id: string,
  purchaseAmount: number
): Promise<void> {
  const customer = await getCustomerById(id);
  if (customer) {
    await updateDoc(doc(db, CUSTOMERS_COLLECTION, id), {
      totalPurchases: customer.totalPurchases + purchaseAmount,
      purchasesCount: customer.purchasesCount + 1,
      updatedAt: Timestamp.now(),
    });
  }
}

export async function revertCustomerPurchaseStats(
  id: string,
  purchaseAmount: number
): Promise<void> {
  const customer = await getCustomerById(id);
  if (customer) {
    await updateDoc(doc(db, CUSTOMERS_COLLECTION, id), {
      totalPurchases: Math.max(0, customer.totalPurchases - purchaseAmount),
      purchasesCount: Math.max(0, customer.purchasesCount - 1),
      updatedAt: Timestamp.now(),
    });
  }
}
