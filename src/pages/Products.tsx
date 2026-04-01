import { useEffect, useState, useRef } from 'react';
import { Plus, Search, Edit, Trash2, Package, Upload, Image, Download, QrCode, Printer } from 'lucide-react';
import {
  Button,
  Input,
  Select,
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
  Pagination,
  usePagination,
} from '../components/ui';
import { formatCurrency, generateBarcodeSVG, generateBarcodesPrintHTML } from '../lib/utils';
import {
  subscribeToProducts,
  subscribeToCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  createCategory,
  initializeDefaultCategories,
  generateProductCode,
} from '../lib/firebase/services';
import type { Product, Category } from '../types';
import { SIZES } from '../types';

interface ProductFormState {
  code: string;
  name: string;
  description: string;
  categoryId: string;
  size: string;
  color: string;
  prixAchat: number;
  prixDetail: number;
  prixMaison: number;
  quantity: number;
  minStock: number;
}

const initialFormState: ProductFormState = {
  code: '',
  name: '',
  description: '',
  categoryId: '',
  size: 'M',
  color: '',
  prixAchat: 0,
  prixDetail: 0,
  prixMaison: 0,
  quantity: 0,
  minStock: 5,
};

export function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Form state
  const [formData, setFormData] = useState<ProductFormState>(initialFormState);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // CSV import state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importProducts, setImportProducts] = useState<Omit<ProductFormState, 'description'>[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Barcode modal state
  const [barcodeProduct, setBarcodeProduct] = useState<Product | null>(null);

  useEffect(() => {
    initializeDefaultCategories();

    const unsubProducts = subscribeToProducts(setProducts);
    const unsubCategories = subscribeToCategories((cats) => {
      setCategories(cats);
      setIsLoading(false);
    });

    return () => {
      unsubProducts();
      unsubCategories();
    };
  }, []);

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || product.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const {
    paginatedItems: paginatedProducts,
    currentPage,
    totalPages,
    setCurrentPage,
    pageSize,
    setPageSize,
  } = usePagination(filteredProducts);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleOpenModal = async (product?: Product) => {
    setImageFile(null);
    if (product) {
      setEditingProduct(product);
      setImagePreview(product.imageUrl || null);
      setFormData({
        code: product.code,
        name: product.name,
        description: product.description || '',
        categoryId: product.categoryId,
        size: product.size,
        color: product.color,
        prixAchat: product.prixAchat,
        prixDetail: product.prixDetail,
        prixMaison: product.prixMaison,
        quantity: product.quantity,
        minStock: product.minStock,
      });
    } else {
      setImagePreview(null);
      setEditingProduct(null);
      const defaultCategory = categories[0];
      const code = defaultCategory ? await generateProductCode(defaultCategory.name) : '';
      setFormData({
        ...initialFormState,
        categoryId: defaultCategory?.id || '',
        code,
      });
    }
    setIsModalOpen(true);
  };

  // Regenerate code when category changes (only for new products)
  const handleCategoryChange = async (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    if (!editingProduct && category) {
      const code = await generateProductCode(category.name);
      setFormData({ ...formData, categoryId, code });
    } else {
      setFormData({ ...formData, categoryId });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      toast.error('Le nom du produit est obligatoire');
      return;
    }
    if (formData.prixAchat < 0) {
      toast.error('Le prix d\'achat ne peut pas être négatif');
      return;
    }
    if (formData.prixDetail < 0) {
      toast.error('Le prix détail ne peut pas être négatif');
      return;
    }
    if (formData.prixMaison < 0) {
      toast.error('Le prix maison ne peut pas être négatif');
      return;
    }
    if (formData.prixDetail < formData.prixAchat) {
      toast.error('Le prix détail doit être supérieur ou égal au prix d\'achat');
      return;
    }
    if (formData.prixMaison < formData.prixAchat) {
      toast.error('Le prix maison doit être supérieur ou égal au prix d\'achat');
      return;
    }
    if (formData.quantity < 0) {
      toast.error('La quantité ne peut pas être négative');
      return;
    }
    if (formData.minStock < 0) {
      toast.error('Le stock minimum ne peut pas être négatif');
      return;
    }

    const category = categories.find((c) => c.id === formData.categoryId);
    const productData = {
      code: formData.code,
      name: formData.name,
      description: formData.description,
      categoryId: formData.categoryId,
      categoryName: category?.name || '',
      size: formData.size,
      color: formData.color,
      prixAchat: formData.prixAchat,
      prixDetail: formData.prixDetail,
      prixMaison: formData.prixMaison,
      quantity: formData.quantity,
      minStock: formData.minStock,
      isActive: true,
    };

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, productData, imageFile || undefined);
        toast.success('Produit modifié avec succès');
      } else {
        await createProduct(productData, imageFile || undefined);
        toast.success('Produit créé avec succès');
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Erreur lors de l\'enregistrement du produit');
    }
  };

  const handleDelete = async (product: Product) => {
    if (confirm(`Supprimer "${product.name}" ?`)) {
      try {
        await deleteProduct(product.id);
        toast.success('Produit supprimé');
      } catch (error) {
        console.error('Error deleting product:', error);
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  // --- CSV Export ---
  const handleExportCSV = () => {
    const headers = ['Code', 'Nom', 'Catégorie', 'Taille', 'Couleur', 'Prix Achat', 'Prix Détail', 'Prix Maison', 'Quantité', 'Stock Min'];
    const rows = products.map((p) => [
      p.code,
      p.name,
      p.categoryName,
      p.size,
      p.color,
      p.prixAchat,
      p.prixDetail,
      p.prixMaison,
      p.quantity,
      p.minStock,
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'));

    const bom = '\uFEFF';
    const csv = bom + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'produits_100plus.csv';
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`${products.length} produit(s) exporté(s)`);
  };

  // --- CSV Import ---
  const handleCSVFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        toast.error('Le fichier CSV est vide ou invalide');
        return;
      }

      // Detect separator
      const sep = lines[0].includes(';') ? ';' : ',';
      const headers = lines[0].split(sep).map((h) => h.replace(/"/g, '').trim().toLowerCase());

      const requiredCols = ['code', 'nom', 'prix détail', 'prix maison', 'quantité'];
      const missing = requiredCols.filter((c) => !headers.some((h) => h.includes(c.normalize('NFD').replace(/[\u0300-\u036f]/g, '')) || h.includes(c)));
      // More lenient check: normalize both sides
      const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const headersNorm = headers.map(normalize);
      const missingStrict = requiredCols.filter((c) => !headersNorm.some((h) => h.includes(normalize(c))));

      if (missingStrict.length > 0) {
        toast.error(`Colonnes manquantes : ${missingStrict.join(', ')}`);
        return;
      }

      const colIndex = (name: string) => headersNorm.findIndex((h) => h.includes(normalize(name)));

      const parsed: Omit<ProductFormState, 'description'>[] = [];
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(sep).map((v) => v.replace(/^"|"$/g, '').trim());
        if (vals.length < 2) continue;
        parsed.push({
          code: vals[colIndex('code')] || '',
          name: vals[colIndex('nom')] || '',
          categoryId: '',
          size: vals[colIndex('taille')] || 'M',
          color: vals[colIndex('couleur')] || '',
          prixAchat: Number(vals[colIndex('prix achat')]) || 0,
          prixDetail: Number(vals[colIndex('prix detail')]) || 0,
          prixMaison: Number(vals[colIndex('prix maison')]) || 0,
          quantity: Number(vals[colIndex('quantite')]) || 0,
          minStock: Number(vals[colIndex('stock min')]) || 5,
        });
      }

      if (parsed.length === 0) {
        toast.error('Aucun produit valide trouvé dans le fichier');
        return;
      }

      setImportProducts(parsed);
      setIsImportModalOpen(true);
    };
    reader.readAsText(file, 'UTF-8');
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const handleConfirmImport = async () => {
    setIsImporting(true);
    let success = 0;
    let errors = 0;
    const defaultCategory = categories[0];

    for (const p of importProducts) {
      try {
        // Try to match category by name from CSV, fallback to first category
        const matchedCat = categories.find(
          (c) => c.name.toLowerCase() === (p as any).categoryName?.toLowerCase()
        );
        await createProduct({
          code: p.code,
          name: p.name,
          description: '',
          categoryId: matchedCat?.id || defaultCategory?.id || '',
          categoryName: matchedCat?.name || defaultCategory?.name || '',
          size: p.size,
          color: p.color,
          prixAchat: p.prixAchat,
          prixDetail: p.prixDetail,
          prixMaison: p.prixMaison,
          quantity: p.quantity,
          minStock: p.minStock,
          isActive: true,
        });
        success++;
      } catch {
        errors++;
      }
    }

    setIsImporting(false);
    setIsImportModalOpen(false);
    setImportProducts([]);
    if (errors > 0) {
      toast.error(`${success} importé(s), ${errors} erreur(s)`);
    } else {
      toast.success(`${success} produit(s) importé(s) avec succès`);
    }
  };

  // --- Barcode ---
  const handlePrintBarcode = (product: Product) => {
    setBarcodeProduct(product);
  };

  const handlePrintSingleBarcode = () => {
    window.print();
  };

  const handlePrintAllBarcodes = () => {
    const html = generateBarcodesPrintHTML(
      filteredProducts.map((p) => ({ code: p.code, name: p.name, prixDetail: p.prixDetail })),
      formatCurrency
    );
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  const handleAddCategory = async () => {
    if (newCategoryName.trim()) {
      await createCategory({ name: newCategoryName.trim(), description: '' });
      setNewCategoryName('');
      setIsCategoryModalOpen(false);
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
          <h1 className="text-2xl font-bold text-gray-900">Produits</h1>
          <p className="text-gray-500">{products.length} produit(s) au total</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" onClick={() => setIsCategoryModalOpen(true)}>
            + Catégorie
          </Button>
          <Button variant="secondary" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Exporter CSV
          </Button>
          <Button variant="secondary" onClick={() => csvInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Importer CSV
          </Button>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv"
            onChange={handleCSVFileChange}
            className="hidden"
          />
          <Button variant="secondary" onClick={handlePrintAllBarcodes} disabled={filteredProducts.length === 0}>
            <Printer className="h-4 w-4 mr-2" />
            Codes-barres
          </Button>
          <Button onClick={() => handleOpenModal()}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau produit
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher un produit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select
            options={[
              { value: '', label: 'Toutes les catégories' },
              ...categories.map((c) => ({ value: c.id, label: c.name })),
            ]}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="sm:w-48"
          />
        </div>
      </Card>

      {/* Products Table */}
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
                <TableHead>Prix Détail</TableHead>
                <TableHead>Prix Maison</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="h-10 w-10 object-cover rounded" />
                      ) : (
                        <div className="h-10 w-10 bg-gray-100 rounded flex items-center justify-center">
                          <Package className="h-5 w-5 text-gray-300" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-gray-500">{product.code}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge>{product.categoryName}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {product.size} / {product.color}
                    </span>
                  </TableCell>
                  <TableCell>{formatCurrency(product.prixDetail)}</TableCell>
                  <TableCell>{formatCurrency(product.prixMaison)}</TableCell>
                  <TableCell>
                    <Badge variant={product.quantity <= product.minStock ? 'danger' : 'success'}>
                      {product.quantity}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePrintBarcode(product)}
                        className="p-1 text-gray-500 hover:text-primary"
                        title="Code-barres"
                      >
                        <QrCode className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleOpenModal(product)}
                        className="p-1 text-gray-500 hover:text-primary"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(product)}
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
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
        />
      </Card>

      {/* Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'Modifier le produit' : 'Nouveau produit'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Code / Référence (auto-généré)"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              disabled={!editingProduct}
              required
            />
            <Input
              label="Nom du produit"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <Select
            label="Catégorie"
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            value={formData.categoryId}
            onChange={(e) => handleCategoryChange(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Taille"
              options={SIZES.map((s) => ({ value: s, label: s }))}
              value={formData.size}
              onChange={(e) => setFormData({ ...formData, size: e.target.value })}
              required
            />
            <Input
              label="Couleur"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Prix d'achat"
              type="number"
              value={formData.prixAchat}
              onChange={(e) => setFormData({ ...formData, prixAchat: Number(e.target.value) })}
              required
            />
            <Input
              label="Prix Détail"
              type="number"
              value={formData.prixDetail}
              onChange={(e) => setFormData({ ...formData, prixDetail: Number(e.target.value) })}
              required
            />
            <Input
              label="Prix Maison"
              type="number"
              value={formData.prixMaison}
              onChange={(e) => setFormData({ ...formData, prixMaison: Number(e.target.value) })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Quantité en stock"
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
              required
            />
            <Input
              label="Stock minimum (alerte)"
              type="number"
              value={formData.minStock}
              onChange={(e) => setFormData({ ...formData, minStock: Number(e.target.value) })}
              required
            />
          </div>

          {/* Image Upload */}
          <div>
            <p className="block text-sm font-medium text-gray-700 mb-1">Image du produit</p>
            <div className="flex items-center gap-4">
              {imagePreview ? (
                <img src={imagePreview} alt="Aperçu" className="h-20 w-20 object-cover rounded-lg border" />
              ) : (
                <div className="h-20 w-20 bg-gray-100 rounded-lg border flex items-center justify-center">
                  <Image className="h-8 w-8 text-gray-300" />
                </div>
              )}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  {imagePreview ? 'Changer' : 'Ajouter'}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit">
              {editingProduct ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Category Modal */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Nouvelle catégorie"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Nom de la catégorie"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Ex: Vêtements"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsCategoryModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddCategory}>Créer</Button>
          </div>
        </div>
      </Modal>

      {/* CSV Import Preview Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => { setIsImportModalOpen(false); setImportProducts([]); }}
        title={`Aperçu de l'import (${importProducts.length} produit(s))`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="max-h-96 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Taille</TableHead>
                  <TableHead>Couleur</TableHead>
                  <TableHead>Prix Détail</TableHead>
                  <TableHead>Prix Maison</TableHead>
                  <TableHead>Qté</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importProducts.map((p, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{p.code}</TableCell>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>{p.size}</TableCell>
                    <TableCell>{p.color}</TableCell>
                    <TableCell>{formatCurrency(p.prixDetail)}</TableCell>
                    <TableCell>{formatCurrency(p.prixMaison)}</TableCell>
                    <TableCell>{p.quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setIsImportModalOpen(false); setImportProducts([]); }}>
              Annuler
            </Button>
            <Button onClick={handleConfirmImport} disabled={isImporting}>
              {isImporting ? 'Import en cours...' : `Confirmer l'import (${importProducts.length})`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Barcode Modal */}
      <Modal
        isOpen={!!barcodeProduct}
        onClose={() => setBarcodeProduct(null)}
        title="Code-barres"
        size="sm"
      >
        {barcodeProduct && (
          <div className="space-y-4">
            <div id="barcode-print" className="text-center p-4">
              <p className="font-bold text-lg mb-1">{barcodeProduct.name}</p>
              <p className="text-sm text-gray-500 mb-1">{barcodeProduct.code}</p>
              <p className="text-sm font-semibold mb-3">{formatCurrency(barcodeProduct.prixDetail)}</p>
              <div
                className="flex justify-center"
                dangerouslySetInnerHTML={{ __html: generateBarcodeSVG(barcodeProduct.code, 250, 70) }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setBarcodeProduct(null)}>
                Fermer
              </Button>
              <Button onClick={handlePrintSingleBarcode}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimer
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default Products;
