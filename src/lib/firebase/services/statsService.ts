import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config';
import type { Sale, Product } from '../../../types';

const SALES_COLLECTION = 'sales';
const PRODUCTS_COLLECTION = 'products';

export interface DashboardStats {
  todaySalesCount: number;
  todaySalesTotal: number;
  monthSalesCount: number;
  monthSalesTotal: number;
  totalProducts: number;
  lowStockCount: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTimestamp = Timestamp.fromDate(today);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthStartTimestamp = Timestamp.fromDate(monthStart);

  // Only fetch this month's sales instead of ALL sales
  const monthSalesQuery = query(
    collection(db, SALES_COLLECTION),
    where('createdAt', '>=', monthStartTimestamp),
    orderBy('createdAt', 'desc')
  );
  const monthSalesSnapshot = await getDocs(monthSalesQuery);
  const monthAllSales = monthSalesSnapshot.docs
    .map(doc => doc.data() as Sale)
    .filter(sale => sale.status === 'completed');

  // Filter today's sales from month sales (already in memory)
  const todaySales = monthAllSales.filter(sale =>
    sale.createdAt.toMillis() >= todayTimestamp.toMillis()
  );

  // Get products
  const productsQuery = query(
    collection(db, PRODUCTS_COLLECTION),
    where('isActive', '==', true)
  );
  const productsSnapshot = await getDocs(productsQuery);
  const products = productsSnapshot.docs.map(doc => doc.data() as Product);

  const lowStockCount = products.filter(p => p.quantity <= p.minStock).length;

  return {
    todaySalesCount: todaySales.length,
    todaySalesTotal: todaySales.reduce((sum, sale) => sum + sale.total, 0),
    monthSalesCount: monthAllSales.length,
    monthSalesTotal: monthAllSales.reduce((sum, sale) => sum + sale.total, 0),
    totalProducts: products.reduce((sum, p) => sum + p.quantity, 0),
    lowStockCount,
  };
}

export async function getSalesChartData(days: number = 7): Promise<{ date: string; total: number }[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - days + 1);
  const startTimestamp = Timestamp.fromDate(startDate);

  // Only fetch sales within the date range
  const salesQuery = query(
    collection(db, SALES_COLLECTION),
    where('createdAt', '>=', startTimestamp),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(salesQuery);
  const relevantSales = snapshot.docs
    .map(doc => doc.data() as Sale)
    .filter(sale => sale.status === 'completed');

  const data: { date: string; total: number }[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const dateStart = date.getTime();
    const dateEnd = nextDate.getTime();

    const daySales = relevantSales.filter(sale => {
      const saleTime = sale.createdAt.toMillis();
      return saleTime >= dateStart && saleTime < dateEnd;
    });

    const total = daySales.reduce((sum, sale) => sum + (sale.total || 0), 0);

    data.push({
      date: date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
      total,
    });
  }

  return data;
}
