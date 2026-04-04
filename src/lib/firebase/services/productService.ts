import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  onSnapshot,
  increment,
  runTransaction,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../config';
import type { Product, Category, ProductFormData, CategoryFormData } from '../../../types';

const PRODUCTS_COLLECTION = 'products';
const CATEGORIES_COLLECTION = 'categories';
const COUNTERS_COLLECTION = 'counters';

// Category prefixes for code generation
const CATEGORY_PREFIXES: Record<string, string> = {
  'Vêtements': 'VET',
  'Chaussures': 'CHA',
  'Montres': 'MON',
  'Sacs': 'SAC',
};

// Generate product code with atomic counter: PREFIX-YYYYMM-XXXX
export async function generateProductCode(categoryName: string): Promise<string> {
  const prefix = CATEGORY_PREFIXES[categoryName] || categoryName.substring(0, 3).toUpperCase();
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

  const counterDocId = `products-${prefix}`;
  const counterRef = doc(db, COUNTERS_COLLECTION, counterDocId);

  const nextCount = await runTransaction(db, async (transaction) => {
    const counterSnap = await transaction.get(counterRef);
    const count = counterSnap.exists() ? (counterSnap.data().count || 0) + 1 : 1;
    transaction.set(counterRef, { count }, { merge: true });
    return count;
  });

  const sequence = String(nextCount).padStart(4, '0');
  return `${prefix}-${yearMonth}-${sequence}`;
}

// ============ PRODUCTS ============

export async function getProducts(): Promise<Product[]> {
  const q = query(
    collection(db, PRODUCTS_COLLECTION),
    where('isActive', '==', true)
  );
  const snapshot = await getDocs(q);
  const products = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Product));
  return products.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
}

export function subscribeToProducts(callback: (products: Product[]) => void) {
  const q = query(
    collection(db, PRODUCTS_COLLECTION),
    where('isActive', '==', true)
  );
  return onSnapshot(q, (snapshot) => {
    const products = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Product));
    products.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    callback(products);
  });
}

export async function getProductById(id: string): Promise<Product | null> {
  const docRef = doc(db, PRODUCTS_COLLECTION, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Product;
  }
  return null;
}

export async function getProductByCode(code: string): Promise<Product | null> {
  const q = query(collection(db, PRODUCTS_COLLECTION), where('code', '==', code));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Product;
  }
  return null;
}

export async function createProduct(
  data: ProductFormData,
  imageFile?: File
): Promise<string> {
  let imageUrl: string | null = null;

  if (imageFile) {
    const imageRef = ref(storage, `products/${Date.now()}_${imageFile.name}`);
    await uploadBytes(imageRef, imageFile);
    imageUrl = await getDownloadURL(imageRef);
  }

  const productData: Record<string, unknown> = {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  // Only add imageUrl if it has a value
  if (imageUrl) {
    productData.imageUrl = imageUrl;
  }

  const docRef = await addDoc(collection(db, PRODUCTS_COLLECTION), productData);

  // Update category product count
  await updateDoc(doc(db, CATEGORIES_COLLECTION, data.categoryId), {
    productsCount: increment(1),
  });

  return docRef.id;
}

export async function updateProduct(
  id: string,
  data: Partial<ProductFormData>,
  imageFile?: File
): Promise<void> {
  let imageUrl: string | undefined;

  if (imageFile) {
    const imageRef = ref(storage, `products/${Date.now()}_${imageFile.name}`);
    await uploadBytes(imageRef, imageFile);
    imageUrl = await getDownloadURL(imageRef);
  }

  const updateData: Record<string, unknown> = {
    ...data,
    updatedAt: Timestamp.now(),
  };

  if (imageUrl) {
    updateData.imageUrl = imageUrl;
  }

  await updateDoc(doc(db, PRODUCTS_COLLECTION, id), updateData);
}

export async function deleteProduct(id: string): Promise<void> {
  const product = await getProductById(id);
  if (product) {
    // Soft delete
    await updateDoc(doc(db, PRODUCTS_COLLECTION, id), {
      isActive: false,
      updatedAt: Timestamp.now(),
    });

    // Update category product count
    await updateDoc(doc(db, CATEGORIES_COLLECTION, product.categoryId), {
      productsCount: increment(-1),
    });

    // Delete image if exists
    if (product.imageUrl) {
      try {
        const imageRef = ref(storage, product.imageUrl);
        await deleteObject(imageRef);
      } catch (error) {
        console.error('Error deleting image:', error);
      }
    }
  }
}

export async function updateProductStock(id: string, quantity: number): Promise<void> {
  await updateDoc(doc(db, PRODUCTS_COLLECTION, id), {
    quantity,
    updatedAt: Timestamp.now(),
  });
}

// ============ CATEGORIES ============

export async function getCategories(): Promise<Category[]> {
  const q = query(collection(db, CATEGORIES_COLLECTION), orderBy('name', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Category));
}

export function subscribeToCategories(callback: (categories: Category[]) => void) {
  const q = query(collection(db, CATEGORIES_COLLECTION), orderBy('name', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const categories = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Category));
    callback(categories);
  });
}

export async function createCategory(data: CategoryFormData): Promise<string> {
  const docRef = await addDoc(collection(db, CATEGORIES_COLLECTION), {
    ...data,
    productsCount: 0,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function updateCategory(id: string, data: Partial<CategoryFormData>): Promise<void> {
  await updateDoc(doc(db, CATEGORIES_COLLECTION, id), data);
}

export async function deleteCategory(id: string): Promise<void> {
  await deleteDoc(doc(db, CATEGORIES_COLLECTION, id));
}

// Initialize default categories
export async function initializeDefaultCategories(): Promise<void> {
  const categories = await getCategories();
  if (categories.length === 0) {
    const defaultCategories = ['Vêtements', 'Chaussures', 'Montres', 'Sacs'];
    for (const name of defaultCategories) {
      await createCategory({ name, description: '' });
    }
  }
}
