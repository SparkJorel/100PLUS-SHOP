import { useEffect, useState } from 'react';
import { DollarSign, Clock, CheckCircle, AlertTriangle, Plus } from 'lucide-react';
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
import {
  subscribeToSessions,
  getOpenSession,
  openCashRegister,
  closeCashRegister,
} from '../lib/firebase/services';
import type { CashRegisterSession } from '../types';
import { useAuthStore } from '../stores';

export function CashRegister() {
  const { user } = useAuthStore();
  const [sessions, setSessions] = useState<CashRegisterSession[]>([]);
  const [currentSession, setCurrentSession] = useState<CashRegisterSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);

  // Open modal form
  const [openingAmount, setOpeningAmount] = useState<number>(0);
  const [openNotes, setOpenNotes] = useState('');

  // Close modal form
  const [closingAmount, setClosingAmount] = useState<number>(0);
  const [closeNotes, setCloseNotes] = useState('');

  useEffect(() => {
    const unsub = subscribeToSessions((data) => {
      setSessions(data);
      setIsLoading(false);
    });

    getOpenSession().then(setCurrentSession);

    return unsub;
  }, []);

  // Refresh current session when sessions list updates
  useEffect(() => {
    const open = sessions.find((s) => s.status === 'open') || null;
    setCurrentSession(open);
  }, [sessions]);

  const handleOpenRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await openCashRegister({
        openedBy: user.id,
        openedByName: user.displayName,
        openingAmount,
        notes: openNotes,
      });
      setIsOpenModalOpen(false);
      setOpeningAmount(0);
      setOpenNotes('');
      toast.success('Caisse ouverte avec succès');
    } catch (error: any) {
      console.error('Error opening cash register:', error);
      toast.error(error.message || "Erreur lors de l'ouverture de la caisse");
    }
  };

  const handleCloseRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSession) return;

    try {
      await closeCashRegister(currentSession.id, {
        closingAmount,
        notes: closeNotes,
      });
      setIsCloseModalOpen(false);
      setClosingAmount(0);
      setCloseNotes('');
      toast.success('Caisse fermée avec succès');
    } catch (error: any) {
      console.error('Error closing cash register:', error);
      toast.error(error.message || 'Erreur lors de la fermeture de la caisse');
    }
  };

  const handleOpenCloseModal = () => {
    if (currentSession) {
      setClosingAmount(0);
      setCloseNotes('');
    }
    setIsCloseModalOpen(true);
  };

  // Calculate expected amount for the close modal display
  const expectedAmount = currentSession ? currentSession.expectedAmount : 0;
  const closeDifference = closingAmount - expectedAmount;

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion de la Caisse</h1>
          <p className="text-gray-500">{sessions.length} session(s) enregistrée(s)</p>
        </div>
      </div>

      {/* Current Session Status */}
      {currentSession ? (
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="text-green-800 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Caisse ouverte
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-600">Ouverte par</p>
                <p className="font-medium">{currentSession.openedByName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Heure d'ouverture</p>
                <p className="font-medium flex items-center gap-1">
                  <Clock className="h-4 w-4 text-gray-400" />
                  {currentSession.openedAt.toDate().toLocaleString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Montant d'ouverture</p>
                <p className="font-medium text-green-700 flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  {formatCurrency(currentSession.openingAmount)}
                </p>
              </div>
            </div>
            <Button variant="danger" onClick={handleOpenCloseModal}>
              <AlertTriangle className="h-4 w-4 mr-2" />
              Fermer la caisse
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gray-50 border-gray-200">
          <CardContent>
            <div className="text-center py-6">
              <DollarSign className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 mb-4">Aucune caisse ouverte actuellement</p>
              <Button
                onClick={() => {
                  setOpeningAmount(0);
                  setOpenNotes('');
                  setIsOpenModalOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Ouvrir la caisse
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session History */}
      <Card className="overflow-hidden p-0">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Historique des sessions</h2>
        </div>
        {sessions.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Aucune session enregistrée</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Ouvert par</TableHead>
                <TableHead>Montant ouverture</TableHead>
                <TableHead>Montant fermeture</TableHead>
                <TableHead>Montant attendu</TableHead>
                <TableHead>Écart</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>
                    {session.openedAt.toDate().toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </TableCell>
                  <TableCell>{session.openedByName}</TableCell>
                  <TableCell>{formatCurrency(session.openingAmount)}</TableCell>
                  <TableCell>
                    {session.status === 'closed'
                      ? formatCurrency(session.closingAmount)
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {session.status === 'closed'
                      ? formatCurrency(session.expectedAmount)
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {session.status === 'closed' ? (
                      <span
                        className={
                          session.difference > 0
                            ? 'text-green-600 font-medium'
                            : session.difference < 0
                            ? 'text-red-600 font-medium'
                            : 'text-gray-600'
                        }
                      >
                        {session.difference > 0 ? '+' : ''}
                        {formatCurrency(session.difference)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={session.status === 'open' ? 'success' : 'default'}>
                      {session.status === 'open' ? 'Ouverte' : 'Fermée'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Open Cash Register Modal */}
      <Modal
        isOpen={isOpenModalOpen}
        onClose={() => setIsOpenModalOpen(false)}
        title="Ouvrir la caisse"
        size="md"
      >
        <form onSubmit={handleOpenRegister} className="space-y-4">
          <Input
            label="Montant d'ouverture"
            type="number"
            min="0"
            step="any"
            value={openingAmount}
            onChange={(e) => setOpeningAmount(Number(e.target.value))}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optionnel)
            </label>
            <textarea
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              rows={3}
              value={openNotes}
              onChange={(e) => setOpenNotes(e.target.value)}
              placeholder="Notes ou observations..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsOpenModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit">
              <Plus className="h-4 w-4 mr-2" />
              Ouvrir la caisse
            </Button>
          </div>
        </form>
      </Modal>

      {/* Close Cash Register Modal */}
      <Modal
        isOpen={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
        title="Fermer la caisse"
        size="md"
      >
        <form onSubmit={handleCloseRegister} className="space-y-4">
          {/* Expected Amount Display */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Montant d'ouverture</span>
              <span className="font-medium">
                {formatCurrency(currentSession?.openingAmount ?? 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Ventes en espèces</span>
              <span className="font-medium">
                {formatCurrency((currentSession?.expectedAmount ?? 0) - (currentSession?.openingAmount ?? 0))}
              </span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="font-semibold">Montant attendu</span>
              <span className="font-bold text-primary">{formatCurrency(expectedAmount)}</span>
            </div>
          </div>

          <Input
            label="Montant compté en caisse"
            type="number"
            min="0"
            step="any"
            value={closingAmount}
            onChange={(e) => setClosingAmount(Number(e.target.value))}
            required
          />

          {/* Difference Display */}
          {closingAmount > 0 && (
            <div
              className={`p-3 rounded-lg ${
                closeDifference > 0
                  ? 'bg-green-50 border border-green-200'
                  : closeDifference < 0
                  ? 'bg-red-50 border border-red-200'
                  : 'bg-gray-50 border border-gray-200'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  {closeDifference > 0
                    ? 'Excédent'
                    : closeDifference < 0
                    ? 'Déficit'
                    : 'Aucun écart'}
                </span>
                <span
                  className={`font-bold ${
                    closeDifference > 0
                      ? 'text-green-600'
                      : closeDifference < 0
                      ? 'text-red-600'
                      : 'text-gray-600'
                  }`}
                >
                  {closeDifference > 0 ? '+' : ''}
                  {formatCurrency(closeDifference)}
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optionnel)
            </label>
            <textarea
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              rows={3}
              value={closeNotes}
              onChange={(e) => setCloseNotes(e.target.value)}
              placeholder="Observations de fermeture..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsCloseModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="danger">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Fermer la caisse
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default CashRegister;
