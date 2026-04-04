import { describe, it, expect, vi } from 'vitest';
import {
  formatPrice,
  formatCurrency,
  formatNumber,
  formatDate,
  formatRelativeDate,
  generateSaleNumber,
  generateProductCode,
} from '../../src/lib/utils/formatters';

// Mock firebase/firestore to avoid importing the real SDK
vi.mock('firebase/firestore', () => ({
  Timestamp: class MockTimestamp {
    toDate() {
      return new Date();
    }
    static now() {
      return new MockTimestamp();
    }
  },
}));

describe('formatPrice', () => {
  it('formats 0 as "0 FCFA"', () => {
    expect(formatPrice(0)).toBe('0 FCFA');
  });

  it('formats positive numbers with French locale separators', () => {
    const result = formatPrice(1500);
    expect(result).toContain('FCFA');
    // French locale uses non-breaking space or narrow no-break space as thousands separator
    expect(result).toMatch(/1[\s\u202f\u00a0]500 FCFA/);
  });

  it('formats large numbers correctly', () => {
    const result = formatPrice(1000000);
    expect(result).toContain('FCFA');
    expect(result).toMatch(/1[\s\u202f\u00a0]000[\s\u202f\u00a0]000 FCFA/);
  });

  it('rounds decimals to whole numbers', () => {
    const result = formatPrice(99.99);
    expect(result).toBe('100 FCFA');
  });
});

describe('formatCurrency', () => {
  it('is an alias for formatPrice and produces the same output', () => {
    expect(formatCurrency(0)).toBe(formatPrice(0));
    expect(formatCurrency(5000)).toBe(formatPrice(5000));
  });

  it('includes FCFA suffix', () => {
    expect(formatCurrency(250)).toContain('FCFA');
  });
});

describe('formatNumber', () => {
  it('formats numbers with French locale separators', () => {
    const result = formatNumber(1234567);
    // Should contain thousands separators
    expect(result).toMatch(/1[\s\u202f\u00a0]234[\s\u202f\u00a0]567/);
  });

  it('formats 0', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('formats small numbers without separators', () => {
    expect(formatNumber(42)).toBe('42');
  });
});

describe('formatDate', () => {
  it('formats a Date object with default format dd/MM/yyyy', () => {
    const date = new Date('2026-01-15T10:30:00');
    expect(formatDate(date)).toBe('15/01/2026');
  });

  it('formats a Date object with a custom format string', () => {
    const date = new Date('2026-01-15T10:30:00');
    expect(formatDate(date, 'dd/MM/yyyy HH:mm')).toBe('15/01/2026 10:30');
  });

  it('formats a Firestore Timestamp by calling toDate()', async () => {
    const { Timestamp } = await import('firebase/firestore');
    const ts = Object.create(Timestamp.prototype);
    ts.toDate = () => new Date('2026-01-15T10:30:00');
    const result = formatDate(ts);
    expect(result).toBe('15/01/2026');
  });
});

describe('formatRelativeDate', () => {
  it('returns "Aujourd\'hui" for today', () => {
    const now = new Date();
    expect(formatRelativeDate(now)).toBe("Aujourd'hui");
  });

  it('returns "Hier" for yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(formatRelativeDate(yesterday)).toBe('Hier');
  });

  it('returns "Il y a X jours" for 2-6 days ago', () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    expect(formatRelativeDate(threeDaysAgo)).toBe('Il y a 3 jours');
  });

  it('falls back to formatted date for 7+ days ago', () => {
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const result = formatRelativeDate(tenDaysAgo);
    // Should be a date string like dd/MM/yyyy, not a relative phrase
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it('handles a Firestore Timestamp mock', async () => {
    const { Timestamp } = await import('firebase/firestore');
    const ts = Object.create(Timestamp.prototype);
    ts.toDate = () => new Date();
    expect(formatRelativeDate(ts)).toBe("Aujourd'hui");
  });
});

describe('generateSaleNumber', () => {
  it('returns format VNT-YYYYMMDD-XXX', () => {
    const result = generateSaleNumber(0);
    expect(result).toMatch(/^VNT-\d{8}-\d{3}$/);
  });

  it('pads the count to 3 digits', () => {
    const result = generateSaleNumber(0);
    expect(result).toMatch(/-001$/);
  });

  it('increments the count by 1', () => {
    expect(generateSaleNumber(4)).toMatch(/-005$/);
    expect(generateSaleNumber(99)).toMatch(/-100$/);
  });

  it('uses today\'s date', () => {
    const today = new Date();
    const yyyy = today.getFullYear().toString();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const expected = `VNT-${yyyy}${mm}${dd}`;
    expect(generateSaleNumber(0)).toContain(expected);
  });
});

describe('generateProductCode', () => {
  it('returns format PRD-XXXX with 4 alphanumeric characters', () => {
    const result = generateProductCode();
    expect(result).toMatch(/^PRD-[A-Z0-9]{4}$/);
  });

  it('generates different codes on subsequent calls (randomness)', () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateProductCode()));
    // With 36^4 = 1,679,616 possibilities, 20 calls should very likely be unique
    expect(codes.size).toBeGreaterThan(1);
  });
});
