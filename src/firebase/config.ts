import { initializeApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { doc, getDocFromServer, getFirestore, type Firestore } from 'firebase/firestore';
import firebaseAppletConfig from '../../firebase-applet-config.json';

const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};

export const FIREBASE_CONFIG = {
  apiKey: env.VITE_FIREBASE_API_KEY?.trim() || firebaseAppletConfig.apiKey || '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN?.trim() || firebaseAppletConfig.authDomain || '',
  databaseURL: env.VITE_FIREBASE_DATABASE_URL?.trim() || firebaseAppletConfig.databaseURL || '',
  projectId: env.VITE_FIREBASE_PROJECT_ID?.trim() || firebaseAppletConfig.projectId || '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET?.trim() || firebaseAppletConfig.storageBucket || '',
  messagingSenderId:
    env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim() || firebaseAppletConfig.messagingSenderId || '',
  appId: env.VITE_FIREBASE_APP_ID?.trim() || firebaseAppletConfig.appId || '',
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID?.trim() || firebaseAppletConfig.measurementId || '',
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
  const combined = `${code} ${raw}`;
  if (/auth\/popup-closed-by-user|auth\/cancelled-popup-request/i.test(combined)) {
    return 'Sign-in cancelled — popup was closed.';
  }
  if (/auth\/popup-blocked/i.test(combined)) {
    return 'Sign-in popup was blocked by your browser — please allow popups for this site.';
  }
  if (/auth\/unauthorized-domain/i.test(combined)) {
    return 'Add this domain to Firebase Console → Authentication → Settings → Authorized domains.';
  }
  if (/auth\/operation-not-allowed/i.test(combined)) {
    return 'Enable this sign-in method in Firebase Console → Authentication → Sign-in method.';
  }
  if (/auth\/invalid-credential|auth\/user-not-found|auth\/wrong-password/i.test(combined)) {
    return 'Invalid email or password.';
  }
  if (/auth\/email-already-in-use/i.test(combined)) {
    return 'An account with this email already exists.';
  }
  if (/auth\/weak-password/i.test(combined)) {
    return 'Password should be at least 6 characters.';
  }
  if (/auth\/invalid-email/i.test(combined)) {
    return 'Please enter a valid email address.';
  }
  if (/auth\/too-many-requests/i.test(combined)) {
    return 'Too many attempts — please wait a moment and try again.';
  }
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
