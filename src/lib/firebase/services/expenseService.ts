import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  onSnapshot,
  limit,
} from 'firebase/firestore';
import { db } from '../config';
import type { Expense, ExpenseFormData } from '../../../types';
import { EXPENSE_CATEGORY_LABELS, type ExpenseCategory } from '../../../types';

const EXPENSES_COLLECTION = 'expenses';

export function subscribeToExpenses(callback: (expenses: Expense[]) => void) {
  const q = query(
    collection(db, EXPENSES_COLLECTION),
    orderBy('date', 'desc'),
    limit(200)
  );
  return onSnapshot(q, (snapshot) => {
    const expenses = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Expense));
    callback(expenses);
  });
}

export async function getExpensesByDateRange(startDate: Date, endDate: Date): Promise<Expense[]> {
  const q = query(
    collection(db, EXPENSES_COLLECTION),
    where('date', '>=', Timestamp.fromDate(startDate)),
    where('date', '<=', Timestamp.fromDate(endDate)),
    orderBy('date', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Expense));
}

export async function createExpense(
  data: ExpenseFormData & { createdBy: string; createdByName: string }
): Promise<string> {
  const docRef = await addDoc(collection(db, EXPENSES_COLLECTION), {
    category: data.category,
    description: data.description,
    amount: data.amount,
    paymentMethod: data.paymentMethod,
    date: Timestamp.fromDate(new Date(data.date)),
    reference: data.reference || null,
    createdBy: data.createdBy,
    createdByName: data.createdByName,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function updateExpense(
  id: string,
  data: Partial<ExpenseFormData>
): Promise<void> {
  const updateData: Record<string, unknown> = { ...data };

  // Convert date string to Timestamp if provided
  if (data.date) {
    updateData.date = Timestamp.fromDate(new Date(data.date));
  }

  await updateDoc(doc(db, EXPENSES_COLLECTION, id), updateData);
}

export async function deleteExpense(id: string): Promise<void> {
  await deleteDoc(doc(db, EXPENSES_COLLECTION, id));
}

export async function getExpenseSummaryByCategory(
  startDate: Date,
  endDate: Date
): Promise<{ category: ExpenseCategory; label: string; total: number; count: number }[]> {
  const expenses = await getExpensesByDateRange(startDate, endDate);

  const summaryMap = new Map<ExpenseCategory, { total: number; count: number }>();

  for (const expense of expenses) {
    const existing = summaryMap.get(expense.category);
    if (existing) {
      existing.total += expense.amount;
      existing.count += 1;
    } else {
      summaryMap.set(expense.category, { total: expense.amount, count: 1 });
    }
  }

  return Array.from(summaryMap.entries()).map(([category, { total, count }]) => ({
    category,
    label: EXPENSE_CATEGORY_LABELS[category],
    total,
    count,
  }));
}
