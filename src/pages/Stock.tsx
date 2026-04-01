import { useEffect, useState } from 'react';
import { Search, Package, ArrowUpCircle, ArrowDownCircle, RefreshCw } from 'lucide-react';
import {
  Button,
  Input,
  Select,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Modal,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  toast,
} from '../components/ui';
import { formatCurrency } from '../lib/utils';
import {
  subscribeToProducts,
  subscribeToStockMovements,
  createStockMovement,
  getLowStockProducts,
} from '../lib/firebase/services';
import { MOVEMENT_TYPE_LABELS, STOCK_REASONS } from '../types/stock';
import type { Product, StockMovement, StockMovementType } from '../types';
import { useAuthStore } from '../stores';

export function Stock() {
  const { user } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<
    { id: string; name: string; code: string; quantity: number; minStock: number }[]
  >([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'stock' | 'movements'>('stock');

  const [formData, setFormData] = useState({
    productId: '',
    type: 'in' as StockMovementType,
    quantity: 0,
    reason: '',
  });

  useEffect(() => {
    const unsubProducts = subscribeToProducts(setProducts);
    const unsubMovements = subscribeToStockMovements((data) => {
      setMovements(data);
      setIsLoading(false);
    });

    getLowStockProducts().then(setLowStockProducts);

    return () => {
      unsubProducts();
      unsubMovements();
    };
  }, []);

  const filteredProducts = products.filter((product) => {
    const term = searchTerm.toLowerCase();
    return (
      product.name.toLowerCase().includes(term) ||
      product.code.toLowerCase().includes(term)
    );
  });

  const handleOpenModal = (type: StockMovementType = 'in', productId?: string) => {
    setFormData({
      productId: productId || '',
      type,
      quantity: 0,
      reason: STOCK_REASONS[type][0],
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    try {
      await createStockMovement({
        productId: formData.productId,
        type: formData.type,
        quantity: formData.quantity,
        reason: formData.reason,
        createdBy: user.id,
        createdByName: user.displayName,
      });
      setIsModalOpen(false);
      toast.success('Mouvement de stock enregistré');
      getLowStockProducts().then(setLowStockProducts);
    } catch (error: any) {
      console.error('Error creating stock movement:', error);
      toast.error(error.message || 'Erreur lors du mouvement de stock');
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Gestion du Stock</h1>
          <p className="text-gray-500">{products.length} produit(s) en stock</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => handleOpenModal('in')}>
            <ArrowUpCircle className="h-4 w-4 mr-2" />
            Entrée
          </Button>
          <Button variant="secondary" onClick={() => handleOpenModal('out')}>
            <ArrowDownCircle className="h-4 w-4 mr-2" />
            Sortie
          </Button>
          <Button onClick={() => handleOpenModal('adjustment')}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Ajustement
          </Button>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <Card className="bg-red-50 border-red-200">
          <CardHeader>
            <CardTitle className="text-red-800">
              ⚠️ Alertes de stock ({lowStockProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {lowStockProducts.slice(0, 6).map((product) => (
                <div
                  key={product.id}
                  className="bg-white p-3 rounded-lg flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-sm">{product.name}</p>
                    <p className="text-xs text-gray-500">{product.code}</p>
                  </div>
                  <Badge variant="danger">{product.quantity} / {product.minStock}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('stock')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'stock'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          État du stock
        </button>
        <button
          onClick={() => setActiveTab('movements')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'movements'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Historique mouvements
        </button>
      </div>

      {/* Search */}
      <Card>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher un produit..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Content */}
      {activeTab === 'stock' ? (
        <Card className="overflow-hidden p-0">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Aucun produit trouvé</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produit</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Taille/Couleur</TableHead>
                  <TableHead>Stock actuel</TableHead>
                  <TableHead>Seuil alerte</TableHead>
                  <TableHead>Valeur stock</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-gray-500">{product.code}</p>
                      </div>
                    </TableCell>
                    <TableCell>{product.categoryName}</TableCell>
                    <TableCell>
                      {product.size} / {product.color}
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.quantity <= product.minStock ? 'danger' : 'success'}>
                        {product.quantity}
                      </Badge>
                    </TableCell>
                    <TableCell>{product.minStock}</TableCell>
                    <TableCell>
                      {formatCurrency(product.quantity * product.prixAchat)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleOpenModal('in', product.id)}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                          title="Entrée"
                        >
                          <ArrowUpCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleOpenModal('out', product.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Sortie"
                        >
                          <ArrowDownCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          {movements.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Aucun mouvement enregistré</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantité</TableHead>
                  <TableHead>Stock avant</TableHead>
                  <TableHead>Stock après</TableHead>
                  <TableHead>Raison</TableHead>
                  <TableHead>Par</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>
                      {movement.createdAt.toDate().toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{movement.productName}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          movement.type === 'in'
                            ? 'success'
                            : movement.type === 'out'
                            ? 'danger'
                            : 'warning'
                        }
                      >
                        {MOVEMENT_TYPE_LABELS[movement.type]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          movement.type === 'in'
                            ? 'text-green-600'
                            : movement.type === 'out'
                            ? 'text-red-600'
                            : 'text-yellow-600'
                        }
                      >
                        {movement.type === 'in' ? '+' : movement.type === 'out' ? '-' : '±'}
                        {movement.quantity}
                      </span>
                    </TableCell>
                    <TableCell>{movement.previousQuantity}</TableCell>
                    <TableCell>{movement.newQuantity}</TableCell>
                    <TableCell>{movement.reason}</TableCell>
                    <TableCell>{movement.createdByName}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}

      {/* Movement Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`${
          formData.type === 'in'
            ? 'Entrée de stock'
            : formData.type === 'out'
            ? 'Sortie de stock'
            : 'Ajustement de stock'
        }`}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Produit"
            options={products.map((p) => ({
              value: p.id,
              label: `${p.name} (${p.code}) - Stock: ${p.quantity}`,
            }))}
            value={formData.productId}
            onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
            required
          />

          <Input
            label={formData.type === 'adjustment' ? 'Nouvelle quantité' : 'Quantité'}
            type="number"
            min="0"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
            required
          />

          <Select
            label="Raison"
            options={STOCK_REASONS[formData.type].map((r) => ({ value: r, label: r }))}
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            required
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit">Valider</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Stock;
