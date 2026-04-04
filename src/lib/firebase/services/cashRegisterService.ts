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
  addDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../config';
import type { CashRegisterSession, CashRegisterStatus } from '../../../types';

const CASH_REGISTER_COLLECTION = 'cashRegisterSessions';
const SALES_COLLECTION = 'sales';

export function subscribeToSessions(callback: (sessions: CashRegisterSession[]) => void) {
  const q = query(
    collection(db, CASH_REGISTER_COLLECTION),
    orderBy('openedAt', 'desc'),
    limit(30)
  );
  return onSnapshot(q, (snapshot) => {
    const sessions = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as CashRegisterSession));
    callback(sessions);
  });
}

export async function getOpenSession(): Promise<CashRegisterSession | null> {
  const q = query(
    collection(db, CASH_REGISTER_COLLECTION),
    where('status', '==', 'open' as CashRegisterStatus),
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() } as CashRegisterSession;
}

// Open a new cash register session
// Check for existing open session OUTSIDE transaction, then create inside
export async function openCashRegister({
  openedBy,
  openedByName,
  openingAmount,
  notes,
}: {
  openedBy: string;
  openedByName: string;
  openingAmount: number;
  notes: string;
}): Promise<CashRegisterSession> {
  // Check for open session before transaction (getDocs can't be used inside transactions)
  const existing = await getOpenSession();
  if (existing) {
    throw new Error('Une session de caisse est déjà ouverte. Veuillez la fermer avant d\'en ouvrir une nouvelle.');
  }

  const now = Timestamp.now();
  const sessionData = {
    openedBy,
    openedByName,
    openingAmount,
    closingAmount: 0,
    expectedAmount: openingAmount,
    difference: 0,
    salesTotal: 0,
    salesCount: 0,
    status: 'open' as CashRegisterStatus,
    openedAt: now,
    notes,
  };

  const docRef = await addDoc(collection(db, CASH_REGISTER_COLLECTION), sessionData);
  return { id: docRef.id, ...sessionData } as CashRegisterSession;
}

// Close a cash register session
// Fetch sales OUTSIDE transaction, then update session inside
export async function closeCashRegister(
  id: string,
  { closingAmount, notes }: { closingAmount: number; notes: string }
): Promise<CashRegisterSession> {
  const sessionRef = doc(db, CASH_REGISTER_COLLECTION, id);

  // First, read the session to get openedAt (needed for sales query)
  const updatedSession = await runTransaction(db, async (transaction) => {
    const sessionSnap = await transaction.get(sessionRef);
    if (!sessionSnap.exists()) {
      throw new Error('Session de caisse introuvable.');
    }

    const sessionData = sessionSnap.data() as Omit<CashRegisterSession, 'id'>;
    if (sessionData.status !== 'open') {
      throw new Error('Cette session de caisse est déjà fermée.');
    }

    return { sessionData, openedAt: sessionData.openedAt, openingAmount: sessionData.openingAmount };
  });

  // Fetch sales OUTSIDE transaction (getDocs is not allowed inside transactions)
  const salesQuery = query(
    collection(db, SALES_COLLECTION),
    where('status', '==', 'completed'),
    where('paymentMethod', '==', 'cash'),
    where('createdAt', '>=', updatedSession.openedAt)
  );
  const salesSnapshot = await getDocs(salesQuery);

  let cashSalesTotal = 0;
  let cashSalesCount = 0;
  salesSnapshot.docs.forEach((d) => {
    const sale = d.data();
    cashSalesTotal += sale.total || 0;
    cashSalesCount++;
  });

  const expectedAmount = updatedSession.openingAmount + cashSalesTotal;
  const difference = closingAmount - expectedAmount;
  const now = Timestamp.now();

  const updates = {
    closingAmount,
    expectedAmount,
    difference,
    salesTotal: cashSalesTotal,
    salesCount: cashSalesCount,
    status: 'closed' as CashRegisterStatus,
    closedAt: now,
    notes,
  };

  // Update in a second transaction for atomicity
  await runTransaction(db, async (transaction) => {
    const sessionSnap = await transaction.get(sessionRef);
    if (!sessionSnap.exists() || sessionSnap.data().status !== 'open') {
      throw new Error('La session a été modifiée entre-temps. Réessayez.');
    }
    transaction.update(sessionRef, updates);
  });

  return {
    id,
    ...updatedSession.sessionData,
    ...updates,
  } as CashRegisterSession;
}
