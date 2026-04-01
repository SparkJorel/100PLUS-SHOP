import { useEffect, useState } from 'react';
import { Plus, Search, Edit, Trash2, Receipt, Calendar } from 'lucide-react';
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
  subscribeToExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseSummaryByCategory,
} from '../lib/firebase/services';
import type { Expense, ExpenseFormData, ExpenseCategory } from '../types';
import { EXPENSE_CATEGORY_LABELS } from '../types/accounting';
import { PAYMENT_METHOD_LABELS } from '../types/sale';
import { useAuthStore } from '../stores';

const CATEGORY_BADGE_VARIANTS: Record<ExpenseCategory, string> = {
  rent: 'info',
  salary: 'success',
  transport: 'warning',
  supplies: 'default',
  utilities: 'info',
  marketing: 'success',
  maintenance: 'warning',
  other: 'default',
};

const defaultFormData: ExpenseFormData = {
  category: 'other',
  description: '',
  amount: 0,
  paymentMethod: 'cash',
  date: new Date().toISOString().split('T')[0],
  reference: '',
};

export function Expenses() {
  const { user } = useAuthStore();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState<ExpenseFormData>(defaultFormData);
  const [categorySummary, setCategorySummary] = useState<
    { category: ExpenseCategory; label: string; total: number; count: number }[]
  >([]);

  useEffect(() => {
    const unsub = subscribeToExpenses((data) => {
      setExpenses(data);
      setIsLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    loadCategorySummary();
  }, []);

  const loadCategorySummary = async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    try {
      const summary = await getExpenseSummaryByCategory(startOfMonth, endOfMonth);
      setCategorySummary(summary);
    } catch (error) {
      console.error('Error loading category summary:', error);
    }
  };

  const currentMonthTotal = expenses
    .filter((exp) => {
      const now = new Date();
      const expDate = exp.date.toDate();
      return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
    })
    .reduce((sum, exp) => sum + exp.amount, 0);

  const filteredExpenses = expenses.filter((exp) => {
    const term = searchTerm.toLowerCase();
    return (
      exp.description.toLowerCase().includes(term) ||
      EXPENSE_CATEGORY_LABELS[exp.category].toLowerCase().includes(term) ||
      (exp.reference && exp.reference.toLowerCase().includes(term))
    );
  });

  const handleOpenAdd = () => {
    setEditingExpense(null);
    setFormData({
      ...defaultFormData,
      date: new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      paymentMethod: expense.paymentMethod,
      date: expense.date.toDate().toISOString().split('T')[0],
      reference: expense.reference || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!user) return;

    if (!formData.description.trim()) {
      toast.warning('Veuillez saisir une description');
      return;
    }
    if (!formData.amount || formData.amount <= 0) {
      toast.warning('Le montant doit être supérieur à 0');
      return;
    }

    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, formData);
        toast.success('Dépense modifiée avec succès');
      } else {
        await createExpense({
          ...formData,
          createdBy: user.id,
          createdByName: user.displayName,
        });
        toast.success('Dépense ajoutée avec succès');
      }
      setIsModalOpen(false);
      loadCategorySummary();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'enregistrement');
    }
  };

  const handleDelete = async (expense: Expense) => {
    if (confirm(`Supprimer la dépense "${expense.description}" ?`)) {
      try {
        await deleteExpense(expense.id);
        toast.success('Dépense supprimée');
        loadCategorySummary();
      } catch (error: any) {
        toast.error(error.message || 'Erreur lors de la suppression');
      }
    }
  };

  const categoryOptions = Object.entries(EXPENSE_CATEGORY_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const paymentMethodOptions = Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dépenses</h1>
          <p className="text-gray-500">{expenses.length} dépense(s) au total</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-red-50 px-4 py-2 rounded-lg">
            <p className="text-sm text-gray-600">Total du mois</p>
            <p className="text-xl font-bold text-red-600">{formatCurrency(currentMonthTotal)}</p>
          </div>
          <Button onClick={handleOpenAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle dépense
          </Button>
        </div>
      </div>

      {/* Category Summary Cards */}
      {categorySummary.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {categorySummary.map((item) => (
            <Card key={item.category}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  {item.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(item.total)}</p>
                <p className="text-xs text-gray-400">{item.count} dépense(s)</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Search */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher par description, catégorie ou référence..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </Card>

      {/* Expenses Table */}
      <Card className="overflow-hidden p-0">
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Aucune dépense trouvée</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Mode de paiement</TableHead>
                <TableHead>Référence</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      {expense.date.toDate().toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={CATEGORY_BADGE_VARIANTS[expense.category] as any}>
                      {EXPENSE_CATEGORY_LABELS[expense.category]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{expense.description}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-red-600">
                      {formatCurrency(expense.amount)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge>{PAYMENT_METHOD_LABELS[expense.paymentMethod as keyof typeof PAYMENT_METHOD_LABELS]}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-gray-500">{expense.reference || '—'}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenEdit(expense)}
                        className="p-1 text-gray-500 hover:text-primary"
                        title="Modifier"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(expense)}
                        className="p-1 text-gray-500 hover:text-red-500"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingExpense ? 'Modifier la dépense' : 'Nouvelle dépense'}
      >
        <div className="space-y-4">
          <Select
            label="Catégorie"
            options={categoryOptions}
            value={formData.category}
            onChange={(e) =>
              setFormData({ ...formData, category: e.target.value as ExpenseCategory })
            }
          />

          <Input
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Ex: Facture électricité mars"
            required
          />

          <Input
            label="Montant"
            type="number"
            min="0"
            step="any"
            value={formData.amount || ''}
            onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
            placeholder="0"
            required
          />

          <Select
            label="Mode de paiement"
            options={paymentMethodOptions}
            value={formData.paymentMethod}
            onChange={(e) =>
              setFormData({ ...formData, paymentMethod: e.target.value as ExpenseFormData['paymentMethod'] })
            }
          />

          <Input
            label="Date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />

          <Input
            label="Référence (optionnel)"
            value={formData.reference || ''}
            onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
            placeholder="Ex: FAC-2026-001"
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmit}>
              {editingExpense ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default Expenses;
