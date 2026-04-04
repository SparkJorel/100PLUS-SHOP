import { describe, it, expect, vi, beforeEach } from 'vitest';

function mockDocSnap(data: Record<string, any> | null, id = 'test-id') {
  return { exists: () => data !== null, id, data: () => data };
}

const mocks = vi.hoisted(() => ({
  collection: vi.fn(() => ({ _col: true })),
  doc: vi.fn(() => ({ id: 'auto-id-' + Math.random().toString(36).slice(2, 8) })),
  getDocs: vi.fn(),
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

import { createStockMovement } from '../../src/lib/firebase/services/stockService';

describe('stockService - createStockMovement', () => {
  beforeEach(() => vi.clearAllMocks());

  it('type "in": ajoute la quantite au stock', async () => {
    mocks.runTransaction.mockImplementation(async (_db: any, cb: any) => {
      const tx = {
        get: vi.fn().mockResolvedValue(mockDocSnap({ quantity: 20, name: 'Shirt', code: 'P001' })),
        set: vi.fn(), update: vi.fn(),
      };
      return cb(tx);
    });

    await createStockMovement({ productId: 'p1', type: 'in', quantity: 10, reason: 'Restock', createdBy: 'u1', createdByName: 'John' });

    // Replay to verify
    const cb = mocks.runTransaction.mock.calls[0][1];
    const tx = { get: vi.fn().mockResolvedValue(mockDocSnap({ quantity: 20, name: 'Shirt', code: 'P001' })), set: vi.fn(), update: vi.fn() };
    await cb(tx);

    expect(tx.update).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ quantity: 30 }));
    expect(tx.set).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ previousQuantity: 20, newQuantity: 30, type: 'in' }));
  });

  it('type "out": soustrait la quantite', async () => {
    mocks.runTransaction.mockImplementation(async (_db: any, cb: any) => {
      const tx = { get: vi.fn().mockResolvedValue(mockDocSnap({ quantity: 20, name: 'Shirt', code: 'P001' })), set: vi.fn(), update: vi.fn() };
      return cb(tx);
    });

    await createStockMovement({ productId: 'p1', type: 'out', quantity: 5, reason: 'Vente', createdBy: 'u1', createdByName: 'John' });

    const cb = mocks.runTransaction.mock.calls[0][1];
    const tx = { get: vi.fn().mockResolvedValue(mockDocSnap({ quantity: 20, name: 'Shirt', code: 'P001' })), set: vi.fn(), update: vi.fn() };
    await cb(tx);

    expect(tx.update).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ quantity: 15 }));
  });

  it('type "out": erreur si stock insuffisant', async () => {
    mocks.runTransaction.mockImplementation(async (_db: any, cb: any) => {
      const tx = { get: vi.fn().mockResolvedValue(mockDocSnap({ quantity: 3, name: 'Shirt', code: 'P001' })), set: vi.fn(), update: vi.fn() };
      return cb(tx);
    });

    await expect(
      createStockMovement({ productId: 'p1', type: 'out', quantity: 10, reason: 'Vente', createdBy: 'u1', createdByName: 'John' })
    ).rejects.toThrow('Stock insuffisant');
  });

  it('type "adjustment": fixe la quantite absolue', async () => {
    mocks.runTransaction.mockImplementation(async (_db: any, cb: any) => {
      const tx = { get: vi.fn().mockResolvedValue(mockDocSnap({ quantity: 20, name: 'Shirt', code: 'P001' })), set: vi.fn(), update: vi.fn() };
      return cb(tx);
    });

    await createStockMovement({ productId: 'p1', type: 'adjustment', quantity: 50, reason: 'Inventaire', createdBy: 'u1', createdByName: 'John' });

    const cb = mocks.runTransaction.mock.calls[0][1];
    const tx = { get: vi.fn().mockResolvedValue(mockDocSnap({ quantity: 20, name: 'Shirt', code: 'P001' })), set: vi.fn(), update: vi.fn() };
    await cb(tx);

    expect(tx.update).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ quantity: 50 }));
  });

  it('erreur si produit inexistant', async () => {
    mocks.runTransaction.mockImplementation(async (_db: any, cb: any) => {
      const tx = { get: vi.fn().mockResolvedValue(mockDocSnap(null)), set: vi.fn(), update: vi.fn() };
      return cb(tx);
    });

    await expect(
      createStockMovement({ productId: 'p1', type: 'in', quantity: 5, reason: 'Test', createdBy: 'u1', createdByName: 'John' })
    ).rejects.toThrow('introuvable');
  });

  it('toutes les operations sont atomiques (runTransaction)', async () => {
    mocks.runTransaction.mockImplementation(async (_db: any, cb: any) => {
      const tx = { get: vi.fn().mockResolvedValue(mockDocSnap({ quantity: 10, name: 'Shirt', code: 'P001' })), set: vi.fn(), update: vi.fn() };
      return cb(tx);
    });

    await createStockMovement({ productId: 'p1', type: 'in', quantity: 5, reason: 'Test', createdBy: 'u1', createdByName: 'John' });

    expect(mocks.runTransaction).toHaveBeenCalledTimes(1);
  });
});
