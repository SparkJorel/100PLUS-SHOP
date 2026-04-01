import { useEffect, useState } from 'react';
import {
  ShoppingCart,
  Package,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui';
import { formatCurrency } from '../lib/utils';
import { getDashboardStats, getSalesChartData } from '../lib/firebase/services/statsService';
import { getRecentSales, getLowStockProducts } from '../lib/firebase/services';
import type { Sale } from '../types';

interface DashboardStats {
  todaySalesCount: number;
  todaySalesTotal: number;
  monthSalesCount: number;
  monthSalesTotal: number;
  totalProducts: number;
  lowStockCount: number;
}

interface LowStockProduct {
  id: string;
  name: string;
  code: string;
  quantity: number;
  minStock: number;
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [chartData, setChartData] = useState<{ date: string; total: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [statsData, salesData, lowStock, chart] = await Promise.all([
          getDashboardStats(),
          getRecentSales(5),
          getLowStockProducts(),
          getSalesChartData(7),
        ]);

        setStats(statsData);
        setRecentSales(salesData);
        setLowStockProducts(lowStock);
        setChartData(chart);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const maxChartValue = Math.max(...chartData.map((d) => d.total), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-500">Vue d'ensemble de votre boutique</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Ventes du jour</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.todaySalesCount || 0}</p>
                <p className="text-sm text-gray-500">
                  {formatCurrency(stats?.todaySalesTotal || 0)}
                </p>
              </div>
              <div className="h-12 w-12 bg-primary-50 rounded-full flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">CA du mois</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stats?.monthSalesTotal || 0)}
                </p>
                <p className="text-sm text-gray-500">{stats?.monthSalesCount || 0} ventes</p>
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
                <p className="text-sm font-medium text-gray-500">Articles en stock</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalProducts || 0}</p>
                <p className="text-sm text-gray-500">Unités disponibles</p>
              </div>
              <div className="h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Alertes stock</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.lowStockCount || 0}</p>
                <p className="text-sm text-gray-500">Produits en rupture</p>
              </div>
              <div className="h-12 w-12 bg-red-50 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Ventes de la semaine</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between gap-2">
              {chartData.map((day, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-primary rounded-t transition-all duration-300 hover:bg-primary-600"
                    style={{
                      height: `${(day.total / maxChartValue) * 100}%`,
                      minHeight: day.total > 0 ? '8px' : '2px',
                    }}
                  />
                  <span className="text-xs text-gray-500 mt-2">{day.date}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Alertes de stock</CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockProducts.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Aucune alerte de stock</p>
            ) : (
              <div className="space-y-3">
                {lowStockProducts.slice(0, 5).map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-500">{product.code}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-red-600">{product.quantity} restants</p>
                      <p className="text-xs text-gray-500">Min: {product.minStock}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Sales */}
      <Card>
        <CardHeader>
          <CardTitle>Dernières ventes</CardTitle>
        </CardHeader>
        <CardContent>
          {recentSales.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Aucune vente récente</p>
          ) : (
            <div className="space-y-3">
              {recentSales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-primary-50 rounded-full flex items-center justify-center">
                      <ShoppingCart className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{sale.saleNumber}</p>
                      <p className="text-sm text-gray-500">
                        {sale.customerName || 'Client Lambda'} • {sale.items.length} article(s)
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{formatCurrency(sale.total)}</p>
                    <p className="text-sm text-gray-500">
                      {sale.createdAt.toDate().toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default Dashboard;
