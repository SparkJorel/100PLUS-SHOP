import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Warehouse,
  Users,
  Receipt,
  BarChart3,
  X,
  Calculator,
  Wallet,
  CreditCard,
  FileText,
  Truck,
  UserCog,
  ClipboardCheck,
  FileSpreadsheet,
  Activity
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigation = [
  { name: 'Tableau de bord', href: '/', icon: LayoutDashboard },
  { name: 'Caisse (POS)', href: '/pos', icon: ShoppingCart },
  { name: 'Produits', href: '/products', icon: Package },
  { name: 'Stock', href: '/stock', icon: Warehouse },
  { name: 'Clients', href: '/customers', icon: Users },
  { name: 'Ventes', href: '/sales', icon: Receipt },
  { name: 'Rapports', href: '/reports', icon: BarChart3 },
  { name: 'Caisse du jour', href: '/cash-register', icon: Calculator },
  { name: 'Dépenses', href: '/expenses', icon: Wallet },
  { name: 'Créances', href: '/credits', icon: CreditCard },
  { name: 'Comptabilité', href: '/accounting', icon: FileText },
  { name: 'Fournisseurs', href: '/suppliers', icon: Truck },
  { name: 'Inventaire', href: '/inventory', icon: ClipboardCheck },
  { name: 'Factures/Devis', href: '/invoices', icon: FileSpreadsheet },
  { name: 'Utilisateurs', href: '/users', icon: UserCog },
  { name: 'Journal activité', href: '/activity-log', icon: Activity },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header Sidebar */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <img src="/logo_100plus.jpg" alt="100PLUS SHOP" className="h-10 object-contain" />
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* Footer Sidebar */}
        <div className="p-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            100PLUS SHOP v1.0
          </p>
        </div>
      </aside>
    </>
  );
}
