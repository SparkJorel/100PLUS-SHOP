# 100PLUS SHOP

Application de gestion de boutique de mode avec point de vente (POS), gestion de stock et suivi des clients.

## Fonctionnalités

- **Authentification** - Connexion sécurisée avec Firebase Auth
- **Tableau de bord** - Vue d'ensemble des statistiques de la boutique
- **Point de vente (POS)** - Caisse pour enregistrer les ventes
- **Gestion des produits** - Vêtements, chaussures, montres, sacs avec tailles et couleurs
- **Gestion du stock** - Suivi des quantités et alertes de stock bas
- **Gestion des clients** - Clients "maison" (fidèles) et clients "lambda" avec tarifs différenciés
- **Rapports** - Analyse des ventes et performances
- **Mode hors-ligne** - Persistance locale des données avec Firebase Firestore

## Stack technique

- **Frontend** : React 19 + TypeScript 5.9
- **Build** : Vite 7
- **Styling** : Tailwind CSS 3.4
- **Backend** : Firebase (Auth, Firestore, Storage)
- **State** : Zustand
- **Forms** : React Hook Form + Zod
- **Routing** : React Router DOM 7
- **Icons** : Lucide React

## Installation

```bash
# Cloner le projet
cd 100plus-app

# Installer les dépendances
npm install

# Lancer en développement
npm run dev
```

## Scripts disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Démarre le serveur de développement |
| `npm run build` | Compile le projet pour la production |
| `npm run preview` | Prévisualise le build de production |
| `npm run lint` | Vérifie le code avec ESLint |

## Structure du projet

```
src/
├── components/
│   └── layout/          # Header, Sidebar, Layout principal
├── lib/
│   ├── firebase/        # Configuration Firebase
│   ├── hooks/           # Hooks personnalisés
│   └── utils/           # Utilitaires (formatters, cn)
├── pages/               # Pages de l'application
├── stores/              # Stores Zustand (auth)
├── types/               # Types TypeScript
│   ├── product.ts       # Produits et catégories
│   ├── customer.ts      # Clients
│   ├── sale.ts          # Ventes
│   ├── stock.ts         # Stock
│   └── user.ts          # Utilisateurs
├── App.tsx              # Routes et configuration
├── main.tsx             # Point d'entrée
└── index.css            # Styles Tailwind
```

## Configuration Firebase

Le projet utilise Firebase avec :
- **Authentication** : Email/mot de passe
- **Firestore** : Base de données `sans-plus-bd` avec persistance offline
- **Storage** : Stockage des images produits

### Paramètres de connexion

La configuration se trouve dans `src/lib/firebase/config.ts` :

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyBo04B2gdEjoWJ-T9xoo-bhNBI_JXEDuTM",
  authDomain: "bloodlink-3327e.firebaseapp.com",
  projectId: "bloodlink-3327e",
  storageBucket: "bloodlink-3327e.firebasestorage.app",
  messagingSenderId: "914669668674",
  appId: "1:914669668674:web:ed924599aaa67ec088e0db",
  measurementId: "G-HELEHJYC5Y"
};
```

**Base de données Firestore** : `sans-plus-bd`

## Types de clients

- **Client maison** : Client fidèle enregistré, bénéficie du `prixMaison` (tarif réduit)
- **Client lambda** : Client occasionnel, paie le `prixDetail` (tarif standard)

## Catégories de produits

- Vêtements
- Chaussures
- Montres
- Sacs

## Licence

Projet privé.
# 100PLUS-SHOP
