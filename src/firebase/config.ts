import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { doc, getDocFromServer, getFirestore, type Firestore } from 'firebase/firestore';
import firebaseAppletConfig from '../../firebase-applet-config.json';
import { extractErrorCode, recordAppError } from './errorLog';

function readConfigValue(envValue: unknown, fallbackValue: unknown): string {
  const fromEnv = typeof envValue === 'string' ? envValue.trim() : '';
  if (
    fromEnv &&
    fromEnv !== 'undefined' &&
    fromEnv !== 'null' &&
    !fromEnv.startsWith('YOUR_')
  ) {
    return fromEnv;
  }
  return typeof fallbackValue === 'string' ? fallbackValue.trim() : '';
}

const rawAppletConfig = firebaseAppletConfig as {
  apiKey?: string;
  authDomain?: string;
  databaseURL?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
  firestoreDatabaseId?: string;
};

export const FIREBASE_CONFIG = {
  apiKey: readConfigValue(import.meta.env?.VITE_FIREBASE_API_KEY, rawAppletConfig.apiKey),
  authDomain: readConfigValue(
    import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN,
    rawAppletConfig.authDomain,
  ),
  databaseURL: readConfigValue(
    import.meta.env?.VITE_FIREBASE_DATABASE_URL,
    rawAppletConfig.databaseURL,
  ),
  projectId: readConfigValue(
    import.meta.env?.VITE_FIREBASE_PROJECT_ID,
    rawAppletConfig.projectId,
  ),
  storageBucket: readConfigValue(
    import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET,
    rawAppletConfig.storageBucket,
  ),
  messagingSenderId: readConfigValue(
    import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID,
    rawAppletConfig.messagingSenderId,
  ),
  appId: readConfigValue(import.meta.env?.VITE_FIREBASE_APP_ID, rawAppletConfig.appId),
  measurementId: readConfigValue(
    import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID,
    rawAppletConfig.measurementId,
  ),
  firestoreDatabaseId: readConfigValue(
    import.meta.env?.VITE_FIREBASE_DATABASE_ID,
    rawAppletConfig.firestoreDatabaseId,
  ),
};

const databaseId = FIREBASE_CONFIG.firestoreDatabaseId;

const hasRequiredFirebaseConfig = Boolean(
  FIREBASE_CONFIG.apiKey &&
    FIREBASE_CONFIG.authDomain &&
    FIREBASE_CONFIG.projectId &&
    FIREBASE_CONFIG.appId,
);

let initializedApp: FirebaseApp | null = null;
let initializedAuth: Auth | null = null;
let initializedDb: Firestore | null = null;

if (hasRequiredFirebaseConfig) {
  try {
    initializedApp = getApps().length > 0 ? getApp() : initializeApp(FIREBASE_CONFIG);
    initializedAuth = getAuth(initializedApp);
    initializedDb = databaseId
      ? getFirestore(initializedApp, databaseId)
      : getFirestore(initializedApp);
  } catch (err) {
    console.error('Firebase initialization failed:', err);
    initializedApp = null;
    initializedAuth = null;
    initializedDb = null;
  }
}

export const firebaseApp = initializedApp;
export const auth = initializedAuth as Auth;
export const db = initializedDb as Firestore;
export const isFirebaseConfigured = Boolean(initializedApp && initializedAuth && initializedDb);

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

export function recordFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): FirestoreErrorInfo {
  const errInfo = buildFirestoreErrorInfo(error, operationType, path);
  const json = JSON.stringify(errInfo);
  recordAppError({
    source: 'firestore',
    code: extractErrorCode(error) || undefined,
    operationType,
    path,
    message: errInfo.error,
    details: json,
  });
  return errInfo;
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): never {
  const errInfo = recordFirestoreError(error, operationType, path);
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

export async function testConnection(): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

if (typeof window !== 'undefined' && isFirebaseConfigured) {
  void testConnection();
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
