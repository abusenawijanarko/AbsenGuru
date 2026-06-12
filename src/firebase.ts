import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const isDemo = firebaseConfig.apiKey === 'placeholder-api-key';

let app;
let auth: any;
let db: any;

if (!isDemo) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    // Explicitly configure DB with databaseId if provided
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
  } catch (err) {
    console.warn('Failed to initialize real Firebase, falling back to Demo Mode:', err);
    app = null;
    auth = null;
    db = null;
  }
}

export { app, auth, db };
export const isDemoMode = isDemo || !auth || !db;

// Operational Enums for Error Logging
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
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || 'guest',
      email: auth?.currentUser?.email || 'guest@example.com',
      emailVerified: auth?.currentUser?.emailVerified || false,
      isAnonymous: auth?.currentUser?.isAnonymous || false,
    },
    operationType,
    path,
  };
  console.error('Firestore Error Captured:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
