import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GithubAuthProvider,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCCycFIt39liiZyq2az8ixjM4l4t__Xhe4',
  authDomain: 'contriblens.firebaseapp.com',
  projectId: 'contriblens',
  storageBucket: 'contriblens.firebasestorage.app',
  messagingSenderId: '473745186875',
  appId: '1:473745186875:web:205ef2015c6f7163487c1e',
  measurementId: 'G-L5CW0S9662',
};

export const firebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const firebaseDb = getFirestore(firebaseApp);

export async function signInWithGitHubFirebasePopup(forceAccountLogin?: string): Promise<{
  accessToken: string;
  email?: string | null;
  displayName?: string | null;
}> {
  try {
    await signOut(firebaseAuth);
  } catch {
    // Ignore
  }

  const provider = new GithubAuthProvider();
  provider.addScope('repo');
  provider.addScope('read:user');
  provider.addScope('user:email');

  const customParams: Record<string, string> = {
    allow_signup: 'true',
    prompt: 'consent',
  };
  if (forceAccountLogin && forceAccountLogin.trim()) {
    customParams.login = forceAccountLogin.trim().replace(/^@+/, '');
  }
  provider.setCustomParameters(customParams);

  const result = await signInWithPopup(firebaseAuth, provider);
  const credential = GithubAuthProvider.credentialFromResult(result);
  const accessToken = credential?.accessToken;

  if (!accessToken) {
    throw new Error('No GitHub OAuth access token returned by Firebase Auth.');
  }

  return {
    accessToken,
    email: result.user.email,
    displayName: result.user.displayName,
  };
}

export async function signOutFirebase(): Promise<void> {
  try {
    await signOut(firebaseAuth);
  } catch {
    // Ignore sign-out errors if not signed in
  }
}

export function subscribeToFirestoreDiscussion(
  onMessages: (msgs: any[]) => void
): () => void {
  try {
    const q = query(
      collection(firebaseDb, 'discussion_messages'),
      orderBy('createdAt', 'asc'),
      limit(200)
    );
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data && data.id && data.text) {
            list.push(data);
          }
        });
        if (list.length > 0) {
          onMessages(list);
        }
      },
      () => {
        // Ignore if Firestore rules or database are not enabled yet; Socket.IO + Express server handles sync
      }
    );
    return unsub;
  } catch {
    return () => {};
  }
}

export async function publishMessageToFirestore(message: {
  id: string;
  channel: string;
  authorHandle: string;
  authorName: string;
  authorAvatar?: string;
  text: string;
  createdAt: string;
}): Promise<void> {
  try {
    const cleanPayload: Record<string, any> = {
      id: message.id,
      channel: message.channel,
      authorHandle: message.authorHandle,
      authorName: message.authorName,
      text: message.text,
      createdAt: message.createdAt,
    };
    if (message.authorAvatar) {
      cleanPayload.authorAvatar = message.authorAvatar;
    }
    await setDoc(doc(firebaseDb, 'discussion_messages', message.id), cleanPayload);
  } catch {
    // Ignore if Firestore is not enabled; Socket.IO + Express server handles sync
  }
}
