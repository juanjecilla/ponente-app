import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

// NOTE: `errorTracker.setUser(uid | null)` will be wired here in task 13
// (lib/error-tracker). It does not exist yet, so we intentionally skip it to
// keep this task self-contained.

export interface AuthContextValue {
  /** The signed-in Firebase user, or `null` when signed out. */
  user: User | null;
  /** `true` until the first `onAuthStateChanged` resolves. */
  loading: boolean;
  /** Start the Google OAuth popup sign-in flow. */
  signInWithGoogle: () => Promise<void>;
  /** Sign the current user out. */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Single shared auth provider. Subscribes to `onAuthStateChanged` exactly once
 * so the whole tree observes the same auth state (no duplicate listeners).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(auth, new GoogleAuthProvider());
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, signInWithGoogle, signOut }),
    [user, loading, signInWithGoogle, signOut],
  );

  return createElement(AuthContext.Provider, { value }, children);
}

/** Access the shared auth state. Must be used within an `<AuthProvider>`. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
