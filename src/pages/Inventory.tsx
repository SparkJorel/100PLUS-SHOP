import { useEffect, useState } from 'react';
import { ClipboardCheck, Search, AlertTriangle, Check, Package } from 'lucide-react';
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Badge, toast, Select } from '../components/ui';
import { formatCurrency } from '../lib/utils';
import { subscribeToProducts, createStockMovement, subscribeToCategories } from '../lib/firebase/services';
import type { Product, Category } from '../types';
import { useAuthStore } from '../stores';

interface CountEntry {
  counted: string; // string to allow empty input field
}

export function Inventory() {
  const { user } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inventoryStarted, setInventoryStarted] = useState(false);
  const [counts, setCounts] = useState<Record<string, CountEntry>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionProgress, setSubmissionProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    const unsubProducts = subscribeToProducts((data) => {
      setProducts(data);
      setIsLoading(false);
    });
    const unsubCategories = subscribeToCategories(setCategories);

    return () => {
      unsubProducts();
      unsubCategories();
    };
  }, []);

  const startInventory = () => {
    const initialCounts: Record<string, CountEntry> = {};
    products.forEach((p) => {
      initialCounts[p.id] = { counted: '' };
    });
    setCounts(initialCounts);
    setInventoryStarted(true);
    toast.success('Inventaire démarré. Saisissez les quantités comptées pour chaque produit.');
  };

  const resetInventory = () => {
    if (!window.confirm('Abandonner l\'inventaire en cours ? Toutes les saisies seront perdues.')) return;
    setInventoryStarted(false);
    setCounts({});
    setSearchTerm('');
    setCategoryFilter('');
  };

  const updateCount = (productId: string, value: string) => {
    setCounts((prev) => ({
      ...prev,
      [productId]: { counted: value },
    }));
  };

  // Filtering
  const filteredProducts = products.filter((product) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      product.name.toLowerCase().includes(term) ||
      product.code.toLowerCase().includes(term);
    const matchesCategory = !categoryFilter || product.categoryId === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Stats
  const countedProducts = products.filter((p) => counts[p.id]?.counted !== '' && counts[p.id]?.counted !== undefined);
  const totalProducts = products.length;
  const countedCount = countedProducts.length;

  const discrepancies = countedProducts.filter((p) => {
    const counted = Number(counts[p.id].counted);
    return counted !== p.quantity;
  });

  const totalSurplus = countedProducts.reduce((acc, p) => {
    const counted = Number(counts[p.id].counted);
    const diff = counted - p.quantity;
    return diff > 0 ? acc + diff : acc;
  }, 0);

  const totalDeficit = countedProducts.reduce((acc, p) => {
    const counted = Number(counts[p.id].counted);
    const diff = p.quantity - counted;
    return diff > 0 ? acc + diff : acc;
  }, 0);

  const getRowClass = (product: Product) => {
    const entry = counts[product.id];
    if (!entry || entry.counted === '') return '';
    const counted = Number(entry.counted);
    if (counted < product.quantity) return 'bg-red-50';
    if (counted !== product.quantity) return 'bg-yellow-50';
    return 'bg-green-50';
  };

  const handleValidate = async () => {
    if (!user) {
      toast.error('Vous devez être connecté');
      return;
    }

    if (discrepancies.length === 0) {
      toast.success('Aucun écart détecté. L\'inventaire est conforme.');
      return;
    }

    const confirmMsg =
      `Valider l'inventaire ?\n\n` +
      `${countedCount} produit(s) compté(s)\n` +
      `${discrepancies.length} écart(s) détecté(s)\n` +
      `Surplus total : +${totalSurplus}\n` +
      `Déficit total : -${totalDeficit}\n\n` +
      `Les ajustements de stock seront appliqués pour chaque produit avec un écart.`;

    if (!window.confirm(confirmMsg)) return;

    setIsSubmitting(true);
    setSubmissionProgress({ current: 0, total: discrepancies.length });

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < discrepancies.length; i++) {
      const product = discrepancies[i];
      const counted = Number(counts[product.id].counted);

      try {
        await createStockMovement({
          productId: product.id,
          type: 'adjustment',
          quantity: counted,
          reason: 'Inventaire',
          reference: `INV-${new Date().toISOString().slice(0, 10)}`,
          createdBy: user.id,
          createdByName: user.displayName,
        });
        successCount++;
      } catch (error: any) {
        console.error(`Erreur ajustement pour ${product.name}:`, error);
        errorCount++;
      }

      setSubmissionProgress({ current: i + 1, total: discrepancies.length });
    }

    setIsSubmitting(false);

    if (errorCount === 0) {
      toast.success(`Inventaire validé ! ${successCount} ajustement(s) appliqué(s).`);
      setInventoryStarted(false);
      setCounts({});
    } else {
      toast.error(`${successCount} ajustement(s) réussi(s), ${errorCount} erreur(s). Vérifiez les produits concernés.`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Landing state: inventory not started
  if (!inventoryStarted) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventaire physique</h1>
          <p className="text-gray-500">Comptage et vérification du stock</p>
        </div>

        <Card>
          <CardContent>
            <div className="text-center py-12">
              <ClipboardCheck className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h2 className="text-xl font-semibold text-gray-700 mb-2">
                Démarrer un nouvel inventaire
              </h2>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                L'inventaire physique vous permet de comparer les quantités réelles en stock
                avec les quantités enregistrées dans le système. Les écarts seront automatiquement
                corrigés lors de la validation.
              </p>
              <p className="text-sm text-gray-400 mb-6">
                {products.length} produit(s) actif(s) seront inclus dans l'inventaire
              </p>
              <Button onClick={startInventory} className="px-8">
                <ClipboardCheck className="h-4 w-4 mr-2" />
                Démarrer un inventaire
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Inventory in progress
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventaire en cours</h1>
          <p className="text-gray-500">
            {countedCount} / {totalProducts} produit(s) compté(s)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={resetInventory}>
            Abandonner
          </Button>
          <Button onClick={handleValidate} disabled={isSubmitting || countedCount === 0}>
            <Check className="h-4 w-4 mr-2" />
            Valider l'inventaire
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <Card>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progression</span>
            <span className="text-sm font-medium text-gray-700">
              {totalProducts > 0 ? Math.round((countedCount / totalProducts) * 100) : 0}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-primary h-3 rounded-full transition-all duration-300"
              style={{ width: `${totalProducts > 0 ? (countedCount / totalProducts) * 100 : 0}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>{countedCount} compté(s)</span>
            <span>{totalProducts - countedCount} restant(s)</span>
          </div>
        </CardContent>
      </Card>

      {/* Submission progress overlay */}
      {isSubmitting && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <div className="flex-1">
                <p className="font-medium text-blue-800">
                  Application des ajustements en cours...
                </p>
                <p className="text-sm text-blue-600">
                  {submissionProgress.current} / {submissionProgress.total} ajustement(s) traité(s)
                </p>
                <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-200"
                    style={{
                      width: `${submissionProgress.total > 0
                        ? (submissionProgress.current / submissionProgress.total) * 100
                        : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher par nom ou code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="sm:w-64">
              <Select
                options={[
                  { value: '', label: 'Toutes les catégories' },
                  ...categories.map((c) => ({ value: c.id, label: c.name })),
                ]}
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent>
            <div className="text-center">
              <Package className="h-6 w-6 mx-auto text-blue-500 mb-1" />
              <p className="text-2xl font-bold text-gray-900">{countedCount}</p>
              <p className="text-xs text-gray-500">Produits comptés</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="text-center">
              <AlertTriangle className="h-6 w-6 mx-auto text-yellow-500 mb-1" />
              <p className="text-2xl font-bold text-gray-900">{discrepancies.length}</p>
              <p className="text-xs text-gray-500">Ecarts détectés</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">+{totalSurplus}</p>
              <p className="text-xs text-gray-500">Surplus total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">-{totalDeficit}</p>
              <p className="text-xs text-gray-500">Déficit total</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product list */}
      <Card className="overflow-hidden p-0">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Aucun produit trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Produit</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Catégorie</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Taille / Couleur</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Stock système</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Qté comptée</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ecart</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProducts.map((product) => {
                  const entry = counts[product.id];
                  const countedValue = entry?.counted ?? '';
                  const hasCounted = countedValue !== '';
                  const counted = hasCounted ? Number(countedValue) : null;
                  const diff = counted !== null ? counted - product.quantity : null;

                  return (
                    <tr key={product.id} className={`${getRowClass(product)} transition-colors`}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-sm text-gray-900">{product.name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-500">{product.code}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-600">{product.categoryName}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-600">
                          {product.size}{product.color ? ` / ${product.color}` : ''}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="info">{product.quantity}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min="0"
                          value={countedValue}
                          onChange={(e) => updateCount(product.id, e.target.value)}
                          placeholder="—"
                          className="w-20 px-2 py-1 text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                          disabled={isSubmitting}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        {diff !== null ? (
                          <span
                            className={`text-sm font-semibold ${
                              diff === 0
                                ? 'text-green-600'
                                : diff > 0
                                ? 'text-yellow-600'
                                : 'text-red-600'
                            }`}
                          >
                            {diff === 0 ? (
                              <span className="flex items-center justify-center gap-1">
                                <Check className="h-4 w-4" /> OK
                              </span>
                            ) : (
                              `${diff > 0 ? '+' : ''}${diff}`
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Bottom validation bar */}
      {countedCount > 0 && (
        <Card className="sticky bottom-4 border-2 border-primary/20 shadow-lg">
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="text-gray-600">
                  <strong>{countedCount}</strong> / {totalProducts} compté(s)
                </span>
                <span className="text-yellow-600">
                  <strong>{discrepancies.length}</strong> écart(s)
                </span>
                <span className="text-green-600">
                  Surplus : <strong>+{totalSurplus}</strong>
                </span>
                <span className="text-red-600">
                  Déficit : <strong>-{totalDeficit}</strong>
                </span>
              </div>
              <Button onClick={handleValidate} disabled={isSubmitting}>
                <Check className="h-4 w-4 mr-2" />
                Valider l'inventaire ({discrepancies.length} ajustement{discrepancies.length > 1 ? 's' : ''})
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default Inventory;
