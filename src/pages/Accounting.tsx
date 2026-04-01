import { useEffect, useState } from 'react';
import { Calendar, TrendingUp, TrendingDown, DollarSign, Download, FileText } from 'lucide-react';
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Badge } from '../components/ui';
import { formatCurrency } from '../lib/utils';
import { getSalesByDate, getProducts } from '../lib/firebase/services';
import { getExpensesByDateRange, getExpenseSummaryByCategory } from '../lib/firebase/services';
import { getTotalPendingCredits } from '../lib/firebase/services';
import type { Sale, Product } from '../types';
import type { Expense } from '../types';
import { EXPENSE_CATEGORY_LABELS } from '../types/accounting';

interface ProfitLossData {
  // Revenus
  grossRevenue: number;
  salesCount: number;
  discountsTotal: number;
  netRevenue: number;

  // Coût des marchandises
  costOfGoods: number;
  grossProfit: number;
  grossMargin: number;

  // Dépenses par catégorie
  expensesByCategory: { category: string; label: string; total: number; count: number }[];
  totalExpenses: number;

  // Résultat
  netProfit: number;
  netMargin: number;

  // Créances
  pendingCreditsCount: number;
  pendingCreditsTotal: number;

  // Stock
  stockValue: number;
  stockRetailValue: number;
}

