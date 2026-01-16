import { Timestamp } from 'firebase/firestore';

export interface Product {
  id: string;
  code: string;                    // Code-barres ou référence
  name: string;
  description?: string;
  categoryId: string;
  categoryName: string;
  size: string;                    // XS, S, M, L, XL, XXL, etc.
  color: string;
  prixAchat: number;               // Prix d'achat
  prixDetail: number;              // Prix pour clients lambda
  prixMaison: number;              // Prix réduit pour clients maison
  quantity: number;                // Stock disponible
  minStock: number;                // Seuil alerte stock
  imageUrl?: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  productsCount: number;
  createdAt: Timestamp;
}

// Types pour les formulaires (sans id et timestamps)
export type ProductFormData = Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'categoryName'>;
export type CategoryFormData = Omit<Category, 'id' | 'createdAt' | 'productsCount'>;

// Tailles disponibles
export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'] as const;
export type Size = typeof SIZES[number];

// Catégories par défaut
export const DEFAULT_CATEGORIES = ['Vêtements', 'Chaussures', 'Montres', 'Sacs'] as const;
