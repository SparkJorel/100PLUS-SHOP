import { initializeApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBo04B2gdEjoWJ-T9xoo-bhNBI_JXEDuTM",
  authDomain: "bloodlink-3327e.firebaseapp.com",
  projectId: "bloodlink-3327e",
  storageBucket: "bloodlink-3327e.firebasestorage.app",
  messagingSenderId: "914669668674",
  appId: "1:914669668674:web:ed924599aaa67ec088e0db",
  measurementId: "G-HELEHJYC5Y"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);

// Initialiser Firestore avec persistance offline
// Utilise la base de données personnalisée "sans-plus-bd"
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, 'sans-plus-bd');

// Auth
export const auth = getAuth(app);

// Storage pour les images
export const storage = getStorage(app);

export default app;
