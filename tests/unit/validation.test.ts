import { describe, it, expect } from 'vitest';

/**
 * Pure validation functions extracted from component logic.
 * These mirror the validation rules found in:
 *   - src/pages/Products.tsx handleSubmit
 *   - src/pages/POS.tsx handlePayment
 */

// --- Product validation ---

interface ProductFormData {
  name: string;
  prixAchat: number;
  prixDetail: number;
  prixMaison: number;
  quantity: number;
  minStock: number;
}

interface ProductValidationError {
  field: string;
  message: string;
}

function validateProduct(data: ProductFormData): ProductValidationError[] {
  const errors: ProductValidationError[] = [];

  if (!data.name || data.name.trim() === '') {
    errors.push({ field: 'name', message: 'Le nom du produit est requis' });
  }

  if (data.prixAchat < 0) {
    errors.push({ field: 'prixAchat', message: 'Le prix d\'achat doit être >= 0' });
  }

  if (data.prixDetail < 0) {
    errors.push({ field: 'prixDetail', message: 'Le prix détail doit être >= 0' });
  }

  if (data.prixMaison < 0) {
    errors.push({ field: 'prixMaison', message: 'Le prix maison doit être >= 0' });
  }

  if (data.prixDetail < data.prixAchat) {
    errors.push({ field: 'prixDetail', message: 'Le prix détail doit être >= prix d\'achat' });
  }

  if (data.prixMaison < data.prixAchat) {
    errors.push({ field: 'prixMaison', message: 'Le prix maison doit être >= prix d\'achat' });
  }

  if (data.quantity < 0) {
    errors.push({ field: 'quantity', message: 'La quantité doit être >= 0' });
  }

  if (data.minStock < 0) {
    errors.push({ field: 'minStock', message: 'Le stock minimum doit être >= 0' });
  }

  return errors;
}

// --- POS validation ---

interface PaymentData {
  total: number;
  paymentMethod: 'cash' | 'mobile' | 'card';
  amountReceived: number;
}

interface PaymentValidationError {
  field: string;
  message: string;
}

function validatePayment(data: PaymentData): PaymentValidationError[] {
  const errors: PaymentValidationError[] = [];

  if (data.total <= 0) {
    errors.push({ field: 'total', message: 'Le total doit être supérieur à 0' });
  }

  if (data.paymentMethod === 'cash') {
    if (data.amountReceived <= 0) {
      errors.push({ field: 'amountReceived', message: 'Le montant reçu doit être supérieur à 0' });
    }
    if (data.amountReceived > 0 && data.amountReceived < data.total) {
      errors.push({ field: 'amountReceived', message: 'Le montant reçu doit être >= total' });
    }
  }

  return errors;
}

// --- Tests ---

