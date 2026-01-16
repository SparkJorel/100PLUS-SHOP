import {
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

// Composant de carte statistique
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'primary' | 'green' | 'blue' | 'orange';
  subtitle?: string;
}

function StatCard({ title, value, icon, color, subtitle }: StatCardProps) {
  const colorClasses = {
    primary: 'bg-primary-50 text-primary',
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  // Pour l'instant, données statiques - sera connecté à Firebase plus tard
  const stats = {
    ventesJour: 0,
    caJour: '0 FCFA',
    produitsStock: 0,
    alertesStock: 0,
    clientsMaison: 0
  };

  return (
    <div className="space-y-6">
      {/* Titre de la page */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-500">Bienvenue sur 100PLUS SHOP</p>
      </div>

      {/* Cartes statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Ventes aujourd'hui"
          value={stats.ventesJour}
          icon={<ShoppingCart className="h-6 w-6" />}
          color="primary"
          subtitle="transactions"
        />
        <StatCard
          title="Chiffre d'affaires"
          value={stats.caJour}
          icon={<TrendingUp className="h-6 w-6" />}
          color="green"
          subtitle="aujourd'hui"
        />
        <StatCard
          title="Produits en stock"
          value={stats.produitsStock}
          icon={<Package className="h-6 w-6" />}
          color="blue"
          subtitle="articles"
        />
        <StatCard
          title="Clients maison"
          value={stats.clientsMaison}
          icon={<Users className="h-6 w-6" />}
          color="orange"
          subtitle="enregistrés"
        />
      </div>

      {/* Alertes stock */}
      {stats.alertesStock > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <p className="text-sm font-medium text-orange-800">
              {stats.alertesStock} produit(s) avec stock bas
            </p>
          </div>
        </div>
      )}

      {/* Section vide pour l'instant */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dernières ventes */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Dernières ventes
          </h2>
          <div className="text-center py-8 text-gray-500">
            <ShoppingCart className="h-12 w-12 mx-auto text-gray-300 mb-2" />
            <p>Aucune vente pour le moment</p>
            <p className="text-sm">Commencez à vendre depuis la caisse</p>
          </div>
        </div>

        {/* Produits les plus vendus */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Produits populaires
          </h2>
          <div className="text-center py-8 text-gray-500">
            <Package className="h-12 w-12 mx-auto text-gray-300 mb-2" />
            <p>Aucune donnée disponible</p>
            <p className="text-sm">Les statistiques apparaîtront ici</p>
          </div>
        </div>
      </div>
    </div>
  );
}
