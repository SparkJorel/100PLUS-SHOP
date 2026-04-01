import { useEffect, useState } from 'react';
import { Calendar, TrendingUp, Package, Users, ShoppingCart, DollarSign } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Input, Badge } from '../components/ui';
import { formatCurrency } from '../lib/utils';
import { getSalesByDate, getProducts, getCustomers } from '../lib/firebase/services';
import type { Product, Customer } from '../types';

interface ReportData {
  totalSales: number;
  totalRevenue: number;
  totalProfit: number;
  averageTicket: number;
  topProducts: { name: string; quantity: number; revenue: number }[];
  salesByPayment: { method: string; count: number; total: number }[];
  salesByCustomerType: { type: string; count: number; total: number }[];
}

export function Reports() {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1); // First day of month
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadReportData();
  }, [startDate, endDate]);

  async function loadReportData() {
    setIsLoading(true);
    try {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const [salesData, productsData, customersData] = await Promise.all([
        getSalesByDate(start, end),
        getProducts(),
        getCustomers(),
      ]);

      setProducts(productsData);
      setCustomers(customersData);

      // Filter completed sales
      const completedSales = salesData.filter((s) => s.status === 'completed');

      // Calculate stats
      const totalRevenue = completedSales.reduce((sum, s) => sum + s.total, 0);

      // Calculate profit (revenue - cost)
      let totalCost = 0;
      const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};

      completedSales.forEach((sale) => {
        sale.items.forEach((item) => {
          const product = productsData.find((p) => p.id === item.productId);
          if (product) {
            totalCost += product.prixAchat * item.quantity;
          }

          if (!productSales[item.productId]) {
            productSales[item.productId] = {
              name: item.productName,
              quantity: 0,
              revenue: 0,
            };
          }
          productSales[item.productId].quantity += item.quantity;
          productSales[item.productId].revenue += item.total;
        });
      });

      // Sales by payment method
      const paymentStats: Record<string, { count: number; total: number }> = {};
      completedSales.forEach((sale) => {
        if (!paymentStats[sale.paymentMethod]) {
          paymentStats[sale.paymentMethod] = { count: 0, total: 0 };
        }
        paymentStats[sale.paymentMethod].count++;
        paymentStats[sale.paymentMethod].total += sale.total;
      });

      // Sales by customer type
      const customerTypeStats: Record<string, { count: number; total: number }> = {
        maison: { count: 0, total: 0 },
        lambda: { count: 0, total: 0 },
      };
      completedSales.forEach((sale) => {
        customerTypeStats[sale.customerType].count++;
        customerTypeStats[sale.customerType].total += sale.total;
      });

      const topProducts = Object.values(productSales)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      setReportData({
        totalSales: completedSales.length,
        totalRevenue,
        totalProfit: totalRevenue - totalCost,
        averageTicket: completedSales.length > 0 ? totalRevenue / completedSales.length : 0,
        topProducts,
        salesByPayment: Object.entries(paymentStats).map(([method, data]) => ({
          method:
            method === 'cash'
              ? 'Espèces'
              : method === 'card'
              ? 'Carte'
              : 'Mobile Money',
          count: data.count,
          total: data.total,
        })),
        salesByCustomerType: [
          { type: 'Clients Maison', count: customerTypeStats.maison.count, total: customerTypeStats.maison.total },
          { type: 'Clients Lambda', count: customerTypeStats.lambda.count, total: customerTypeStats.lambda.total },
        ],
      });
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  // Quick date filters
  const setToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(today);
  };

  const setThisWeek = () => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    setStartDate(monday.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  };

  const setThisMonth = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Calculate stock value
  const stockValue = products.reduce((sum, p) => sum + p.quantity * p.prixAchat, 0);
  const stockRetailValue = products.reduce((sum, p) => sum + p.quantity * p.prixDetail, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rapports</h1>
        <p className="text-gray-500">Analyse des performances de la boutique</p>
      </div>

      {/* Date Filters */}
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">Période :</span>
          </div>
          <div className="flex gap-2">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-40"
            />
            <span className="self-center text-gray-400">à</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={setToday} className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200">
              Aujourd'hui
            </button>
            <button onClick={setThisWeek} className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200">
              Cette semaine
            </button>
            <button onClick={setThisMonth} className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200">
              Ce mois
            </button>
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Chiffre d'affaires</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(reportData?.totalRevenue || 0)}
                </p>
                <p className="text-sm text-gray-500">
                  {reportData?.totalSales || 0} ventes
                </p>
              </div>
              <div className="h-12 w-12 bg-primary-50 rounded-full flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Bénéfice brut</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(reportData?.totalProfit || 0)}
                </p>
                <p className="text-sm text-gray-500">
                  Marge: {reportData?.totalRevenue ? ((reportData.totalProfit / reportData.totalRevenue) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <div className="h-12 w-12 bg-green-50 rounded-full flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Panier moyen</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(reportData?.averageTicket || 0)}
                </p>
                <p className="text-sm text-gray-500">par vente</p>
              </div>
              <div className="h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Valeur du stock</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stockValue)}</p>
                <p className="text-sm text-gray-500">
                  Détail: {formatCurrency(stockRetailValue)}
                </p>
              </div>
              <div className="h-12 w-12 bg-orange-50 rounded-full flex items-center justify-center">
                <Package className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Produits les plus vendus</CardTitle>
          </CardHeader>
          <CardContent>
            {reportData?.topProducts.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Aucune donnée</p>
            ) : (
              <div className="space-y-3">
                {reportData?.topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-gray-500">{product.quantity} vendus</p>
                      </div>
                    </div>
                    <p className="font-bold text-primary">{formatCurrency(product.revenue)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sales by Payment */}
        <Card>
          <CardHeader>
            <CardTitle>Ventes par mode de paiement</CardTitle>
          </CardHeader>
          <CardContent>
            {reportData?.salesByPayment.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Aucune donnée</p>
            ) : (
              <div className="space-y-3">
                {reportData?.salesByPayment.map((payment, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{payment.method}</p>
                      <p className="text-sm text-gray-500">{payment.count} ventes</p>
                    </div>
                    <p className="font-bold">{formatCurrency(payment.total)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Customer Type Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Ventes par type de client</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reportData?.salesByCustomerType.map((stat, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">{stat.type}</p>
                  <Badge variant={stat.type.includes('Maison') ? 'info' : 'default'}>
                    {stat.count} ventes
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-primary">{formatCurrency(stat.total)}</p>
                <p className="text-sm text-gray-500">
                  {reportData.totalRevenue > 0
                    ? ((stat.total / reportData.totalRevenue) * 100).toFixed(1)
                    : 0}% du CA
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <Package className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-3xl font-bold">{products.length}</p>
            <p className="text-gray-500">Produits actifs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Users className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-3xl font-bold">{customers.length}</p>
            <p className="text-gray-500">Clients maison</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <ShoppingCart className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-3xl font-bold">
              {products.reduce((sum, p) => sum + p.quantity, 0)}
            </p>
            <p className="text-gray-500">Articles en stock</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Reports;
