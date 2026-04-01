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
  apiKey: "AIzaSyAB7XwvzQ8P5tZYdnAnm7WcNMsiO0oWXew",
  authDomain: "shop100plus-3b04a.firebaseapp.com",
  projectId: "shop100plus-3b04a",
  storageBucket: "shop100plus-3b04a.firebasestorage.app",
  messagingSenderId: "9472236",
  appId: "1:9472236:web:8c2070b2a6fd317483bdc9",
  measurementId: "G-7L9FT4NBRD"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);

// Initialiser Firestore avec persistance offline
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

// Auth
export const auth = getAuth(app);

// Storage pour les images
export const storage = getStorage(app);

export default app;
