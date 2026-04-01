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
import type { CashRegisterSession, CashRegisterStatus } from '../../../types';

const CASH_REGISTER_COLLECTION = 'cashRegisterSessions';
const SALES_COLLECTION = 'sales';

// Real-time listener for cash register sessions, ordered by openedAt desc, limit 30
export function subscribeToSessions(callback: (sessions: CashRegisterSession[]) => void) {
  const q = query(
    collection(db, CASH_REGISTER_COLLECTION),
    orderBy('openedAt', 'desc'),
    limit(30)
  );
  return onSnapshot(q, (snapshot) => {
    const sessions = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as CashRegisterSession));
    callback(sessions);
  });
}

// Get the current open session or null
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
  const newDocRef = doc(collection(db, CASH_REGISTER_COLLECTION));

  const session = await runTransaction(db, async (transaction) => {
    // Check that no other session is currently open
    const openQuery = query(
      collection(db, CASH_REGISTER_COLLECTION),
      where('status', '==', 'open' as CashRegisterStatus),
      limit(1)
    );
    const openSnapshot = await getDocs(openQuery);
    if (!openSnapshot.empty) {
      throw new Error('Une session de caisse est déjà ouverte. Veuillez la fermer avant d\'en ouvrir une nouvelle.');
    }

    const now = Timestamp.now();
    const sessionData: Omit<CashRegisterSession, 'id'> = {
      openedBy,
      openedByName,
      openingAmount,
      closingAmount: 0,
      expectedAmount: openingAmount,
      difference: 0,
      salesTotal: 0,
      salesCount: 0,
      status: 'open',
      openedAt: now,
      notes,
    };

    transaction.set(newDocRef, sessionData);

    return { id: newDocRef.id, ...sessionData } as CashRegisterSession;
  });

  return session;
}

// Close a cash register session
export async function closeCashRegister(
  id: string,
  { closingAmount, notes }: { closingAmount: number; notes: string }
): Promise<CashRegisterSession> {
  const sessionRef = doc(db, CASH_REGISTER_COLLECTION, id);

  const updatedSession = await runTransaction(db, async (transaction) => {
    const sessionSnap = await transaction.get(sessionRef);
    if (!sessionSnap.exists()) {
      throw new Error('Session de caisse introuvable.');
    }

    const sessionData = sessionSnap.data() as Omit<CashRegisterSession, 'id'>;
    if (sessionData.status !== 'open') {
      throw new Error('Cette session de caisse est déjà fermée.');
    }

    // Fetch today's completed cash sales since session was opened
    const salesQuery = query(
      collection(db, SALES_COLLECTION),
      where('status', '==', 'completed'),
      where('paymentMethod', '==', 'cash'),
      where('createdAt', '>=', sessionData.openedAt)
    );
    const salesSnapshot = await getDocs(salesQuery);

    let cashSalesTotal = 0;
    let cashSalesCount = 0;
    salesSnapshot.docs.forEach((doc) => {
      const sale = doc.data();
      cashSalesTotal += sale.total || 0;
      cashSalesCount++;
    });

    const expectedAmount = sessionData.openingAmount + cashSalesTotal;
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

    transaction.update(sessionRef, updates);

    return {
      id,
      ...sessionData,
      ...updates,
    } as CashRegisterSession;
  });

  return updatedSession;
}