export function Accounting() {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<ProfitLossData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  async function loadData() {
    setIsLoading(true);
    try {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const [sales, expenses, expenseSummary, products, pendingCredits] = await Promise.all([
        getSalesByDate(start, end),
        getExpensesByDateRange(start, end),
        getExpenseSummaryByCategory(start, end),
        getProducts(),
        getTotalPendingCredits(),
      ]);

      const completedSales = sales.filter((s: Sale) => s.status === 'completed');

      const grossRevenue = completedSales.reduce((sum: number, s: Sale) => sum + s.subtotal, 0);
      const discountsTotal = completedSales.reduce((sum: number, s: Sale) => sum + s.discount, 0);
      const netRevenue = grossRevenue - discountsTotal;

      // Calculate cost of goods sold
      let costOfGoods = 0;
      completedSales.forEach((sale: Sale) => {
        sale.items.forEach((item) => {
          const product = products.find((p: Product) => p.id === item.productId);
          if (product) {
            costOfGoods += product.prixAchat * item.quantity;
          }
        });
      });

      const grossProfit = netRevenue - costOfGoods;
      const totalExpenses = expenses.reduce((sum: number, e: Expense) => sum + e.amount, 0);
      const netProfit = grossProfit - totalExpenses;

      const stockValue = products.reduce((sum: number, p: Product) => sum + p.quantity * p.prixAchat, 0);
      const stockRetailValue = products.reduce((sum: number, p: Product) => sum + p.quantity * p.prixDetail, 0);

      setData({
        grossRevenue,
        salesCount: completedSales.length,
        discountsTotal,
        netRevenue,
        costOfGoods,
        grossProfit,
        grossMargin: netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0,
        expensesByCategory: expenseSummary,
        totalExpenses,
        netProfit,
        netMargin: netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0,
        pendingCreditsCount: pendingCredits.count,
        pendingCreditsTotal: pendingCredits.totalAmount,
        stockValue,
        stockRetailValue,
      });
    } catch (error) {
      console.error('Error loading accounting data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const setToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(today);
  };

  const setThisMonth = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  };

  const setThisYear = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), 0, 1);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  };

  const exportCSV = () => {
    if (!data) return;

    const rows = [
      ['COMPTE DE RESULTAT - 100PLUS SHOP'],
      [`Période: ${startDate} au ${endDate}`],
      [''],
      ['=== REVENUS ==='],
      ['Chiffre d\'affaires brut', data.grossRevenue.toString()],
      ['Remises accordées', `-${data.discountsTotal}`],
      ['Chiffre d\'affaires net', data.netRevenue.toString()],
      [''],
      ['=== COUT DES MARCHANDISES ==='],
      ['Coût d\'achat des marchandises vendues', data.costOfGoods.toString()],
      ['MARGE BRUTE', data.grossProfit.toString()],
      [''],
      ['=== CHARGES D\'EXPLOITATION ==='],
      ...data.expensesByCategory.map((e) => [e.label, e.total.toString()]),
      ['Total charges', data.totalExpenses.toString()],
      [''],
      ['=== RESULTAT ==='],
      ['BENEFICE NET', data.netProfit.toString()],
      ['Marge nette', `${data.netMargin.toFixed(1)}%`],
      [''],
      ['=== SITUATION ==='],
      ['Valeur du stock (prix achat)', data.stockValue.toString()],
      ['Valeur du stock (prix détail)', data.stockRetailValue.toString()],
      ['Créances clients en cours', data.pendingCreditsTotal.toString()],
    ];

    const csvContent = rows.map((r) => r.join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `comptabilite_100plus_${startDate}_${endDate}.csv`;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comptabilité</h1>
          <p className="text-gray-500">Compte de résultat & situation financière</p>
        </div>
        <Button variant="secondary" onClick={exportCSV} disabled={!data}>
          <Download className="h-4 w-4 mr-2" />
          Exporter CSV
        </Button>
      </div>

      {/* Date Filters */}
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">Période :</span>
          </div>
          <div className="flex gap-2">
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
            <span className="self-center text-gray-400">à</span>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
          </div>
          <div className="flex gap-2">
            <button onClick={setToday} className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200">
              Aujourd'hui
            </button>
            <button onClick={setThisMonth} className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200">
              Ce mois
            </button>
            <button onClick={setThisYear} className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200">
              Cette année
            </button>
          </div>
        </div>
      </Card>

      {data && (
        <>
          {/* Main KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">CA Net</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.netRevenue)}</p>
                    <p className="text-sm text-gray-500">{data.salesCount} ventes</p>
                  </div>
                  <div className="h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Marge brute</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(data.grossProfit)}</p>
                    <p className="text-sm text-gray-500">{data.grossMargin.toFixed(1)}%</p>
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
                    <p className="text-sm font-medium text-gray-500">Total charges</p>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(data.totalExpenses)}</p>
                    <p className="text-sm text-gray-500">{data.expensesByCategory.reduce((s, e) => s + e.count, 0)} dépenses</p>
                  </div>
                  <div className="h-12 w-12 bg-red-50 rounded-full flex items-center justify-center">
                    <TrendingDown className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Bénéfice net</p>
                    <p className={`text-2xl font-bold ${data.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(data.netProfit)}
                    </p>
                    <p className="text-sm text-gray-500">Marge: {data.netMargin.toFixed(1)}%</p>
                  </div>
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center ${data.netProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    <FileText className={`h-6 w-6 ${data.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Compte de résultat détaillé */}
          <Card>
            <CardHeader>
              <CardTitle>Compte de résultat</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {/* Revenus */}
                <div className="bg-blue-50 p-3 rounded-lg mb-2">
                  <p className="font-bold text-blue-800 text-sm mb-2">REVENUS</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Chiffre d'affaires brut ({data.salesCount} ventes)</span>
                      <span className="font-medium">{formatCurrency(data.grossRevenue)}</span>
                    </div>
                    {data.discountsTotal > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Remises accordées</span>
                        <span>-{formatCurrency(data.discountsTotal)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold border-t border-blue-200 pt-1">
                      <span>Chiffre d'affaires net</span>
                      <span>{formatCurrency(data.netRevenue)}</span>
                    </div>
                  </div>
                </div>

                {/* Coût des marchandises */}
                <div className="bg-orange-50 p-3 rounded-lg mb-2">
                  <p className="font-bold text-orange-800 text-sm mb-2">COUT DES MARCHANDISES VENDUES</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Coût d'achat</span>
                      <span className="font-medium text-red-600">-{formatCurrency(data.costOfGoods)}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t border-orange-200 pt-1">
                      <span>MARGE BRUTE</span>
                      <span className={data.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(data.grossProfit)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Charges */}
                <div className="bg-red-50 p-3 rounded-lg mb-2">
                  <p className="font-bold text-red-800 text-sm mb-2">CHARGES D'EXPLOITATION</p>
                  <div className="space-y-1 text-sm">
                    {data.expensesByCategory.map((expense) => (
                      <div key={expense.category} className="flex justify-between">
                        <span>{expense.label} ({expense.count})</span>
                        <span className="text-red-600">-{formatCurrency(expense.total)}</span>
                      </div>
                    ))}
                    {data.expensesByCategory.length === 0 && (
                      <p className="text-gray-500 text-center py-2">Aucune dépense sur la période</p>
                    )}
                    <div className="flex justify-between font-bold border-t border-red-200 pt-1">
                      <span>Total charges</span>
                      <span className="text-red-600">-{formatCurrency(data.totalExpenses)}</span>
                    </div>
                  </div>
                </div>

                {/* Résultat */}
                <div className={`p-4 rounded-lg ${data.netProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className="flex justify-between text-lg font-bold">
                    <span>RESULTAT NET</span>
                    <span className={data.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}>
                      {formatCurrency(data.netProfit)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Marge nette : {data.netMargin.toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Situation */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-gray-500 mb-1">Valeur du stock (achat)</p>
                <p className="text-xl font-bold">{formatCurrency(data.stockValue)}</p>
                <p className="text-sm text-gray-400">Détail: {formatCurrency(data.stockRetailValue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-gray-500 mb-1">Créances clients</p>
                <p className="text-xl font-bold text-orange-600">{formatCurrency(data.pendingCreditsTotal)}</p>
                <p className="text-sm text-gray-400">{data.pendingCreditsCount} créance(s) en cours</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-gray-500 mb-1">Actif total estimé</p>
                <p className="text-xl font-bold text-primary">
                  {formatCurrency(data.stockValue + data.pendingCreditsTotal + data.netProfit)}
                </p>
                <p className="text-sm text-gray-400">Stock + Créances + Résultat</p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

export default Accounting;
