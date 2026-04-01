import { useEffect, useState, useRef } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, User, Check, Printer, CreditCard, Banknote, Smartphone } from 'lucide-react';
import { Button, Input, Modal, Badge, Select, toast } from '../components/ui';
import { formatCurrency } from '../lib/utils';
import { subscribeToProducts, subscribeToCustomers, createSale } from '../lib/firebase/services';
import type { Product, Customer, SaleItem, PaymentMethod } from '../types';
import { PAYMENT_METHOD_LABELS } from '../types/sale';
import { useAuthStore } from '../stores';

interface CartItem extends SaleItem {
  product: Product;
}

export function POS() {
  const { user } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerType, setCustomerType] = useState<'lambda' | 'maison'>('lambda');
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountReceived, setAmountReceived] = useState(0);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [lastSale, setLastSale] = useState<{
    saleNumber: string;
    items: SaleItem[];
    customerName?: string;
    subtotal: number;
    discount: number;
    total: number;
    paymentMethod: PaymentMethod;
    amountReceived: number;
    change: number;
    date: Date;
  } | null>(null);

  useEffect(() => {
    const unsubProducts = subscribeToProducts(setProducts);
    const unsubCustomers = subscribeToCustomers(setCustomers);
    // Auto-focus search input for barcode scanner
    searchInputRef.current?.focus();
    return () => {
      unsubProducts();
      unsubCustomers();
    };
  }, []);

  // Barcode scan: if search term matches an exact product code, auto-add to cart
  useEffect(() => {
    if (!searchTerm) return;
    const exactMatch = products.find(
      (p) => p.code.toLowerCase() === searchTerm.toLowerCase() && p.quantity > 0
    );
    if (exactMatch) {
      addToCart(exactMatch);
      setSearchTerm('');
      searchInputRef.current?.focus();
    }
  }, [searchTerm, products]);

  const filteredProducts = products.filter((product) => {
    const term = searchTerm.toLowerCase();
    return (
      product.quantity > 0 &&
      (product.name.toLowerCase().includes(term) ||
        product.code.toLowerCase().includes(term))
    );
  });

  const filteredCustomers = customers.filter((customer) => {
    const term = customerSearch.toLowerCase();
    return (
      customer.fullName.toLowerCase().includes(term) ||
      customer.phone.includes(term)
    );
  });

  const getPrice = (product: Product) => {
    return customerType === 'maison' ? product.prixMaison : product.prixDetail;
  };

  const addToCart = (product: Product) => {
    const existingIndex = cart.findIndex(
      (item) => item.productId === product.id
    );

    if (existingIndex >= 0) {
      const updatedCart = [...cart];
      const item = updatedCart[existingIndex];
      if (item.quantity < product.quantity) {
        item.quantity += 1;
        item.total = item.quantity * item.unitPrice;
        setCart(updatedCart);
      }
    } else {
      const price = getPrice(product);
      const newItem: CartItem = {
        product,
        productId: product.id,
        productCode: product.code,
        productName: product.name,
        size: product.size,
        color: product.color,
        quantity: 1,
        unitPrice: price,
        total: price,
      };
      setCart([...cart, newItem]);
    }
  };

  const updateQuantity = (index: number, delta: number) => {
    const updatedCart = [...cart];
    const item = updatedCart[index];
    const newQuantity = item.quantity + delta;

    if (newQuantity <= 0) {
      updatedCart.splice(index, 1);
    } else if (newQuantity <= item.product.quantity) {
      item.quantity = newQuantity;
      item.total = item.quantity * item.unitPrice;
    }

    setCart(updatedCart);
  };

  const removeFromCart = (index: number) => {
    const updatedCart = [...cart];
    updatedCart.splice(index, 1);
    setCart(updatedCart);
  };

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerType('maison');
    setIsCustomerModalOpen(false);

    // Update cart prices for maison customer
    const updatedCart = cart.map((item) => ({
      ...item,
      unitPrice: item.product.prixMaison,
      total: item.quantity * item.product.prixMaison,
    }));
    setCart(updatedCart);
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerType('lambda');

    // Update cart prices for lambda customer
    const updatedCart = cart.map((item) => ({
      ...item,
      unitPrice: item.product.prixDetail,
      total: item.quantity * item.product.prixDetail,
    }));
    setCart(updatedCart);
  };

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const total = subtotal - discount;

  const handlePayment = async () => {
    if (!user || cart.length === 0) return;

    setIsProcessing(true);

    try {
      const saleItems: SaleItem[] = cart.map((item) => ({
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
      }));

      const currentSubtotal = subtotal;
      const currentDiscount = discount;
      const currentTotal = total;
      const currentCustomerName = selectedCustomer?.fullName;
      const currentItems = [...saleItems];
      const currentPaymentMethod = paymentMethod;
      const currentAmountReceived = amountReceived;
      const currentChange = currentPaymentMethod === 'cash' ? Math.max(0, currentAmountReceived - currentTotal) : 0;

      await createSale({
        items: saleItems,
        customerId: selectedCustomer?.id,
        customerName: selectedCustomer?.fullName,
        customerType,
        subtotal: currentSubtotal,
        discount: currentDiscount,
        total: currentTotal,
        paymentMethod: currentPaymentMethod,
        soldBy: user.id,
        soldByName: user.displayName,
      });

      setLastSale({
        saleNumber: '', // Will be set from Firestore but we show a placeholder
        items: currentItems,
        customerName: currentCustomerName,
        subtotal: currentSubtotal,
        discount: currentDiscount,
        total: currentTotal,
        paymentMethod: currentPaymentMethod,
        amountReceived: currentAmountReceived,
        change: currentChange,
        date: new Date(),
      });

      // Reset cart
      setCart([]);
      setDiscount(0);
      setAmountReceived(0);
      setPaymentMethod('cash');
      setSelectedCustomer(null);
      setCustomerType('lambda');

      // Show receipt
      setIsReceiptModalOpen(true);
    } catch (error: unknown) {
      console.error('Error creating sale:', error);
      const message = error instanceof Error ? error.message : 'Erreur lors de la vente';
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-4">
      {/* Products Section */}
      <div className="flex-1 flex flex-col">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Caisse</h1>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            ref={searchInputRef}
            placeholder="Scanner ou rechercher un produit (nom ou code)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="bg-white p-4 rounded-lg border border-gray-200 hover:border-primary hover:shadow-md transition-all text-left"
              >
                <div className="flex justify-between items-start mb-2">
                  <Badge variant={product.quantity <= product.minStock ? 'danger' : 'default'}>
                    {product.quantity} en stock
                  </Badge>
                </div>
                <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">{product.name}</h3>
                <p className="text-xs text-gray-500 mb-2">
                  {product.size} / {product.color}
                </p>
                <p className="text-lg font-bold text-primary">
                  {formatCurrency(getPrice(product))}
                </p>
                {customerType === 'maison' && (
                  <p className="text-xs text-gray-400 line-through">
                    {formatCurrency(product.prixDetail)}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Section */}
      <div className="w-96 bg-white rounded-xl shadow-lg flex flex-col">
        {/* Customer Selection */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Client</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCustomerModalOpen(true)}
            >
              <User className="h-4 w-4 mr-1" />
              Sélectionner
            </Button>
          </div>
          {selectedCustomer ? (
            <div className="flex items-center justify-between bg-primary-50 p-2 rounded-lg">
              <div>
                <p className="font-medium text-primary">{selectedCustomer.fullName}</p>
                <p className="text-xs text-gray-500">Client Maison - Prix réduit</p>
              </div>
              <button onClick={clearCustomer} className="text-gray-400 hover:text-red-500">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="bg-gray-50 p-2 rounded-lg">
              <p className="text-gray-600">Client Lambda</p>
              <p className="text-xs text-gray-400">Prix standard</p>
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ShoppingCart className="h-12 w-12 mx-auto text-gray-300 mb-2" />
              <p>Panier vide</p>
              <p className="text-sm">Cliquez sur un produit pour l'ajouter</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item, index) => (
                <div key={index} className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.productName}</p>
                      <p className="text-xs text-gray-500">
                        {item.size} / {item.color}
                      </p>
                    </div>
                    <button
                      onClick={() => removeFromCart(index)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(index, -1)}
                        className="p-1 bg-white rounded border hover:bg-gray-100"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(index, 1)}
                        className="p-1 bg-white rounded border hover:bg-gray-100"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="font-medium">{formatCurrency(item.total)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals & Payment */}
        <div className="p-4 border-t bg-gray-50">
          <div className="space-y-2 mb-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Sous-total</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm items-center">
              <span className="text-gray-500">Remise</span>
              <Input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="w-24 text-right py-1"
                min="0"
                max={subtotal}
              />
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="mb-3">
            <p className="text-xs font-medium text-gray-500 mb-2">Mode de paiement</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs font-medium transition-all ${
                  paymentMethod === 'cash'
                    ? 'border-primary bg-primary-50 text-primary'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <Banknote className="h-4 w-4" />
                Espèces
              </button>
              <button
                onClick={() => setPaymentMethod('card')}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs font-medium transition-all ${
                  paymentMethod === 'card'
                    ? 'border-primary bg-primary-50 text-primary'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <CreditCard className="h-4 w-4" />
                Carte
              </button>
              <button
                onClick={() => setPaymentMethod('mobile_money')}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs font-medium transition-all ${
                  paymentMethod === 'mobile_money'
                    ? 'border-primary bg-primary-50 text-primary'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <Smartphone className="h-4 w-4" />
                Mobile
              </button>
            </div>
          </div>

          {/* Amount Received & Change (only for cash) */}
          {paymentMethod === 'cash' && cart.length > 0 && (
            <div className="mb-3 space-y-2">
              <div className="flex justify-between text-sm items-center">
                <span className="text-gray-500">Montant reçu</span>
                <Input
                  type="number"
                  value={amountReceived || ''}
                  onChange={(e) => setAmountReceived(Number(e.target.value))}
                  className="w-28 text-right py-1"
                  min="0"
                  placeholder="0"
                />
              </div>
              {amountReceived > 0 && (
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-gray-500">Monnaie à rendre</span>
                  <span className={amountReceived >= total ? 'text-green-600' : 'text-red-600'}>
                    {amountReceived >= total
                      ? formatCurrency(amountReceived - total)
                      : `Manque ${formatCurrency(total - amountReceived)}`}
                  </span>
                </div>
              )}
            </div>
          )}

          <Button
            className="w-full"
            size="lg"
            onClick={handlePayment}
            disabled={cart.length === 0 || isProcessing || (paymentMethod === 'cash' && amountReceived > 0 && amountReceived < total)}
          >
            {isProcessing ? (
              <>Traitement en cours...</>
            ) : (
              <>
                <Check className="h-5 w-5 mr-2" />
                Valider la vente
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Customer Selection Modal */}
      <Modal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        title="Sélectionner un client maison"
        size="md"
      >
        <div className="space-y-4">
          <Input
            placeholder="Rechercher par nom ou téléphone..."
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
          />
          <div className="max-h-64 overflow-y-auto space-y-2">
            {filteredCustomers.map((customer) => (
              <button
                key={customer.id}
                onClick={() => selectCustomer(customer)}
                className="w-full p-3 text-left bg-gray-50 rounded-lg hover:bg-primary-50 hover:border-primary border border-transparent transition-all"
              >
                <p className="font-medium">{customer.fullName}</p>
                <p className="text-sm text-gray-500">{customer.phone}</p>
              </button>
            ))}
            {filteredCustomers.length === 0 && (
              <p className="text-center text-gray-500 py-4">Aucun client trouvé</p>
            )}
          </div>
        </div>
      </Modal>

      {/* Receipt Modal */}
      <Modal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        title="Vente enregistrée"
        size="md"
      >
        {lastSale && (
          <div className="space-y-4">
            {/* Success message */}
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Check className="h-12 w-12 mx-auto text-green-500 mb-2" />
              <p className="text-lg font-bold text-green-700">Vente validée !</p>
            </div>

            {/* Receipt */}
            <div className="border rounded-lg p-4 bg-white" id="receipt">
              <div className="text-center border-b pb-3 mb-3">
                <img src="/logo_100plus.jpg" alt="100PLUS SHOP" className="h-10 mx-auto mb-1 object-contain" />
                <p className="text-xs text-gray-500">Boutique de mode & accessoires</p>
                <p className="text-xs text-gray-500">Tel: +XXX XX XX XX XX</p>
                <p className="text-xs text-gray-400 mt-1">Reçu de vente</p>
              </div>

              <div className="text-sm space-y-1 border-b pb-3 mb-3">
                <p><span className="text-gray-500">N°:</span> {lastSale.saleNumber}</p>
                <p><span className="text-gray-500">Date:</span> {lastSale.date.toLocaleString('fr-FR')}</p>
                {lastSale.customerName && (
                  <p><span className="text-gray-500">Client:</span> {lastSale.customerName}</p>
                )}
              </div>

              <div className="space-y-2 border-b pb-3 mb-3">
                {lastSale.items.map((item, index) => (
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
                  <span>{formatCurrency(lastSale.subtotal)}</span>
                </div>
                {lastSale.discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Remise</span>
                    <span>-{formatCurrency(lastSale.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(lastSale.total)}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-gray-500">Paiement</span>
                  <span>{PAYMENT_METHOD_LABELS[lastSale.paymentMethod]}</span>
                </div>
                {lastSale.paymentMethod === 'cash' && lastSale.amountReceived > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Montant reçu</span>
                      <span>{formatCurrency(lastSale.amountReceived)}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span className="text-gray-500">Monnaie rendue</span>
                      <span className="text-green-600">{formatCurrency(lastSale.change)}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="text-center mt-4 pt-3 border-t">
                <p className="text-xs text-gray-500">Merci pour votre achat !</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4 mr-2" />
                Imprimer
              </Button>
              <Button
                className="flex-1"
                onClick={() => setIsReceiptModalOpen(false)}
              >
                Nouvelle vente
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default POS;
