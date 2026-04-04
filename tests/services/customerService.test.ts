import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockTimestamp } from './firebase-mock';

// vi.hoisted runs before vi.mock hoisting
const mocks = vi.hoisted(() => {
  const incrementFn = vi.fn((n: number) => ({ _increment: n }));
  return {
    collection: vi.fn((_db: any, name: string) => ({ _name: name })),
    doc: vi.fn((...args: any[]) => ({ _path: args.slice(1).join('/') })),
    getDocs: vi.fn(),
    getDoc: vi.fn(),
    addDoc: vi.fn().mockResolvedValue({ id: 'new-customer-id' }),
    updateDoc: vi.fn().mockResolvedValue(undefined),
    query: vi.fn((...args: any[]) => args),
    where: vi.fn(),
    Timestamp: {
      now: vi.fn(() => mockTimestamp()),
      fromDate: vi.fn((d: Date) => mockTimestamp(d)),
    },
    onSnapshot: vi.fn(),
    increment: incrementFn,
  };
});

vi.mock('firebase/firestore', () => mocks);
vi.mock('../../src/lib/firebase/config', () => ({ db: {} }));

import {
  createCustomer,
  deleteCustomer,
  updateCustomerPurchaseStats,
  revertCustomerPurchaseStats,
} from '../../src/lib/firebase/services/customerService';

describe('customerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.addDoc.mockResolvedValue({ id: 'new-customer-id' });
    mocks.updateDoc.mockResolvedValue(undefined);
  });

  describe('updateCustomerPurchaseStats', () => {
    it('appelle updateDoc avec increment(amount) et increment(1)', async () => {
      await updateCustomerPurchaseStats('cust-1', 15000);

      expect(mocks.updateDoc).toHaveBeenCalledTimes(1);
      expect(mocks.increment).toHaveBeenCalledWith(15000);
      expect(mocks.increment).toHaveBeenCalledWith(1);
    });
  });

  describe('revertCustomerPurchaseStats', () => {
    it('appelle updateDoc avec increment(-amount) et increment(-1)', async () => {
      await revertCustomerPurchaseStats('cust-1', 15000);

      expect(mocks.updateDoc).toHaveBeenCalledTimes(1);
      expect(mocks.increment).toHaveBeenCalledWith(-15000);
      expect(mocks.increment).toHaveBeenCalledWith(-1);
    });
  });

  describe('createCustomer', () => {
    it('initialise avec totalPurchases: 0, purchasesCount: 0, isActive: true', async () => {
      const formData = {
        fullName: 'Alice Dupont',
        phone: '+237600000000',
        email: 'alice@example.com',
        address: '123 Main St',
      };

      const id = await createCustomer(formData);

      expect(id).toBe('new-customer-id');
      expect(mocks.addDoc).toHaveBeenCalledTimes(1);
      expect(mocks.addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          fullName: 'Alice Dupont',
          totalPurchases: 0,
          purchasesCount: 0,
          isActive: true,
        }),
      );
    });
  });

  describe('deleteCustomer', () => {
    it('soft delete en mettant isActive a false', async () => {
      await deleteCustomer('cust-1');

      expect(mocks.updateDoc).toHaveBeenCalledTimes(1);
      expect(mocks.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ isActive: false }),
      );
    });
  });
});
