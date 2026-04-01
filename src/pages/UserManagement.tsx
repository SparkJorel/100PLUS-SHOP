import { useEffect, useState } from 'react';
import { Search, Edit, Users, Shield, ShieldCheck } from 'lucide-react';
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
} from '../components/ui';
import { useAuthStore } from '../stores';
import { collection, query, onSnapshot, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { User, UserRole } from '../types';
import { ROLE_LABELS } from '../types/user';

interface EditFormData {
  displayName: string;
  role: UserRole;
  isActive: boolean;
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<EditFormData>({
    displayName: '',
    role: 'vendeur',
    isActive: true,
  });

  const currentUser = useAuthStore((s) => s.user);

  // Subscribe to users collection
  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as User[];
      setUsers(data);
      setIsLoading(false);
    }, (error) => {
      console.error('Erreur chargement utilisateurs:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
      setIsLoading(false);
    });
    return unsub;
  }, []);

  const filteredUsers = users.filter((user) => {
    const term = searchTerm.toLowerCase();
    return (
      user.displayName.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term) ||
      ROLE_LABELS[user.role].toLowerCase().includes(term)
    );
  });

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      displayName: user.displayName,
      role: user.role,
      isActive: user.isActive,
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const userRef = doc(db, 'users', editingUser.id);
      const updateData: Partial<EditFormData> = {
        displayName: formData.displayName,
      };

      // Prevent current user from changing their own role or deactivating themselves
      const isSelf = currentUser?.id === editingUser.id;
      if (!isSelf) {
        updateData.role = formData.role;
        updateData.isActive = formData.isActive;
      }

      await updateDoc(userRef, updateData);
      toast.success('Utilisateur mis à jour avec succès');
      handleCloseModal();
    } catch (error) {
      console.error('Erreur mise à jour utilisateur:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDeactivate = async (user: User) => {
    if (currentUser?.id === user.id) {
      toast.error('Vous ne pouvez pas vous désactiver vous-même');
      return;
    }

    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, { isActive: !user.isActive });
      toast.success(
        user.isActive
          ? 'Utilisateur désactivé'
          : 'Utilisateur réactivé'
      );
    } catch (error) {
      console.error('Erreur changement statut:', error);
      toast.error('Erreur lors du changement de statut');
    }
  };

  const formatDate = (timestamp?: Timestamp) => {
    if (!timestamp) return '—';
    return timestamp.toDate().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isSelf = (user: User) => currentUser?.id === user.id;

  const roleOptions = [
    { value: 'admin', label: ROLE_LABELS.admin },
    { value: 'vendeur', label: ROLE_LABELS.vendeur },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Gestion des utilisateurs
            </h1>
            <p className="text-sm text-gray-500">
              {users.length} utilisateur{users.length > 1 ? 's' : ''} enregistré{users.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <Card>
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher par nom, email ou rôle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </Card>

      {/* Users table */}
      <Card>
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">
            Chargement des utilisateurs...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Aucun utilisateur trouvé
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Dernière connexion</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {user.role === 'admin' ? (
                        <ShieldCheck className="h-4 w-4 text-purple-500" />
                      ) : (
                        <Shield className="h-4 w-4 text-blue-500" />
                      )}
                      {user.displayName}
                      {isSelf(user) && (
                        <span className="text-xs text-gray-400">(vous)</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }
                    >
                      {ROLE_LABELS[user.role]}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(user.lastLogin)}</TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? 'success' : 'danger'}>
                      {user.isActive ? 'Actif' : 'Inactif'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {!isSelf(user) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeactivate(user)}
                          className={
                            user.isActive
                              ? 'text-red-500 hover:text-red-700'
                              : 'text-green-500 hover:text-green-700'
                          }
                        >
                          {user.isActive ? 'Désactiver' : 'Réactiver'}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Modifier l'utilisateur"
      >
        {editingUser && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nom d'affichage"
              value={formData.displayName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, displayName: e.target.value }))
              }
              required
            />

            <Select
              label="Rôle"
              options={roleOptions}
              value={formData.role}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  role: e.target.value as UserRole,
                }))
              }
              disabled={isSelf(editingUser)}
            />

            {isSelf(editingUser) && (
              <p className="text-xs text-gray-500">
                Vous ne pouvez pas modifier votre propre rôle ou statut.
              </p>
            )}

            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      isActive: e.target.checked,
                    }))
                  }
                  disabled={isSelf(editingUser)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
              <span className="text-sm font-medium text-gray-700">
                {formData.isActive ? 'Actif' : 'Inactif'}
              </span>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="ghost" onClick={handleCloseModal}>
                Annuler
              </Button>
              <Button type="submit">Enregistrer</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

export default UserManagement;