describe('Product validation', () => {
  const validProduct: ProductFormData = {
    name: 'Savon Palmolive',
    prixAchat: 200,
    prixDetail: 350,
    prixMaison: 300,
    quantity: 50,
    minStock: 10,
  };

  it('returns no errors for a valid product', () => {
    expect(validateProduct(validProduct)).toEqual([]);
  });

  it('requires a non-empty product name', () => {
    const errors = validateProduct({ ...validProduct, name: '' });
    expect(errors.some(e => e.field === 'name')).toBe(true);
  });

  it('requires a non-empty product name (whitespace only)', () => {
    const errors = validateProduct({ ...validProduct, name: '   ' });
    expect(errors.some(e => e.field === 'name')).toBe(true);
  });

  it('rejects negative prixAchat', () => {
    const errors = validateProduct({ ...validProduct, prixAchat: -1 });
    expect(errors.some(e => e.field === 'prixAchat')).toBe(true);
  });

  it('rejects negative prixDetail', () => {
    const errors = validateProduct({ ...validProduct, prixDetail: -5 });
    expect(errors.some(e => e.field === 'prixDetail')).toBe(true);
  });

  it('rejects negative prixMaison', () => {
    const errors = validateProduct({ ...validProduct, prixMaison: -1 });
    expect(errors.some(e => e.field === 'prixMaison')).toBe(true);
  });

  it('rejects prixDetail lower than prixAchat', () => {
    const errors = validateProduct({ ...validProduct, prixAchat: 500, prixDetail: 300 });
    expect(errors.some(e => e.field === 'prixDetail' && e.message.includes('prix d\'achat'))).toBe(true);
  });

  it('rejects prixMaison lower than prixAchat', () => {
    const errors = validateProduct({ ...validProduct, prixAchat: 500, prixMaison: 300 });
    expect(errors.some(e => e.field === 'prixMaison' && e.message.includes('prix d\'achat'))).toBe(true);
  });

  it('accepts prixDetail equal to prixAchat', () => {
    const errors = validateProduct({ ...validProduct, prixAchat: 300, prixDetail: 300, prixMaison: 300 });
    expect(errors).toEqual([]);
  });

  it('rejects negative quantity', () => {
    const errors = validateProduct({ ...validProduct, quantity: -1 });
    expect(errors.some(e => e.field === 'quantity')).toBe(true);
  });

  it('accepts zero quantity', () => {
    const errors = validateProduct({ ...validProduct, quantity: 0 });
    expect(errors.some(e => e.field === 'quantity')).toBe(false);
  });

  it('rejects negative minStock', () => {
    const errors = validateProduct({ ...validProduct, minStock: -1 });
    expect(errors.some(e => e.field === 'minStock')).toBe(true);
  });

  it('accepts zero minStock', () => {
    const errors = validateProduct({ ...validProduct, minStock: 0 });
    expect(errors.some(e => e.field === 'minStock')).toBe(false);
  });

  it('accepts all prices at 0', () => {
    const errors = validateProduct({
      ...validProduct,
      prixAchat: 0,
      prixDetail: 0,
      prixMaison: 0,
    });
    expect(errors).toEqual([]);
  });
});

describe('POS payment validation', () => {
  it('rejects total of 0', () => {
    const errors = validatePayment({ total: 0, paymentMethod: 'cash', amountReceived: 0 });
    expect(errors.some(e => e.field === 'total')).toBe(true);
  });

  it('rejects negative total', () => {
    const errors = validatePayment({ total: -100, paymentMethod: 'cash', amountReceived: 0 });
    expect(errors.some(e => e.field === 'total')).toBe(true);
  });

  it('requires amountReceived > 0 for cash payments', () => {
    const errors = validatePayment({ total: 1000, paymentMethod: 'cash', amountReceived: 0 });
    expect(errors.some(e => e.field === 'amountReceived')).toBe(true);
  });

  it('rejects amountReceived less than total for cash payments', () => {
    const errors = validatePayment({ total: 1000, paymentMethod: 'cash', amountReceived: 500 });
    expect(errors.some(e => e.field === 'amountReceived' && e.message.includes('total'))).toBe(true);
  });

  it('accepts amountReceived equal to total for cash payments', () => {
    const errors = validatePayment({ total: 1000, paymentMethod: 'cash', amountReceived: 1000 });
    expect(errors.some(e => e.field === 'amountReceived')).toBe(false);
  });

  it('accepts amountReceived greater than total for cash payments (change due)', () => {
    const errors = validatePayment({ total: 1000, paymentMethod: 'cash', amountReceived: 2000 });
    expect(errors.some(e => e.field === 'amountReceived')).toBe(false);
  });

  it('does not require amountReceived for mobile payments', () => {
    const errors = validatePayment({ total: 1000, paymentMethod: 'mobile', amountReceived: 0 });
    expect(errors.some(e => e.field === 'amountReceived')).toBe(false);
  });

  it('does not require amountReceived for card payments', () => {
    const errors = validatePayment({ total: 1000, paymentMethod: 'card', amountReceived: 0 });
    expect(errors.some(e => e.field === 'amountReceived')).toBe(false);
  });
});
