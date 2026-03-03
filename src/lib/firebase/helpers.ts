import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  CollectionReference,
  DocumentReference,
} from 'firebase/firestore';
import { db } from './config';

// Generic CRUD helpers
export async function createDocument<T>(
  collectionPath: string,
  data: Omit<T, 'id'>
): Promise<string> {
  const ref = collection(db, collectionPath);
  const docRef = await addDoc(ref, {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function getDocument<T>(collectionPath: string, docId: string): Promise<T | null> {
  const docRef = doc(db, collectionPath, docId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as T;
  }
  return null;
}

export async function updateDocument<T>(
  collectionPath: string,
  docId: string,
  data: Partial<T>
): Promise<void> {
  const docRef = doc(db, collectionPath, docId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteDocument(collectionPath: string, docId: string): Promise<void> {
  const docRef = doc(db, collectionPath, docId);
  await deleteDoc(docRef);
}

export async function queryDocuments<T>(
  collectionPath: string,
  constraints: any[] = []
): Promise<T[]> {
  const ref = collection(db, collectionPath);
  const q = query(ref, ...constraints);
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as T[];
}

// Specific helpers for common patterns
export function getOrganizationPath(orgId: string): string {
  return `organizations/${orgId}`;
}

export function getOrganizationCollection(orgId: string, collection: string): string {
  return `organizations/${orgId}/${collection}`;
}
