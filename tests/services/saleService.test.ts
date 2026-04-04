import { describe, it, expect, vi, beforeEach } from 'vitest';

function mockDocSnap(data: Record<string, any> | null, id = 'test-id') {
  return { exists: () => data !== null, id, data: () => data };
}

const mocks = vi.hoisted(() => ({
  collection: vi.fn(() => ({ _col: true })),
  doc: vi.fn(() => ({ id: 'auto-id-' + Math.random().toString(36).slice(2, 8) })),
  getDocs: vi.fn(),
  getDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  Timestamp: { now: vi.fn(() => ({ toDate: () => new Date(), toMillis: () => Date.now() })), fromDate: vi.fn() },
  onSnapshot: vi.fn(),
  limit: vi.fn(),
  runTransaction: vi.fn(),
}));

const customerMocks = vi.hoisted(() => ({
  updateCustomerPurchaseStats: vi.fn(),
  revertCustomerPurchaseStats: vi.fn(),
}));

vi.mock('firebase/firestore', () => mocks);
vi.mock('../../src/lib/firebase/config', () => ({ db: {} }));
vi.mock('../../src/lib/firebase/services/customerService', () => customerMocks);

import { createSale, cancelSale } from '../../src/lib/firebase/services/saleService';

function makeSaleData(overrides = {}) {
  return {
    items: [{ productId: 'prod-1', productCode: 'P001', productName: 'Shirt', size: 'M', color: 'Blue', quantity: 2, unitPrice: 5000, total: 10000 }],
    customerType: 'lambda' as const,
    subtotal: 10000, discount: 0, total: 10000,
    paymentMethod: 'cash' as const,
    soldBy: 'user-1', soldByName: 'John',
    ...overrides,
  };
}

describe('saleService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('createSale', () => {
    it('decremente le stock et cree la vente avec numero sequentiel', async () => {
      mocks.runTransaction.mockImplementation(async (_db: any, cb: any) => {
        const tx = {
          get: vi.fn()
            .mockResolvedValueOnce(mockDocSnap({ count: 5 }, 'counter'))
            .mockResolvedValueOnce(mockDocSnap({ quantity: 10, name: 'Shirt' }, 'prod-1')),
          set: vi.fn(), update: vi.fn(),
        };
        return cb(tx);
      });

      await createSale(makeSaleData());
      expect(mocks.runTransaction).toHaveBeenCalledTimes(1);

      // Replay
      const cb = mocks.runTransaction.mock.calls[0][1];
      const tx = {
        get: vi.fn()
          .mockResolvedValueOnce(mockDocSnap({ count: 5 }, 'counter'))
          .mockResolvedValueOnce(mockDocSnap({ quantity: 10, name: 'Shirt' }, 'prod-1')),
        set: vi.fn(), update: vi.fn(),
      };
      await cb(tx);

      expect(tx.update).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ quantity: 8 }));
      expect(tx.set).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ count: 6 }), { merge: true });
      const saleCall = tx.set.mock.calls.find((c: any[]) => c[1]?.status === 'completed');
      expect(saleCall![1].saleNumber).toMatch(/^VNT-\d{8}-006$/);
    });

    it('erreur si stock insuffisant', async () => {
      mocks.runTransaction.mockImplementation(async (_db: any, cb: any) => {
        const tx = {
          get: vi.fn()
            .mockResolvedValueOnce(mockDocSnap({ count: 1 }, 'counter'))
            .mockResolvedValueOnce(mockDocSnap({ quantity: 1, name: 'Shirt' }, 'prod-1')),
          set: vi.fn(), update: vi.fn(),
        };
        return cb(tx);
      });

      await expect(createSale(makeSaleData({
        items: [{ productId: 'prod-1', productCode: 'P001', productName: 'Shirt', size: 'M', color: 'Blue', quantity: 5, unitPrice: 5000, total: 25000 }],
      }))).rejects.toThrow('Stock insuffisant');
    });

    it('erreur si produit introuvable', async () => {
      mocks.runTransaction.mockImplementation(async (_db: any, cb: any) => {
        const tx = {
          get: vi.fn()
            .mockResolvedValueOnce(mockDocSnap({ count: 1 }, 'counter'))
            .mockResolvedValueOnce(mockDocSnap(null, 'prod-1')),
          set: vi.fn(), update: vi.fn(),
        };
        return cb(tx);
      });

      await expect(createSale(makeSaleData())).rejects.toThrow('introuvable');
    });

    it('met a jour les stats client si customerId fourni', async () => {
      mocks.runTransaction.mockImplementation(async (_db: any, cb: any) => {
        const tx = {
          get: vi.fn()
            .mockResolvedValueOnce(mockDocSnap({ count: 1 }, 'counter'))
            .mockResolvedValueOnce(mockDocSnap({ quantity: 10 }, 'prod-1')),
          set: vi.fn(), update: vi.fn(),
        };
        return cb(tx);
      });

      await createSale(makeSaleData({ customerId: 'cust-1', customerName: 'Alice' }));
      expect(customerMocks.updateCustomerPurchaseStats).toHaveBeenCalledWith('cust-1', 10000);
    });

    it('numero sequentiel commence a 1 si compteur inexistant', async () => {
      mocks.runTransaction.mockImplementation(async (_db: any, cb: any) => {
        const tx = {
          get: vi.fn()
            .mockResolvedValueOnce(mockDocSnap(null, 'counter'))
            .mockResolvedValueOnce(mockDocSnap({ quantity: 100 }, 'prod-1')),
          set: vi.fn(), update: vi.fn(),
        };
        return cb(tx);
      });

      await createSale(makeSaleData());

      const cb = mocks.runTransaction.mock.calls[0][1];
      const tx = {
        get: vi.fn()
          .mockResolvedValueOnce(mockDocSnap(null, 'counter'))
          .mockResolvedValueOnce(mockDocSnap({ quantity: 100 }, 'prod-1')),
        set: vi.fn(), update: vi.fn(),
      };
      await cb(tx);

      expect(tx.set).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ count: 1 }), { merge: true });
    });
  });

  describe('cancelSale', () => {
    it('restore le stock et passe le statut a cancelled', async () => {
      mocks.getDoc.mockResolvedValueOnce(mockDocSnap({
        saleNumber: 'VNT-20260401-001', items: [{ productId: 'prod-1', productName: 'Shirt', quantity: 2 }],
        status: 'completed', total: 10000, customerId: 'cust-1', customerType: 'maison',
      }, 'sale-1'));

      mocks.runTransaction.mockImplementation(async (_db: any, cb: any) => {
        const tx = { get: vi.fn().mockResolvedValue(mockDocSnap({ quantity: 5 }, 'prod-1')), set: vi.fn(), update: vi.fn() };
        return cb(tx);
      });

      await cancelSale('sale-1');
      expect(mocks.runTransaction).toHaveBeenCalledTimes(1);
      expect(customerMocks.revertCustomerPurchaseStats).toHaveBeenCalledWith('cust-1', 10000);
    });

    it('erreur si vente deja annulee', async () => {
      mocks.getDoc.mockResolvedValueOnce(mockDocSnap({ status: 'cancelled', items: [], total: 5000 }, 'sale-1'));
      await expect(cancelSale('sale-1')).rejects.toThrow('déjà annulée');
    });

    it('erreur si vente introuvable', async () => {
      mocks.getDoc.mockResolvedValueOnce(mockDocSnap(null, 'sale-1'));
      await expect(cancelSale('sale-1')).rejects.toThrow('introuvable');
    });
  });
});
