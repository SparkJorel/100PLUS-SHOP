import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';

/**
 * Formater un prix en FCFA
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount) + ' FCFA';
}

/**
 * Formater un nombre
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('fr-FR').format(num);
}

/**
 * Formater une date
 */
export function formatDate(date: Date | Timestamp, formatStr: string = 'dd/MM/yyyy'): string {
  const d = date instanceof Timestamp ? date.toDate() : date;
  return format(d, formatStr, { locale: fr });
}

/**
 * Formater une date et heure
 */
export function formatDateTime(date: Date | Timestamp): string {
  return formatDate(date, 'dd/MM/yyyy HH:mm');
}

/**
 * Formater une date relative (aujourd'hui, hier, etc.)
 */
export function formatRelativeDate(date: Date | Timestamp): string {
  const d = date instanceof Timestamp ? date.toDate() : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days} jours`;
  return formatDate(d);
}

/**
 * Générer un numéro de vente
 * Format: VNT-YYYYMMDD-XXX
 */
export function generateSaleNumber(count: number): string {
  const date = format(new Date(), 'yyyyMMdd');
  const num = String(count + 1).padStart(3, '0');
  return `VNT-${date}-${num}`;
}

/**
 * Générer un code produit
 * Format: PRD-XXXX
 */
export function generateProductCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'PRD-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
