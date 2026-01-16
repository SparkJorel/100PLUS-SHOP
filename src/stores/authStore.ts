import { create } from 'zustand';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { User, UserRole } from '../types';

interface AuthState {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  // Actions
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  initialize: () => () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  firebaseUser: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,

  signIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Récupérer ou créer le profil utilisateur dans Firestore
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);

      let userData: User;

      if (userSnap.exists()) {
        userData = { id: userSnap.id, ...userSnap.data() } as User;
        // Mettre à jour la dernière connexion
        await setDoc(userRef, { lastLogin: Timestamp.now() }, { merge: true });
      } else {
        // Créer un nouveau profil utilisateur (premier admin)
        userData = {
          id: firebaseUser.uid,
          email: firebaseUser.email || email,
          displayName: firebaseUser.displayName || email.split('@')[0],
          role: 'admin' as UserRole, // Premier utilisateur = admin
          isActive: true,
          createdAt: Timestamp.now(),
          lastLogin: Timestamp.now()
        };
        await setDoc(userRef, {
          email: userData.email,
          displayName: userData.displayName,
          role: userData.role,
          isActive: userData.isActive,
          createdAt: userData.createdAt,
          lastLogin: userData.lastLogin
        });
      }

      set({
        user: userData,
        firebaseUser,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      let errorMessage = 'Une erreur est survenue';

      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'Aucun compte trouvé avec cet email';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Mot de passe incorrect';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Email invalide';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Trop de tentatives. Réessayez plus tard';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'Email ou mot de passe incorrect';
          break;
      }

      set({ error: errorMessage, isLoading: false });
      throw new Error(errorMessage);
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    try {
      await firebaseSignOut(auth);
      set({
        user: null,
        firebaseUser: null,
        isAuthenticated: false,
        isLoading: false
      });
    } catch (error) {
      set({ error: 'Erreur lors de la déconnexion', isLoading: false });
    }
  },

  clearError: () => set({ error: null }),

  initialize: () => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const userData = { id: userSnap.id, ...userSnap.data() } as User;
            set({
              user: userData,
              firebaseUser,
              isAuthenticated: true,
              isLoading: false
            });
          } else {
            // Utilisateur Firebase sans profil Firestore
            set({
              firebaseUser,
              isAuthenticated: false,
              isLoading: false
            });
          }
        } catch (error) {
          set({
            user: null,
            firebaseUser: null,
            isAuthenticated: false,
            isLoading: false
          });
        }
      } else {
        set({
          user: null,
          firebaseUser: null,
          isAuthenticated: false,
          isLoading: false
        });
      }
    });

    return unsubscribe;
  }
}));
