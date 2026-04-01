import { useEffect, useState } from 'react';
import { Search, Eye, XCircle, ShoppingCart, Calendar, Printer, RotateCcw } from 'lucide-react';
import {
  Button,
  Input,
  Card,
  Modal,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  toast,
  Select,
  Textarea,
} from '../components/ui';
import { formatCurrency } from '../lib/utils';
import { subscribeToSales, cancelSale, createReturn } from '../lib/firebase/services';
import type { ReturnItem } from '../lib/firebase/services/returnService';
import { PAYMENT_METHOD_LABELS, SALE_STATUS_LABELS } from '../types/sale';
import type { Sale } from '../types';
import { useAuthStore } from '../stores';

export function Sales() {
  const { user } = useAuthStore();
  const [sales, setSales] = useState<Sale[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnItems, setReturnItems] = useState<Record<string, number>>({});
  const [returnReason, setReturnReason] = useState('');
  const [returnType, setReturnType] = useState<'refund' | 'exchange'>('refund');

  useEffect(() => {
    const unsub = subscribeToSales((data) => {
      setSales(data);
      setIsLoading(false);
    });
    return unsub;
  }, []);

  const filteredSales = sales.filter((sale) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      sale.saleNumber.toLowerCase().includes(term) ||
      (sale.customerName && sale.customerName.toLowerCase().includes(term));

    let matchesDate = true;
    if (dateFilter) {
      const saleDate = sale.createdAt.toDate().toISOString().split('T')[0];
      matchesDate = saleDate === dateFilter;
    }

    return matchesSearch && matchesDate;
  });

  const handleViewDetails = (sale: Sale) => {
    setSelectedSale(sale);
    setIsDetailModalOpen(true);
  };

  const handleOpenReturn = (sale: Sale) => {
    setSelectedSale(sale);
    setReturnItems({});
    setReturnReason('');
    setReturnType('refund');
    setIsReturnModalOpen(true);
  };

  const handleReturnQuantityChange = (productId: string, qty: number, maxQty: number) => {
    setReturnItems((prev) => ({
      ...prev,
      [productId]: Math.min(Math.max(0, qty), maxQty),
    }));
  };

  const returnTotal = selectedSale
    ? selectedSale.items.reduce((sum, item) => {
        const qty = returnItems[item.productId] || 0;
        return sum + qty * item.unitPrice;
      }, 0)
    : 0;

  const handleSubmitReturn = async () => {
    if (!selectedSale || !user) return;

    const items: ReturnItem[] = selectedSale.items
      .filter((item) => (returnItems[item.productId] || 0) > 0)
      .map((item) => ({
        productId: item.productId,
        productName: item.productName,
        size: item.size,
        color: item.color,
        quantity: returnItems[item.productId],
        unitPrice: item.unitPrice,
        total: returnItems[item.productId] * item.unitPrice,
      }));

    if (items.length === 0) {
      toast.warning('Sélectionnez au moins un article à retourner');
      return;
    }

    if (!returnReason.trim()) {
      toast.warning('Veuillez indiquer la raison du retour');
      return;
    }

    try {
      await createReturn({
        saleId: selectedSale.id,
        saleNumber: selectedSale.saleNumber,
        type: returnType,
        items,
        totalRefund: returnTotal,
        reason: returnReason,
        customerId: selectedSale.customerId,
        processedBy: user.id,
        processedByName: user.displayName,
      });
      setIsReturnModalOpen(false);
      toast.success(returnType === 'refund' ? 'Remboursement effectué' : 'Échange enregistré');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du retour');
    }
  };

  const handleCancelSale = async (sale: Sale) => {
    if (sale.status === 'cancelled') {
      toast.warning('Cette vente est déjà annulée');
      return;
    }

    if (confirm(`Annuler la vente ${sale.saleNumber} ? Le stock sera réajusté.`)) {
      try {
        await cancelSale(sale.id);
        setIsDetailModalOpen(false);
        toast.success('Vente annulée avec succès');
      } catch (error: any) {
        console.error('Error cancelling sale:', error);
        toast.error(error.message || 'Erreur lors de l\'annulation');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Calculate totals
  const todayTotal = sales
    .filter((s) => {
      const today = new Date().toISOString().split('T')[0];
      const saleDate = s.createdAt.toDate().toISOString().split('T')[0];
      return saleDate === today && s.status === 'completed';
    })
    .reduce((sum, s) => sum + s.total, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Historique des ventes</h1>
          <p className="text-gray-500">{sales.length} vente(s) au total</p>
        </div>
        <div className="bg-primary-50 px-4 py-2 rounded-lg">
          <p className="text-sm text-gray-600">Ventes du jour</p>
          <p className="text-xl font-bold text-primary">{formatCurrency(todayTotal)}</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher par numéro ou client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="pl-10 w-48"
            />
          </div>
          {dateFilter && (
            <Button variant="ghost" onClick={() => setDateFilter('')}>
              Effacer filtre
            </Button>
          )}
        </div>
      </Card>

      {/* Sales Table */}
      <Card className="overflow-hidden p-0">
        {filteredSales.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Aucune vente trouvée</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Vente</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Articles</TableHead>
                <TableHead>Paiement</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell>
                    <span className="font-medium">{sale.saleNumber}</span>
                  </TableCell>
                  <TableCell>
                    {sale.createdAt.toDate().toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p>{sale.customerName || 'Client Lambda'}</p>
                      <Badge variant={sale.customerType === 'maison' ? 'info' : 'default'}>
                        {sale.customerType === 'maison' ? 'Maison' : 'Lambda'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>{sale.items.length} article(s)</TableCell>
                  <TableCell>
                    <Badge>{PAYMENT_METHOD_LABELS[sale.paymentMethod]}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{formatCurrency(sale.total)}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={sale.status === 'completed' ? 'success' : 'danger'}>
                      {SALE_STATUS_LABELS[sale.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewDetails(sale)}
                        className="p-1 text-gray-500 hover:text-primary"
                        title="Voir détails"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {sale.status === 'completed' && (
                        <button
                          onClick={() => handleCancelSale(sale)}
                          className="p-1 text-gray-500 hover:text-red-500"
                          title="Annuler"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Sale Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={`Détails de la vente ${selectedSale?.saleNumber}`}
        size="lg"
      >
        {selectedSale && (
          <div className="space-y-4">
            {/* Header Info */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-medium">
                  {selectedSale.createdAt.toDate().toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Vendeur</p>
                <p className="font-medium">{selectedSale.soldByName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Client</p>
                <p className="font-medium">
                  {selectedSale.customerName || 'Client Lambda'}
                  <Badge className="ml-2" variant={selectedSale.customerType === 'maison' ? 'info' : 'default'}>
                    {selectedSale.customerType === 'maison' ? 'Maison' : 'Lambda'}
                  </Badge>
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Paiement</p>
                <p className="font-medium">{PAYMENT_METHOD_LABELS[selectedSale.paymentMethod]}</p>
              </div>
            </div>

            {/* Items */}
            <div>
              <p className="font-medium mb-2">Articles</p>
              <div className="border rounded-lg divide-y">
                {selectedSale.items.map((item, index) => (
                  <div key={index} className="p-3 flex justify-between">
                    <div>
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-sm text-gray-500">
                        {item.size} / {item.color} • {formatCurrency(item.unitPrice)} × {item.quantity}
                      </p>
                    </div>
                    <p className="font-medium">{formatCurrency(item.total)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Sous-total</span>
                <span>{formatCurrency(selectedSale.subtotal)}</span>
              </div>
              {selectedSale.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Remise</span>
                  <span className="text-red-500">-{formatCurrency(selectedSale.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(selectedSale.total)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-4 border-t">
              <Badge
                variant={selectedSale.status === 'completed' ? 'success' : 'danger'}
                className="text-sm px-3 py-1"
              >
                {SALE_STATUS_LABELS[selectedSale.status]}
              </Badge>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setIsPrintModalOpen(true)}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Réimprimer
                </Button>
                {selectedSale.status === 'completed' && (
                  <>
                    <Button
                      variant="secondary"
                      onClick={() => handleOpenReturn(selectedSale)}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Retour
                    </Button>
                    <Button variant="danger" onClick={() => handleCancelSale(selectedSale)}>
                      <XCircle className="h-4 w-4 mr-2" />
                      Annuler
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Print Receipt Modal */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="Réimpression du reçu"
        size="md"
      >
        {selectedSale && (
          <div className="space-y-4">
            <div className="border rounded-lg p-4 bg-white" id="receipt">
              <div className="text-center border-b pb-3 mb-3">
                <img src="/logo_100plus.jpg" alt="100PLUS SHOP" className="h-10 mx-auto mb-1 object-contain" />
                <p className="text-xs text-gray-500">Boutique de mode & accessoires</p>
                <p className="text-xs text-gray-500">Tel: +XXX XX XX XX XX</p>
                <p className="text-xs text-gray-400 mt-1">DUPLICATA</p>
              </div>

              <div className="text-sm space-y-1 border-b pb-3 mb-3">
                <p><span className="text-gray-500">N°:</span> {selectedSale.saleNumber}</p>
                <p><span className="text-gray-500">Date:</span> {selectedSale.createdAt.toDate().toLocaleString('fr-FR')}</p>
                {selectedSale.customerName && (
                  <p><span className="text-gray-500">Client:</span> {selectedSale.customerName}</p>
                )}
                <p><span className="text-gray-500">Vendeur:</span> {selectedSale.soldByName}</p>
              </div>

              <div className="space-y-2 border-b pb-3 mb-3">
                {selectedSale.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <div>
                      <p>{item.productName}</p>
                      <p className="text-xs text-gray-500">
                        {item.quantity} x {formatCurrency(item.unitPrice)}
                      </p>
                    </div>
                    <p className="font-medium">{formatCurrency(item.total)}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Sous-total</span>
                  <span>{formatCurrency(selectedSale.subtotal)}</span>
                </div>
                {selectedSale.discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Remise</span>
                    <span>-{formatCurrency(selectedSale.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(selectedSale.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Paiement</span>
                  <span>{PAYMENT_METHOD_LABELS[selectedSale.paymentMethod]}</span>
                </div>
              </div>

              <div className="text-center mt-4 pt-3 border-t">
                <p className="text-xs text-gray-500">Merci pour votre achat !</p>
              </div>
            </div>

            <Button className="w-full" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimer le reçu
            </Button>
          </div>
        )}
      </Modal>

      {/* Return Modal */}
      <Modal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        title={`Retour / Échange — ${selectedSale?.saleNumber}`}
        size="lg"
      >
        {selectedSale && (
          <div className="space-y-4">
            <Select
              label="Type de retour"
              options={[
                { value: 'refund', label: 'Remboursement' },
                { value: 'exchange', label: 'Échange' },
              ]}
              value={returnType}
              onChange={(e) => setReturnType(e.target.value as 'refund' | 'exchange')}
            />

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Articles à retourner</p>
              <div className="border rounded-lg divide-y">
                {selectedSale.items.map((item) => (
                  <div key={item.productId} className="p-3 flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.productName}</p>
                      <p className="text-xs text-gray-500">
                        {item.size} / {item.color} — {formatCurrency(item.unitPrice)} (acheté: {item.quantity})
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Qté retour:</span>
                      <Input
                        type="number"
                        min="0"
                        max={item.quantity}
                        value={returnItems[item.productId] || 0}
                        onChange={(e) =>
                          handleReturnQuantityChange(item.productId, Number(e.target.value), item.quantity)
                        }
                        className="w-20 text-center py-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Textarea
              label="Raison du retour"
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="Ex: Mauvaise taille, article défectueux..."
              required
            />

            {returnTotal > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between text-lg font-bold">
                  <span>{returnType === 'refund' ? 'Montant à rembourser' : 'Valeur de l\'échange'}</span>
                  <span className="text-primary">{formatCurrency(returnTotal)}</span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setIsReturnModalOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSubmitReturn} disabled={returnTotal === 0}>
                <RotateCcw className="h-4 w-4 mr-2" />
                {returnType === 'refund' ? 'Rembourser' : 'Enregistrer l\'échange'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default Sales;
