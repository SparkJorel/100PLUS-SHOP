import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  onSnapshot,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../config';
import type { Credit, CreditPayment, CreditStatus } from '../../../types';

const CREDITS_COLLECTION = 'credits';

// ─── Real-time listener ──────────────────────────────────────

export function subscribeToCredits(callback: (credits: Credit[]) => void) {
  const q = query(
    collection(db, CREDITS_COLLECTION),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    const credits = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Credit));
    callback(credits);
  });
}

// ─── Pending credits ─────────────────────────────────────────

export async function getPendingCredits(): Promise<Credit[]> {
  const q = query(
    collection(db, CREDITS_COLLECTION),
    where('status', '!=', 'paid')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Credit));
}

// ─── Create credit ───────────────────────────────────────────

export async function createCredit(data: {
  saleId: string;
  saleNumber: string;
  customerId: string;
  customerName: string;
  totalAmount: number;
  dueDate?: string;
}): Promise<string> {
  const now = Timestamp.now();
  const creditRef = doc(collection(db, CREDITS_COLLECTION));

  const creditData: Omit<Credit, 'id'> = {
    saleId: data.saleId,
    saleNumber: data.saleNumber,
    customerId: data.customerId,
    customerName: data.customerName,
    totalAmount: data.totalAmount,
    paidAmount: 0,
    remainingAmount: data.totalAmount,
    status: 'pending',
    payments: [],
    createdAt: now,
    updatedAt: now,
    ...(data.dueDate ? { dueDate: Timestamp.fromDate(new Date(data.dueDate)) } : {}),
  };

  await runTransaction(db, async (transaction) => {
    transaction.set(creditRef, creditData);
  });

  return creditRef.id;
}

// ─── Add payment to credit ───────────────────────────────────

export async function addCreditPayment(
  creditId: string,
  payment: {
    amount: number;
    paymentMethod: CreditPayment['paymentMethod'];
    receivedBy: string;
    receivedByName: string;
  }
): Promise<void> {
  const creditRef = doc(db, CREDITS_COLLECTION, creditId);

  await runTransaction(db, async (transaction) => {
    const creditSnap = await transaction.get(creditRef);
    if (!creditSnap.exists()) {
      throw new Error(`Credit ${creditId} not found`);
    }

    const credit = { id: creditSnap.id, ...creditSnap.data() } as Credit;

    const paymentId = doc(collection(db, CREDITS_COLLECTION)).id;
    const newPayment: CreditPayment = {
      id: paymentId,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      paidAt: Timestamp.now(),
      receivedBy: payment.receivedBy,
      receivedByName: payment.receivedByName,
    };

    const newPaidAmount = credit.paidAmount + payment.amount;
    const newRemainingAmount = credit.totalAmount - newPaidAmount;

    let newStatus: CreditStatus;
    if (newRemainingAmount <= 0) {
      newStatus = 'paid';
    } else if (newPaidAmount > 0) {
      newStatus = 'partial';
    } else {
      newStatus = 'pending';
    }

    transaction.update(creditRef, {
      payments: [...credit.payments, newPayment],
      paidAmount: newPaidAmount,
      remainingAmount: newRemainingAmount,
      status: newStatus,
      updatedAt: Timestamp.now(),
    });
  });
}

// ─── Total pending credits ───────────────────────────────────

export async function getTotalPendingCredits(): Promise<{ count: number; totalAmount: number }> {
  const credits = await getPendingCredits();
  return {
    count: credits.length,
    totalAmount: credits.reduce((sum, c) => sum + c.remainingAmount, 0),
  };
}
