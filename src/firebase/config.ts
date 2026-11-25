import { initializeApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { doc, getDocFromServer, getFirestore, type Firestore } from 'firebase/firestore';

const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};

export const FIREBASE_CONFIG = {
  apiKey: env.VITE_FIREBASE_API_KEY || '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: env.VITE_FIREBASE_PROJECT_ID || '',
  appId: env.VITE_FIREBASE_APP_ID || '',
};

export const isFirebaseConfigured = Boolean(
  FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId && FIREBASE_CONFIG.appId,
);

const app = isFirebaseConfigured ? initializeApp(FIREBASE_CONFIG) : null;
export const auth = (app ? getAuth(app) : null) as Auth;
const databaseId = env.VITE_FIREBASE_DATABASE_ID?.trim();
export const db = (
  app ? (databaseId ? getFirestore(app, databaseId) : getFirestore(app)) : null
) as Firestore;

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
    providerInfo?: Array<{
      providerId?: string | null;
      email?: string | null;
    }>;
  };
}

export function buildFirestoreErrorInfo(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): FirestoreErrorInfo {
  return {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo:
        auth?.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): never {
  const errInfo = buildFirestoreErrorInfo(error, operationType, path);
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function formatFirebaseError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err || '');
  const code = (err as { code?: string })?.code || '';
  if (/unavailable|network|offline/i.test(code + raw)) {
    return '📡 Network problem — check your connection.';
  }
  if (/unauthenticated/i.test(code + raw)) {
    return 'Session expired — please sign in again.';
  }
  if (/permission-denied|Missing or insufficient permissions/i.test(code + raw)) {
    return '⚠️ Permission denied — publish the updated firestore.rules in Firebase Console.';
  }
  if (/aborted/i.test(code + raw)) {
    return raw.includes('Another session') ? raw : 'Transaction conflict — retrying automatically.';
  }
  if (/already-exists/i.test(code + raw)) {
    return 'Username is already taken.';
  }
  if (/resource-exhausted/i.test(code + raw)) {
    return 'Daily limit or quota reached.';
  }
  if (/internal|cancelled|deadline/i.test(code + raw)) {
    return '⚠️ Server timeout — retry in a moment.';
  }
  try {
    const parsed = JSON.parse(raw) as FirestoreErrorInfo;
    if (parsed.error) return parsed.error;
  } catch {
    // Not JSON
  }
  return raw || 'Something went wrong';
}

export async function testFirestoreConnection(): Promise<void> {
  if (!isFirebaseConfigured || !db || !auth?.currentUser) return;
  try {
    await getDocFromServer(doc(db, 'players', auth.currentUser.uid));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
