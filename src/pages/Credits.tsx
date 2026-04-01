import { useEffect, useState } from 'react';
import { Search, Plus, CreditCard, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
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
import { subscribeToCredits, addCreditPayment, getTotalPendingCredits } from '../lib/firebase/services';
import type { Credit } from '../types';
import { PAYMENT_METHOD_LABELS } from '../types/sale';
import { useAuthStore } from '../stores';

type FilterTab = 'all' | 'pending' | 'partial' | 'paid';

const STATUS_LABELS: Record<Credit['status'], string> = {
  pending: 'En attente',
  partial: 'Partiellement payé',
  paid: 'Soldé',
};

const STATUS_BADGE_VARIANT: Record<Credit['status'], 'warning' | 'info' | 'success'> = {
  pending: 'warning',
  partial: 'info',
  paid: 'success',
};

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'pending', label: 'En attente' },
  { key: 'partial', label: 'Partiellement payé' },
  { key: 'paid', label: 'Soldé' },
];

export function Credits() {
  const { user } = useAuthStore();
  const [credits, setCredits] = useState<Credit[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Detail modal
  const [selectedCredit, setSelectedCredit] = useState<Credit | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Payment form
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsub = subscribeToCredits((data) => {
      setCredits(data);
      setIsLoading(false);
    });
    return unsub;
  }, []);

  // KPI calculations
  const pendingCredits = credits.filter((c) => c.status === 'pending');
  const partialCredits = credits.filter((c) => c.status === 'partial');
  const paidCredits = credits.filter((c) => c.status === 'paid');

  const totalPendingAmount = [...pendingCredits, ...partialCredits].reduce(
    (sum, c) => sum + c.remainingAmount,
    0
  );

  // Filter
  const filteredCredits = credits.filter((credit) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      credit.customerName.toLowerCase().includes(term) ||
      credit.saleNumber.toLowerCase().includes(term);

    const matchesTab =
      activeTab === 'all' || credit.status === activeTab;

    return matchesSearch && matchesTab;
  });

  const handleOpenDetail = (credit: Credit) => {
    setSelectedCredit(credit);
    setPaymentAmount('');
    setPaymentMethod('cash');
    setIsDetailModalOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailModalOpen(false);
    setSelectedCredit(null);
  };

  const handleAddPayment = async () => {
    if (!selectedCredit || !user) return;

    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) {
      toast.warning('Veuillez saisir un montant valide');
      return;
    }

    if (amount > selectedCredit.remainingAmount) {
      toast.warning('Le montant ne peut pas dépasser le solde restant');
      return;
    }

    setIsSubmitting(true);
    try {
      await addCreditPayment(selectedCredit.id, {
        amount,
        paymentMethod: paymentMethod as 'cash' | 'card' | 'mobile_money',
        receivedBy: user.id,
        receivedByName: user.displayName,
      });
      toast.success('Paiement enregistré avec succès');
      setPaymentAmount('');
      setPaymentMethod('cash');
      // The real-time listener will update selectedCredit through credits state
      // We need to keep the modal open with fresh data
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'enregistrement du paiement');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keep selectedCredit in sync with real-time data
  useEffect(() => {
    if (selectedCredit) {
      const updated = credits.find((c) => c.id === selectedCredit.id);
      if (updated) {
        setSelectedCredit(updated);
      }
    }
  }, [credits]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gestion des crédits</h1>
        <p className="text-gray-500">{credits.length} crédit(s) au total</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Crédits en cours</p>
              <p className="text-xl font-bold text-gray-900">
                {pendingCredits.length + partialCredits.length}
              </p>
              <p className="text-sm font-medium text-amber-600">
                {formatCurrency(totalPendingAmount)}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Partiellement payés</p>
              <p className="text-xl font-bold text-gray-900">{partialCredits.length}</p>
              <p className="text-sm font-medium text-blue-600">
                {formatCurrency(partialCredits.reduce((s, c) => s + c.remainingAmount, 0))}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Entièrement soldés</p>
              <p className="text-xl font-bold text-gray-900">{paidCredits.length}</p>
              <p className="text-sm font-medium text-green-600">
                {formatCurrency(paidCredits.reduce((s, c) => s + c.totalAmount, 0))}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search + Filter Tabs */}
      <Card>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher par client ou numéro de vente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Credits Table */}
      <Card className="overflow-hidden p-0">
        {filteredCredits.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Aucun crédit trouvé</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>N° Vente</TableHead>
                <TableHead>Montant total</TableHead>
                <TableHead>Payé</TableHead>
                <TableHead>Restant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCredits.map((credit) => (
                <TableRow key={credit.id}>
                  <TableCell>
                    <span className="font-medium">{credit.customerName}</span>
                  </TableCell>
                  <TableCell>{credit.saleNumber}</TableCell>
                  <TableCell>{formatCurrency(credit.totalAmount)}</TableCell>
                  <TableCell>{formatCurrency(credit.paidAmount)}</TableCell>
                  <TableCell>
                    <span className="font-medium text-amber-600">
                      {formatCurrency(credit.remainingAmount)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE_VARIANT[credit.status]}>
                      {STATUS_LABELS[credit.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDetail(credit)}
                    >
                      Détails
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Credit Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetail}
        title={`Crédit — ${selectedCredit?.saleNumber}`}
        size="lg"
      >
        {selectedCredit && (
          <div className="space-y-6">
            {/* Credit Info */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-500">Client</p>
                <p className="font-medium">{selectedCredit.customerName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">N° Vente</p>
                <p className="font-medium">{selectedCredit.saleNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date de création</p>
                <p className="font-medium">
                  {selectedCredit.createdAt.toDate().toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              {selectedCredit.dueDate && (
                <div>
                  <p className="text-sm text-gray-500">Date d'échéance</p>
                  <p className="font-medium">
                    {selectedCredit.dueDate.toDate().toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              )}
            </div>

            {/* Amounts Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Montant total</p>
                <p className="text-lg font-bold">{formatCurrency(selectedCredit.totalAmount)}</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-500">Payé</p>
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(selectedCredit.paidAmount)}
                </p>
              </div>
              <div className="text-center p-3 bg-amber-50 rounded-lg">
                <p className="text-sm text-gray-500">Restant</p>
                <p className="text-lg font-bold text-amber-600">
                  {formatCurrency(selectedCredit.remainingAmount)}
                </p>
              </div>
            </div>

            {/* Payment History */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Historique des paiements</h4>
              {selectedCredit.payments.length === 0 ? (
                <p className="text-sm text-gray-500 italic">Aucun paiement enregistré</p>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Méthode</TableHead>
                        <TableHead>Reçu par</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedCredit.payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            {payment.paidAt.toDate().toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-green-600">
                              {formatCurrency(payment.amount)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {PAYMENT_METHOD_LABELS[payment.paymentMethod]}
                          </TableCell>
                          <TableCell>{payment.receivedByName}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {/* Add Payment Section */}
            {selectedCredit.status !== 'paid' && (
              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-3">Enregistrer un paiement</h4>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <Input
                      type="number"
                      placeholder={`Montant (max ${formatCurrency(selectedCredit.remainingAmount)})`}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      min="1"
                      max={selectedCredit.remainingAmount}
                    />
                  </div>
                  <div className="w-full sm:w-48">
                    <Select
                      options={[
                        { value: 'cash', label: 'Espèces' },
                        { value: 'card', label: 'Carte bancaire' },
                        { value: 'mobile_money', label: 'Mobile Money' },
                      ]}
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleAddPayment}
                    disabled={isSubmitting || !paymentAmount}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {isSubmitting ? 'En cours...' : 'Enregistrer'}
                  </Button>
                </div>
              </div>
            )}

            {/* Status Badge */}
            <div className="flex justify-between items-center pt-2 border-t">
              <Badge
                variant={STATUS_BADGE_VARIANT[selectedCredit.status]}
                className="text-sm px-3 py-1"
              >
                {STATUS_LABELS[selectedCredit.status]}
              </Badge>
              <Button variant="ghost" onClick={handleCloseDetail}>
                Fermer
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default Credits;
