import { useEffect, useState } from 'react';
import { Plus, Search, Edit, Trash2, Truck, Package, Eye } from 'lucide-react';
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
  subscribeToSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  subscribeToDeliveryNotes,
  createDeliveryNote,
  subscribeToProducts,
} from '../lib/firebase/services';
import type { Supplier, SupplierFormData, DeliveryNote, DeliveryNoteItem, Product } from '../types';
import { DELIVERY_STATUS_LABELS } from '../types/supplier';
import { useAuthStore } from '../stores';

export function Suppliers() {
  const { user } = useAuthStore();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'suppliers' | 'deliveryNotes'>('suppliers');

  // Supplier modal
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierForm, setSupplierForm] = useState<SupplierFormData>({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });

  // Delivery note modal
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [deliveryForm, setDeliveryForm] = useState({
    supplierId: '',
    reference: '',
    items: [{ productId: '', productName: '', quantity: 0, unitCost: 0, total: 0 }] as DeliveryNoteItem[],
  });

  // View delivery note modal
  const [viewingNote, setViewingNote] = useState<DeliveryNote | null>(null);

  useEffect(() => {
    const unsubSuppliers = subscribeToSuppliers((data) => {
      setSuppliers(data);
      setIsLoading(false);
    });
    const unsubDeliveryNotes = subscribeToDeliveryNotes((data) => {
      setDeliveryNotes(data);
    });
    const unsubProducts = subscribeToProducts((data) => {
      setProducts(data);
    });

    return () => {
      unsubSuppliers();
      unsubDeliveryNotes();
      unsubProducts();
    };
  }, []);

  // --- Suppliers logic ---

  const filteredSuppliers = suppliers.filter((s) => {
    const term = searchTerm.toLowerCase();
    return (
      s.name.toLowerCase().includes(term) ||
      s.phone.includes(term) ||
      (s.email && s.email.toLowerCase().includes(term))
    );
  });

  const handleOpenSupplierModal = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setSupplierForm({
        name: supplier.name,
        phone: supplier.phone,
        email: supplier.email || '',
        address: supplier.address || '',
        notes: supplier.notes || '',
      });
    } else {
      setEditingSupplier(null);
      setSupplierForm({ name: '', phone: '', email: '', address: '', notes: '' });
    }
    setIsSupplierModalOpen(true);
  };

  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, supplierForm);
        toast.success('Fournisseur modifié avec succès');
      } else {
        await createSupplier(supplierForm);
        toast.success('Fournisseur créé avec succès');
      }
      setIsSupplierModalOpen(false);
    } catch (error) {
      console.error('Error saving supplier:', error);
      toast.error("Erreur lors de l'enregistrement du fournisseur");
    }
  };

  const handleDeleteSupplier = async (supplier: Supplier) => {
    if (confirm(`Supprimer "${supplier.name}" ?`)) {
      try {
        await deleteSupplier(supplier.id);
        toast.success('Fournisseur supprimé');
      } catch (error) {
        console.error('Error deleting supplier:', error);
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  // --- Delivery notes logic ---

  const filteredDeliveryNotes = deliveryNotes.filter((note) => {
    const term = searchTerm.toLowerCase();
    return (
      note.reference.toLowerCase().includes(term) ||
      note.supplierName.toLowerCase().includes(term)
    );
  });

  const handleOpenDeliveryModal = () => {
    setDeliveryForm({
      supplierId: '',
      reference: '',
      items: [{ productId: '', productName: '', quantity: 0, unitCost: 0, total: 0 }],
    });
    setIsDeliveryModalOpen(true);
  };

  const handleDeliveryItemChange = (index: number, field: keyof DeliveryNoteItem, value: string | number) => {
    const newItems = [...deliveryForm.items];
    const item = { ...newItems[index] };

    if (field === 'productId') {
      const product = products.find((p) => p.id === value);
      item.productId = value as string;
      item.productName = product ? product.name : '';
    } else if (field === 'quantity') {
      item.quantity = Number(value);
    } else if (field === 'unitCost') {
      item.unitCost = Number(value);
    }

    item.total = item.quantity * item.unitCost;
    newItems[index] = item;
    setDeliveryForm({ ...deliveryForm, items: newItems });
  };

  const handleAddItem = () => {
    setDeliveryForm({
      ...deliveryForm,
      items: [...deliveryForm.items, { productId: '', productName: '', quantity: 0, unitCost: 0, total: 0 }],
    });
  };

  const handleRemoveItem = (index: number) => {
    if (deliveryForm.items.length <= 1) return;
    const newItems = deliveryForm.items.filter((_, i) => i !== index);
    setDeliveryForm({ ...deliveryForm, items: newItems });
  };

  const deliveryTotal = deliveryForm.items.reduce((sum, item) => sum + item.total, 0);

  const handleDeliverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    const supplier = suppliers.find((s) => s.id === deliveryForm.supplierId);
    if (!supplier) {
      toast.error('Veuillez sélectionner un fournisseur');
      return;
    }

    const validItems = deliveryForm.items.filter((item) => item.productId && item.quantity > 0 && item.unitCost > 0);
    if (validItems.length === 0) {
      toast.error('Veuillez ajouter au moins un article valide');
      return;
    }

    try {
      await createDeliveryNote({
        supplierId: supplier.id,
        supplierName: supplier.name,
        reference: deliveryForm.reference,
        items: validItems,
        totalAmount: validItems.reduce((sum, item) => sum + item.total, 0),
        status: 'received',
        receivedBy: user.id,
        receivedByName: user.displayName,
      });
      setIsDeliveryModalOpen(false);
      toast.success('Bon de livraison créé avec succès');
    } catch (error) {
      console.error('Error creating delivery note:', error);
      toast.error('Erreur lors de la création du bon de livraison');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Fournisseurs</h1>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fournisseurs & Livraisons</h1>
          <p className="text-gray-500">
            {suppliers.length} fournisseur(s) - {deliveryNotes.length} bon(s) de livraison
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'suppliers' ? (
            <Button onClick={() => handleOpenSupplierModal()}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau fournisseur
            </Button>
          ) : (
            <Button onClick={handleOpenDeliveryModal}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau bon
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'suppliers'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Truck className="h-4 w-4 inline-block mr-2" />
          Fournisseurs
        </button>
        <button
          onClick={() => setActiveTab('deliveryNotes')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'deliveryNotes'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Package className="h-4 w-4 inline-block mr-2" />
          Bons de livraison
        </button>
      </div>

      {/* Search */}
      <Card>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={
              activeTab === 'suppliers'
                ? 'Rechercher un fournisseur...'
                : 'Rechercher par référence ou fournisseur...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Content */}
      {activeTab === 'suppliers' ? (
        <Card className="overflow-hidden p-0">
          {filteredSuppliers.length === 0 ? (
            <div className="text-center py-12">
              <Truck className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Aucun fournisseur trouvé</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Adresse</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-primary-50 rounded-full flex items-center justify-center">
                          <span className="text-primary font-medium">
                            {supplier.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <p className="font-medium">{supplier.name}</p>
                      </div>
                    </TableCell>
                    <TableCell>{supplier.phone}</TableCell>
                    <TableCell>{supplier.email || '-'}</TableCell>
                    <TableCell>{supplier.address || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenSupplierModal(supplier)}
                          className="p-1 text-gray-500 hover:text-primary"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSupplier(supplier)}
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
      ) : (
        <Card className="overflow-hidden p-0">
          {filteredDeliveryNotes.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Aucun bon de livraison trouvé</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Référence</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Articles</TableHead>
                  <TableHead>Montant total</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeliveryNotes.map((note) => (
                  <TableRow key={note.id}>
                    <TableCell>
                      {note.createdAt.toDate().toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{note.reference}</span>
                    </TableCell>
                    <TableCell>{note.supplierName}</TableCell>
                    <TableCell>{note.items.length} article(s)</TableCell>
                    <TableCell>
                      <span className="font-medium text-primary">
                        {formatCurrency(note.totalAmount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          note.status === 'received'
                            ? 'success'
                            : note.status === 'partial'
                            ? 'warning'
                            : 'default'
                        }
                      >
                        {DELIVERY_STATUS_LABELS[note.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => setViewingNote(note)}
                        className="p-1 text-gray-500 hover:text-primary"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}

      {/* Supplier Modal */}
      <Modal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        title={editingSupplier ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
        size="md"
      >
        <form onSubmit={handleSupplierSubmit} className="space-y-4">
          <Input
            label="Nom"
            value={supplierForm.name}
            onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
            required
          />
          <Input
            label="Téléphone"
            value={supplierForm.phone}
            onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
            required
          />
          <Input
            label="Email (optionnel)"
            type="email"
            value={supplierForm.email || ''}
            onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
          />
          <Input
            label="Adresse (optionnel)"
            value={supplierForm.address || ''}
            onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optionnel)</label>
            <textarea
              value={supplierForm.notes || ''}
              onChange={(e) => setSupplierForm({ ...supplierForm, notes: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsSupplierModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit">
              {editingSupplier ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delivery Note Modal */}
      <Modal
        isOpen={isDeliveryModalOpen}
        onClose={() => setIsDeliveryModalOpen(false)}
        title="Nouveau bon de livraison"
        size="lg"
      >
        <form onSubmit={handleDeliverySubmit} className="space-y-4">
          <Select
            label="Fournisseur"
            options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
            value={deliveryForm.supplierId}
            onChange={(e) => setDeliveryForm({ ...deliveryForm, supplierId: e.target.value })}
            required
          />
          <Input
            label="Référence"
            value={deliveryForm.reference}
            onChange={(e) => setDeliveryForm({ ...deliveryForm, reference: e.target.value })}
            placeholder="Ex: BL-2026-001"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Articles</label>
            <div className="space-y-3">
              {deliveryForm.items.map((item, index) => (
                <div key={index} className="flex items-end gap-2 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <Select
                      label="Produit"
                      options={products.map((p) => ({
                        value: p.id,
                        label: `${p.name} (${p.code})`,
                      }))}
                      value={item.productId}
                      onChange={(e) => handleDeliveryItemChange(index, 'productId', e.target.value)}
                      required
                    />
                  </div>
                  <div className="w-24">
                    <Input
                      label="Quantité"
                      type="number"
                      min="1"
                      value={item.quantity || ''}
                      onChange={(e) => handleDeliveryItemChange(index, 'quantity', e.target.value)}
                      required
                    />
                  </div>
                  <div className="w-32">
                    <Input
                      label="Coût unitaire"
                      type="number"
                      min="0"
                      value={item.unitCost || ''}
                      onChange={(e) => handleDeliveryItemChange(index, 'unitCost', e.target.value)}
                      required
                    />
                  </div>
                  <div className="w-28 text-right">
                    <p className="text-xs text-gray-500 mb-1">Total</p>
                    <p className="font-medium text-sm">{formatCurrency(item.total)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="p-1 text-gray-400 hover:text-red-500 mb-1"
                    disabled={deliveryForm.items.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <Button type="button" variant="ghost" className="mt-2" onClick={handleAddItem}>
              <Plus className="h-4 w-4 mr-1" />
              Ajouter un article
            </Button>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-lg font-semibold">
              Total: <span className="text-primary">{formatCurrency(deliveryTotal)}</span>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsDeliveryModalOpen(false)}>
                Annuler
              </Button>
              <Button type="submit">Créer le bon</Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* View Delivery Note Modal */}
      <Modal
        isOpen={!!viewingNote}
        onClose={() => setViewingNote(null)}
        title={`Bon de livraison - ${viewingNote?.reference || ''}`}
        size="lg"
      >
        {viewingNote && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Fournisseur</p>
                <p className="font-medium">{viewingNote.supplierName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-medium">
                  {viewingNote.createdAt.toDate().toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Statut</p>
                <Badge
                  variant={
                    viewingNote.status === 'received'
                      ? 'success'
                      : viewingNote.status === 'partial'
                      ? 'warning'
                      : 'default'
                  }
                >
                  {DELIVERY_STATUS_LABELS[viewingNote.status]}
                </Badge>
              </div>
              {viewingNote.receivedByName && (
                <div>
                  <p className="text-sm text-gray-500">Reçu par</p>
                  <p className="font-medium">{viewingNote.receivedByName}</p>
                </div>
              )}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produit</TableHead>
                  <TableHead>Quantité</TableHead>
                  <TableHead>Coût unitaire</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewingNote.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{formatCurrency(item.unitCost)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(item.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-lg font-semibold">
                Total: <span className="text-primary">{formatCurrency(viewingNote.totalAmount)}</span>
              </div>
              <Button variant="ghost" onClick={() => setViewingNote(null)}>
                Fermer
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default Suppliers;
