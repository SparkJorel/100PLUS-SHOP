import { vi } from 'vitest';

// Mock Firestore document snapshot
export function mockDocSnap(data: Record<string, any> | null, id = 'test-id') {
  return {
    exists: () => data !== null,
    id,
    data: () => data,
  };
}

// Mock query snapshot
export function mockQuerySnap(docs: Array<{ id: string; data: Record<string, any> }>) {
  return {
    empty: docs.length === 0,
    size: docs.length,
    docs: docs.map(d => ({ id: d.id, data: () => d.data, ...d })),
  };
}

// Mock Timestamp
export function mockTimestamp(date = new Date()) {
  return {
    toDate: () => date,
    toMillis: () => date.getTime(),
  };
}

// Create standard Firestore mocks
export function createFirestoreMocks() {
  return {
    collection: vi.fn((_db: any, path: string) => ({ _path: path })),
    doc: vi.fn((...args: any[]) => {
      // doc(db, collection, id) or doc(collectionRef)
      const id = args.length >= 3 ? args[2] : `auto-id-${Math.random().toString(36).slice(2, 8)}`;
      return { _path: args[1] || 'unknown', id };
    }),
    getDocs: vi.fn(),
    getDoc: vi.fn(),
    addDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    setDoc: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    onSnapshot: vi.fn(),
    runTransaction: vi.fn(),
    increment: vi.fn((n: number) => ({ __increment: n })),
    Timestamp: {
      now: vi.fn(() => mockTimestamp()),
      fromDate: vi.fn((d: Date) => mockTimestamp(d)),
    },
  };
}
