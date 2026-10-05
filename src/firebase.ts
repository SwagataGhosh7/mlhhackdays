import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GithubAuthProvider,
  signInWithPopup,
  signOut,
} from 'firebase/auth';

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

export async function signInWithGitHubFirebasePopup(forceAccountLogin?: string): Promise<{
  accessToken: string;
  email?: string | null;
  displayName?: string | null;
}> {
  // Always sign out any cached Firebase user first so Firebase doesn't reuse a stale credential
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
