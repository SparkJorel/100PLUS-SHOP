import { useEffect, useState, useMemo } from 'react';
import { Activity, Search, Calendar, Filter } from 'lucide-react';
import {
  Input,
  Select,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  Button,
} from '../components/ui';
import {
  subscribeToActivityLog,
  ACTIVITY_ACTION_LABELS,
} from '../lib/firebase/services';
import type { ActivityLog as ActivityLogType, ActivityAction } from '../lib/firebase/services/activityLogService';

const ACTION_BADGE_VARIANTS: Record<ActivityAction, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  sale_created: 'success',
  sale_cancelled: 'danger',
  product_created: 'info',
  product_updated: 'warning',
  product_deleted: 'danger',
  stock_movement: 'warning',
  customer_created: 'info',
  customer_updated: 'warning',
  expense_created: 'danger',
  cash_register_opened: 'success',
  cash_register_closed: 'default',
  return_created: 'warning',
  credit_payment: 'success',
  delivery_received: 'info',
  user_updated: 'warning',
  inventory_completed: 'info',
};

function formatDateTime(timestamp: any): string {
  if (!timestamp || !timestamp.toDate) return '-';
  const date = timestamp.toDate();
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMetadata(metadata: Record<string, any> | undefined): string {
  if (!metadata) return '-';
  const entries = Object.entries(metadata);
  if (entries.length === 0) return '-';
  return entries
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`)
    .join(' | ');
}

function getStartOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getEndOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

export function ActivityLog() {
  const [logs, setLogs] = useState<ActivityLogType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const unsub = subscribeToActivityLog((data) => {
      setLogs(data);
      setIsLoading(false);
    });
    return unsub;
  }, []);

  const setQuickDate = (range: 'today' | 'week' | 'month') => {
    const now = new Date();
    const end = now.toISOString().split('T')[0];
    let start: string;

    switch (range) {
      case 'today':
        start = end;
        break;
      case 'week':
        start = getStartOfWeek(now).toISOString().split('T')[0];
        break;
      case 'month':
        start = getStartOfMonth(now).toISOString().split('T')[0];
        break;
    }

    setStartDate(start);
    setEndDate(end);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setActionFilter('');
    setStartDate('');
    setEndDate('');
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesDescription = log.description.toLowerCase().includes(term);
        const matchesUser = log.userName.toLowerCase().includes(term);
        if (!matchesDescription && !matchesUser) return false;
      }

      // Action filter
      if (actionFilter && log.action !== actionFilter) return false;

      // Date range filter
      if (startDate || endDate) {
        if (!log.createdAt || !log.createdAt.toDate) return false;
        const logDate = log.createdAt.toDate();

        if (startDate) {
          const start = getStartOfDay(new Date(startDate));
          if (logDate < start) return false;
        }
        if (endDate) {
          const end = getEndOfDay(new Date(endDate));
          if (logDate > end) return false;
        }
      }

      return true;
    });
  }, [logs, searchTerm, actionFilter, startDate, endDate]);

  const actionOptions = [
    { value: '', label: 'Toutes les actions' },
    ...Object.entries(ACTIVITY_ACTION_LABELS).map(([value, label]) => ({
      value,
      label,
    })),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Journal d'activité</h1>
            <p className="text-sm text-gray-500">
              Historique de toutes les actions effectuées
            </p>
          </div>
        </div>
        <Badge variant="info">{filteredLogs.length} entrée{filteredLogs.length > 1 ? 's' : ''}</Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher description, utilisateur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Action type filter */}
            <Select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              options={actionOptions}
            />

            {/* Date range */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="Début"
              />
            </div>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="Fin"
            />
          </div>

          {/* Quick date buttons */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-sm text-gray-500">Période rapide :</span>
            <Button variant="outline" size="sm" onClick={() => setQuickDate('today')}>
              Aujourd'hui
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickDate('week')}>
              Cette semaine
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickDate('month')}>
              Ce mois
            </Button>
            {(searchTerm || actionFilter || startDate || endDate) && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Réinitialiser
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Activity className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Aucune activité trouvée</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date / Heure</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Détails</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-sm text-gray-600">
                      {formatDateTime(log.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={ACTION_BADGE_VARIANTS[log.action] || 'default'}>
                        {ACTIVITY_ACTION_LABELS[log.action] || log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-900 max-w-xs truncate">
                      {log.description}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {log.userName}
                    </TableCell>
                    <TableCell className="text-xs text-gray-500 max-w-xs truncate">
                      {formatMetadata(log.metadata)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ActivityLog;
