import { useEffect, useState } from 'react';
import { FileText, Printer, Plus, Trash2, Eye } from 'lucide-react';
import {
  Button,
  Input,
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
import { subscribeToSales } from '../lib/firebase/services';
import { PAYMENT_METHOD_LABELS } from '../types/sale';
import type { Sale } from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QuoteItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

type Tab = 'invoices' | 'quotes';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Invoices() {
  // -- Shared state --
  const [activeTab, setActiveTab] = useState<Tab>('invoices');

  // -- Tab 1 : Factures --
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // -- Tab 2 : Devis / Proforma --
  const [quoteCustomer, setQuoteCustomer] = useState('');
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([
    { description: '', quantity: 1, unitPrice: 0 },
  ]);
  const [quoteValidity, setQuoteValidity] = useState('30 jours');
  const [quoteNotes, setQuoteNotes] = useState('');
  const [isQuotePreviewOpen, setIsQuotePreviewOpen] = useState(false);

  // ---------------------------------------------------------------------------
  // Data subscription
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const unsub = subscribeToSales((data) => {
      setSales(data);
      setIsLoading(false);
    });
    return unsub;
  }, []);

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  const completedSales = sales.filter((s) => s.status === 'completed');

  const filteredSales = completedSales.filter((sale) => {
    const term = searchTerm.toLowerCase();
    return (
      sale.saleNumber.toLowerCase().includes(term) ||
      (sale.customerName && sale.customerName.toLowerCase().includes(term))
    );
  });

  const quoteSubtotal = quoteItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );

  // ---------------------------------------------------------------------------
  // Helpers – Quote items
  // ---------------------------------------------------------------------------

  const addQuoteItem = () => {
    setQuoteItems([...quoteItems, { description: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeQuoteItem = (index: number) => {
    if (quoteItems.length === 1) {
      toast.error('Le devis doit contenir au moins un article');
      return;
    }
    setQuoteItems(quoteItems.filter((_, i) => i !== index));
  };

  const updateQuoteItem = (index: number, field: keyof QuoteItem, value: string | number) => {
    setQuoteItems(
      quoteItems.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  // ---------------------------------------------------------------------------
  // Open invoice modal
  // ---------------------------------------------------------------------------

  const openInvoice = (sale: Sale) => {
    setSelectedSale(sale);
    setIsInvoiceModalOpen(true);
  };

  const openQuotePreview = () => {
    if (!quoteCustomer.trim()) {
      toast.error('Veuillez saisir le nom du client');
      return;
    }
    if (quoteItems.some((item) => !item.description.trim())) {
      toast.error('Veuillez remplir la désignation de chaque article');
      return;
    }
    setIsQuotePreviewOpen(true);
  };

  // ---------------------------------------------------------------------------
  // Format helpers
  // ---------------------------------------------------------------------------

  const formatDate = (sale: Sale) => {
    try {
      return sale.createdAt.toDate().toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  const todayFormatted = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  // ---------------------------------------------------------------------------
  // Shared invoice header component (used in both invoice & quote modals)
  // ---------------------------------------------------------------------------

  const InvoiceHeader = ({ title }: { title: string }) => (
    <div className="border-b pb-4 mb-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/logo_100plus.jpg"
            alt="100PLUS SHOP"
            className="h-16 w-16 object-contain"
          />
          <div>
            <h2 className="text-xl font-bold text-gray-900">100PLUS SHOP</h2>
            <p className="text-sm text-gray-600">Adresse : [Adresse de la boutique]</p>
            <p className="text-sm text-gray-600">Tél : [Numéro de téléphone]</p>
            <p className="text-sm text-gray-600">NIF : [Numéro NIF]</p>
          </div>
        </div>
        <div className="text-right">
          <h1 className="text-2xl font-bold text-blue-700">{title}</h1>
        </div>
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div className="flex items-center gap-3">
        <FileText className="h-7 w-7 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Factures &amp; Devis</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'invoices'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('invoices')}
        >
          Factures
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'quotes'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('quotes')}
        >
          Devis / Proforma
        </button>
      </div>

      {/* ================================================================== */}
      {/* TAB 1 – Factures                                                   */}
      {/* ================================================================== */}
      {activeTab === 'invoices' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Liste des ventes complétées</CardTitle>
              <Input
                placeholder="Rechercher par n° ou client…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-xs"
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center text-gray-500 py-8">Chargement…</p>
            ) : filteredSales.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Aucune vente trouvée.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Vente</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Paiement</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">{sale.saleNumber}</TableCell>
                      <TableCell>{formatDate(sale)}</TableCell>
                      <TableCell>{sale.customerName || 'Client Lambda'}</TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(sale.total)}
                      </TableCell>
                      <TableCell>
                        <Badge>{PAYMENT_METHOD_LABELS[sale.paymentMethod]}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => openInvoice(sale)}>
                          <FileText className="h-4 w-4 mr-1" />
                          Facture
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* ================================================================== */}
      {/* TAB 2 – Devis / Proforma                                           */}
      {/* ================================================================== */}
      {activeTab === 'quotes' && (
        <Card>
          <CardHeader>
            <CardTitle>Créer un devis / proforma</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Customer name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du client
                </label>
                <Input
                  placeholder="Nom du client"
                  value={quoteCustomer}
                  onChange={(e) => setQuoteCustomer(e.target.value)}
                  className="max-w-md"
                />
              </div>

              {/* Items */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Articles
                </label>
                <div className="space-y-3">
                  {quoteItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <Input
                        placeholder="Désignation"
                        value={item.description}
                        onChange={(e) => updateQuoteItem(idx, 'description', e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        placeholder="Qté"
                        min={1}
                        value={item.quantity}
                        onChange={(e) =>
                          updateQuoteItem(idx, 'quantity', parseInt(e.target.value) || 1)
                        }
                        className="w-24"
                      />
                      <Input
                        type="number"
                        placeholder="Prix unitaire"
                        min={0}
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateQuoteItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)
                        }
                        className="w-36"
                      />
                      <span className="w-28 text-sm font-medium text-right">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </span>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => removeQuoteItem(idx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <Button size="sm" variant="secondary" className="mt-3" onClick={addQuoteItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter un article
                </Button>
              </div>

              {/* Validity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Durée de validité
                </label>
                <Input
                  placeholder="Ex : 30 jours"
                  value={quoteValidity}
                  onChange={(e) => setQuoteValidity(e.target.value)}
                  className="max-w-xs"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Notes ou conditions supplémentaires…"
                  value={quoteNotes}
                  onChange={(e) => setQuoteNotes(e.target.value)}
                />
              </div>

              {/* Subtotal & preview */}
              <div className="flex items-center justify-between pt-4 border-t">
                <p className="text-lg font-semibold">
                  Total : {formatCurrency(quoteSubtotal)}
                </p>
                <Button onClick={openQuotePreview}>
                  <Eye className="h-4 w-4 mr-2" />
                  Aperçu
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================================================================== */}
      {/* Invoice Modal                                                      */}
      {/* ================================================================== */}
      <Modal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        title="Facture"
        size="xl"
      >
        {selectedSale && (
          <div className="space-y-4">
            <div id="receipt" className="border rounded-lg p-6 bg-white">
              <InvoiceHeader title="FACTURE" />

              {/* Invoice meta */}
              <div className="flex justify-between mb-6">
                <div>
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">Facture N° :</span>{' '}
                    {selectedSale.saleNumber}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">Date :</span> {formatDate(selectedSale)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-700">Client :</p>
                  <p className="text-sm text-gray-600">
                    {selectedSale.customerName || 'Client Lambda'}
                  </p>
                </div>
              </div>

              {/* Items table */}
              <table className="w-full text-sm mb-6">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-2 font-semibold">#</th>
                    <th className="text-left py-2 font-semibold">Désignation</th>
                    <th className="text-left py-2 font-semibold">Taille/Couleur</th>
                    <th className="text-right py-2 font-semibold">Qté</th>
                    <th className="text-right py-2 font-semibold">Prix unitaire</th>
                    <th className="text-right py-2 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSale.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-200">
                      <td className="py-2">{idx + 1}</td>
                      <td className="py-2">{item.productName}</td>
                      <td className="py-2">
                        {[item.size, item.color].filter(Boolean).join(' / ') || '—'}
                      </td>
                      <td className="py-2 text-right">{item.quantity}</td>
                      <td className="py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="py-2 text-right">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Sous-total :</span>
                    <span>{formatCurrency(selectedSale.subtotal)}</span>
                  </div>
                  {selectedSale.discount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Remise :</span>
                      <span>-{formatCurrency(selectedSale.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base border-t pt-1">
                    <span>TOTAL :</span>
                    <span>{formatCurrency(selectedSale.total)}</span>
                  </div>
                </div>
              </div>

              {/* Payment method */}
              <p className="mt-4 text-sm text-gray-600">
                <span className="font-semibold">Mode de paiement :</span>{' '}
                {PAYMENT_METHOD_LABELS[selectedSale.paymentMethod]}
              </p>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t text-center">
                <p className="text-sm text-gray-500 italic">
                  Merci pour votre confiance
                </p>
              </div>
            </div>

            {/* Print button */}
            <Button className="w-full" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimer la facture
            </Button>
          </div>
        )}
      </Modal>

      {/* ================================================================== */}
      {/* Quote / Proforma Preview Modal                                     */}
      {/* ================================================================== */}
      <Modal
        isOpen={isQuotePreviewOpen}
        onClose={() => setIsQuotePreviewOpen(false)}
        title="Aperçu du devis"
        size="xl"
      >
        <div className="space-y-4">
          <div id="receipt" className="border rounded-lg p-6 bg-white">
            <InvoiceHeader title="DEVIS / PROFORMA" />

            {/* Quote meta */}
            <div className="flex justify-between mb-6">
              <div>
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">Date :</span> {todayFormatted}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">Validité :</span> {quoteValidity}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-700">Client :</p>
                <p className="text-sm text-gray-600">{quoteCustomer}</p>
              </div>
            </div>

            {/* Items table */}
            <table className="w-full text-sm mb-6">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-2 font-semibold">#</th>
                  <th className="text-left py-2 font-semibold">Désignation</th>
                  <th className="text-right py-2 font-semibold">Qté</th>
                  <th className="text-right py-2 font-semibold">Prix unitaire</th>
                  <th className="text-right py-2 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {quoteItems.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-200">
                    <td className="py-2">{idx + 1}</td>
                    <td className="py-2">{item.description}</td>
                    <td className="py-2 text-right">{item.quantity}</td>
                    <td className="py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-2 text-right">
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Total */}
            <div className="flex justify-end">
              <div className="w-64 space-y-1 text-sm">
                <div className="flex justify-between font-bold text-base border-t pt-1">
                  <span>TOTAL :</span>
                  <span>{formatCurrency(quoteSubtotal)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {quoteNotes && (
              <div className="mt-4 text-sm text-gray-600">
                <p className="font-semibold">Notes :</p>
                <p className="whitespace-pre-wrap">{quoteNotes}</p>
              </div>
            )}

            {/* Footer */}
            <div className="mt-6 pt-4 border-t text-center">
              <p className="text-sm text-gray-500 italic">
                Merci pour votre confiance
              </p>
            </div>
          </div>

          {/* Print button */}
          <Button className="w-full" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimer le devis
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default Invoices;
