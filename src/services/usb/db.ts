import { db, auth } from '../../firebase';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';

export interface TestedCommandSequence {
  vid: string;
  pid: string;
  mode: string;
  commands: string[];
  successCount: number;
  lastUpdated: string;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function getTestedCommands(vid: string, pid: string, mode: string): Promise<string[] | null> {
  const docId = `${vid}_${pid}_${mode}`.toUpperCase();
  const path = `tested_commands/${docId}`;
  try {
    const docRef = doc(db, 'tested_commands', docId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data() as TestedCommandSequence;
      return data.commands;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return null;
  }
}

export async function saveSuccessfulCommands(vid: string, pid: string, mode: string, commands: string[]): Promise<void> {
  const docId = `${vid}_${pid}_${mode}`.toUpperCase();
  const path = `tested_commands/${docId}`;
  try {
    const docRef = doc(db, 'tested_commands', docId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      await updateDoc(docRef, {
        successCount: increment(1),
        lastUpdated: new Date().toISOString()
      });
    } else {
      await setDoc(docRef, {
        vid: vid.toUpperCase(),
        pid: pid.toUpperCase(),
        mode,
        commands,
        successCount: 1,
        lastUpdated: new Date().toISOString()
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}
