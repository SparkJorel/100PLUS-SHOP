import { useEffect, useState } from 'react';
import { Plus, Search, Edit, Trash2, Users, Phone, Mail } from 'lucide-react';
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
  toast,
} from '../components/ui';
import { formatCurrency } from '../lib/utils';
import {
  subscribeToCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '../lib/firebase/services';
import type { Customer, CustomerFormData } from '../types';

export function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [formData, setFormData] = useState<CustomerFormData>({
    fullName: '',
    phone: '',
    email: '',
    address: '',
  });

  useEffect(() => {
    const unsub = subscribeToCustomers((data) => {
      setCustomers(data);
      setIsLoading(false);
    });
    return unsub;
  }, []);

  const filteredCustomers = customers.filter((customer) => {
    const term = searchTerm.toLowerCase();
    return (
      customer.fullName.toLowerCase().includes(term) ||
      customer.phone.includes(term) ||
      (customer.email && customer.email.toLowerCase().includes(term))
    );
  });

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        fullName: customer.fullName,
        phone: customer.phone,
        email: customer.email || '',
        address: customer.address || '',
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        fullName: '',
        phone: '',
        email: '',
        address: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, formData);
        toast.success('Client modifié avec succès');
      } else {
        await createCustomer(formData);
        toast.success('Client créé avec succès');
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving customer:', error);
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  const handleDelete = async (customer: Customer) => {
    if (confirm(`Supprimer "${customer.fullName}" ?`)) {
      try {
        await deleteCustomer(customer.id);
        toast.success('Client supprimé');
      } catch (error) {
        console.error('Error deleting customer:', error);
        toast.error('Erreur lors de la suppression');
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients Maison</h1>
          <p className="text-gray-500">{customers.length} client(s) enregistré(s)</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau client
        </Button>
      </div>

      {/* Search */}
      <Card>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher par nom, téléphone ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Customers Table */}
      <Card className="overflow-hidden p-0">
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Aucun client trouvé</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Achats</TableHead>
                <TableHead>Total dépensé</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-primary-50 rounded-full flex items-center justify-center">
                        <span className="text-primary font-medium">
                          {customer.fullName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{customer.fullName}</p>
                        {customer.address && (
                          <p className="text-sm text-gray-500">{customer.address}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-3 w-3 text-gray-400" />
                        {customer.phone}
                      </div>
                      {customer.email && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Mail className="h-3 w-3 text-gray-400" />
                          {customer.email}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{customer.purchasesCount}</span>
                    <span className="text-gray-500 text-sm"> achats</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-primary">
                      {formatCurrency(customer.totalPurchases)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenModal(customer)}
                        className="p-1 text-gray-500 hover:text-primary"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(customer)}
                        className="p-1 text-gray-500 hover:text-red-500"
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

      {/* Customer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? 'Modifier le client' : 'Nouveau client'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nom complet"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            required
          />
          <Input
            label="Téléphone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
          />
          <Input
            label="Email (optionnel)"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <Input
            label="Adresse (optionnel)"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit">
              {editingCustomer ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Customers;
