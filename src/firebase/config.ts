import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';

export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyADfvhFfSuJYVGHqubAR8foY237MQ2QIdc',
  authDomain: 'pakora-tab.firebaseapp.com',
  projectId: 'pakora-tab',
  appId: '1:88621916854:web:95ceacc2bced7e6530bc17',
};

const app = initializeApp(FIREBASE_CONFIG);
export const auth = getAuth(app);
export const db = getFirestore(app);

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

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
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
    return raw.includes('Another session') ? raw : 'Transaction conflict — please try again.';
  }
  if (/already-exists/i.test(code + raw)) {
    return 'Username is already taken.';
  }
  if (/resource-exhausted/i.test(code + raw)) {
    return 'Daily limit reached.';
  }
  if (/internal|cancelled|deadline/i.test(code + raw)) {
    return '⚠️ Server error — retry in a moment.';
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
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
