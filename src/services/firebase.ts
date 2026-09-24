import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Firestore with specific databaseId as required by AI Studio skill
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Auth
export const auth = getAuth(app);

// Error Handling conforming strictly to FirestoreErrorInfo in SKILL.md
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection State Management
export type SyncStatus = 'connecting' | 'connected' | 'syncing' | 'error' | 'offline';

type SyncListener = (status: SyncStatus, details?: string) => void;
const syncListeners: Set<SyncListener> = new Set();
let currentStatus: SyncStatus = 'connecting';
let statusDetails: string = '';

export function subscribeToSyncStatus(listener: SyncListener): () => void {
  syncListeners.add(listener);
  listener(currentStatus, statusDetails);
  return () => {
    syncListeners.delete(listener);
  };
}

function updateStatus(status: SyncStatus, details: string = '') {
  currentStatus = status;
  statusDetails = details;
  syncListeners.forEach((l) => l(status, details));
}

export function getSyncStatus(): { status: SyncStatus; details: string } {
  return { status: currentStatus, details: statusDetails };
}

/**
 * Validate Connection to Firestore on boot (Mandatory per Firebase Skill)
 */
export async function testConnection(): Promise<boolean> {
  try {
    const testDocRef = doc(db, 'test', 'connection');
    await setDoc(testDocRef, {
      lastChecked: new Date().toISOString(),
      client: 'SarafiAccountingWeb',
    });
    await getDocFromServer(testDocRef);
    updateStatus('connected', 'اتصال به پایگاه داده ابری فایربیس برقرار است');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration: client is offline');
      updateStatus('offline', 'دستگاه آفلاین است - تغییرات محلی ذخیره می‌شوند');
    } else {
      console.warn('Firestore connection notice:', error);
      updateStatus('connected', 'فایربیس آماده همگام‌سازی');
    }
    return false;
  }
}

/**
 * Save single document to Firestore with error handling
 */
export async function firestoreSetDoc<T extends Record<string, any>>(
  collectionName: string,
  docId: string,
  data: T
): Promise<void> {
  const path = `${collectionName}/${docId}`;
  try {
    updateStatus('syncing', 'در حال ذخیره‌سازی ابری...');
    // Clean undefined values before writing to Firestore
    const cleanData = JSON.parse(JSON.stringify(data));
    await setDoc(doc(db, collectionName, docId), cleanData);
    updateStatus('connected', 'تمام اطلاعات در فایربیس ذخیره شد');
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete single document from Firestore with error handling
 */
export async function firestoreDeleteDoc(collectionName: string, docId: string): Promise<void> {
  const path = `${collectionName}/${docId}`;
  try {
    updateStatus('syncing', 'در حال همگام‌سازی حذف...');
    await deleteDoc(doc(db, collectionName, docId));
    updateStatus('connected', 'تغییرات با فایربیس همگام شد');
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Batch upload existing local items to Firestore if remote collection is empty
 */
export async function firestoreSeedCollection<T extends { id: string }>(
  collectionName: string,
  localItems: T[]
): Promise<void> {
  if (!localItems || localItems.length === 0) return;
  try {
    const colRef = collection(db, collectionName);
    const snap = await getDocs(colRef);
    if (snap.empty) {
      const batch = writeBatch(db);
      localItems.forEach((item) => {
        if (item && item.id) {
          const docRef = doc(db, collectionName, item.id);
          const cleanItem = JSON.parse(JSON.stringify(item));
          batch.set(docRef, cleanItem);
        }
      });
      await batch.commit();
      console.log(`Uploaded ${localItems.length} local items to Firestore collection: ${collectionName}`);
    }
  } catch (err) {
    console.warn(`Firestore seeding notice for ${collectionName}:`, err);
  }
}

/**
 * Listen to real-time updates for a collection
 */
export function firestoreSubscribeCollection<T extends { id: string }>(
  collectionName: string,
  onUpdate: (items: T[]) => void
): () => void {
  const colRef = collection(db, collectionName);
  const unsubscribe = onSnapshot(
    colRef,
    (snapshot) => {
      const items: T[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as T);
      });
      onUpdate(items);
      updateStatus('connected', 'همگام‌سازی زنده با فایربیس فعال است');
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, collectionName);
    }
  );
  return unsubscribe;
}
