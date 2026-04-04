import { describe, it, expect, vi, beforeEach } from 'vitest';

function mockDocSnap(data: Record<string, any> | null, id = 'test-id') {
  return { exists: () => data !== null, id, data: () => data };
}
function mockQuerySnap(docs: Array<{ id: string; data: Record<string, any> }>) {
  return { empty: docs.length === 0, size: docs.length, docs: docs.map(d => ({ id: d.id, data: () => d.data })) };
}
function mockTimestamp(date = new Date()) {
  return { toDate: () => date, toMillis: () => date.getTime() };
}

const mocks = vi.hoisted(() => ({
  collection: vi.fn(() => ({ _col: true })),
  doc: vi.fn(() => ({ id: 'auto-id' })),
  getDocs: vi.fn(),
  getDoc: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  Timestamp: { now: vi.fn(() => ({ toDate: () => new Date(), toMillis: () => Date.now() })), fromDate: vi.fn() },
  onSnapshot: vi.fn(),
  limit: vi.fn(),
  runTransaction: vi.fn(),
}));

vi.mock('firebase/firestore', () => mocks);
vi.mock('../../src/lib/firebase/config', () => ({ db: {} }));

import { openCashRegister, closeCashRegister } from '../../src/lib/firebase/services/cashRegisterService';

describe('cashRegisterService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDocs.mockResolvedValue(mockQuerySnap([]));
    mocks.addDoc.mockResolvedValue({ id: 'session-1' });
  });

  describe('openCashRegister', () => {
    it('cree une session avec les bonnes valeurs par defaut', async () => {
      const result = await openCashRegister({
        openedBy: 'user-1', openedByName: 'John', openingAmount: 50000, notes: 'Matin',
      });

      expect(mocks.addDoc).toHaveBeenCalledTimes(1);
      expect(mocks.addDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        openingAmount: 50000, closingAmount: 0, expectedAmount: 50000,
        difference: 0, salesTotal: 0, salesCount: 0, status: 'open',
      }));
      expect(result.id).toBe('session-1');
      expect(result.status).toBe('open');
    });

    it('erreur si une session est deja ouverte', async () => {
      mocks.getDocs.mockResolvedValueOnce(mockQuerySnap([
        { id: 'existing', data: { status: 'open', openedBy: 'user-2' } },
      ]));

      await expect(openCashRegister({
        openedBy: 'user-1', openedByName: 'John', openingAmount: 50000, notes: '',
      })).rejects.toThrow('déjà ouverte');
    });
  });

  describe('closeCashRegister', () => {
    it('calcule expectedAmount et difference correctement', async () => {
      const openedAt = mockTimestamp(new Date('2026-04-01T08:00:00'));

      let callCount = 0;
      mocks.runTransaction.mockImplementation(async (_db: any, cb: any) => {
        callCount++;
        const tx = { get: vi.fn(), set: vi.fn(), update: vi.fn() };

        if (callCount === 1) {
          tx.get.mockResolvedValue(mockDocSnap({
            openedBy: 'user-1', openedByName: 'John', openingAmount: 50000,
            closingAmount: 0, expectedAmount: 50000, difference: 0,
            salesTotal: 0, salesCount: 0, status: 'open', openedAt, notes: 'Matin',
          }, 'session-1'));
          return cb(tx);
        }
        if (callCount === 2) {
          tx.get.mockResolvedValue(mockDocSnap({ status: 'open' }, 'session-1'));
          return cb(tx);
        }
      });

      // getDocs is called once for the sales query between the two transactions
      mocks.getDocs.mockResolvedValueOnce(mockQuerySnap([
        { id: 's1', data: { total: 20000 } },
        { id: 's2', data: { total: 10000 } },
      ]));

      const result = await closeCashRegister('session-1', { closingAmount: 78000, notes: 'Fin de journee' });

      expect(result.expectedAmount).toBe(80000); // 50000 + 30000
      expect(result.difference).toBe(-2000); // 78000 - 80000
      expect(result.salesTotal).toBe(30000);
      expect(result.salesCount).toBe(2);
      expect(result.status).toBe('closed');
    });

    it('erreur si session introuvable', async () => {
      mocks.runTransaction.mockImplementation(async (_db: any, cb: any) => {
        const tx = { get: vi.fn().mockResolvedValue(mockDocSnap(null)), set: vi.fn(), update: vi.fn() };
        return cb(tx);
      });

      await expect(closeCashRegister('x', { closingAmount: 50000, notes: '' })).rejects.toThrow('introuvable');
    });

    it('erreur si session deja fermee', async () => {
      mocks.runTransaction.mockImplementation(async (_db: any, cb: any) => {
        const tx = { get: vi.fn().mockResolvedValue(mockDocSnap({ status: 'closed', openedBy: 'u1', openingAmount: 50000, openedAt: mockTimestamp() })), set: vi.fn(), update: vi.fn() };
        return cb(tx);
      });

      await expect(closeCashRegister('s1', { closingAmount: 50000, notes: '' })).rejects.toThrow('déjà fermée');
    });
  });
});
