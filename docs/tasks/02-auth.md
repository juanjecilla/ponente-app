# Task 02: Auth (Google OAuth)

**Phase:** 2
**Estimated Effort:** 1.5 hours
**Dependencies:** 01

---

## Context

Speakers sign in with Google to own their `speakers/{uid}` doc. Organizers browse without an account; they sign in only to report. Auth state drives `ErrorTracker.setUser` and Analytics user id.

## Goal

Working Google sign-in/out, an `AuthContext` + `useAuth` hook, a `<ProtectedRoute>`, and a login page. Unauthenticated access to `/profile/edit` redirects to `/login`.

---

## Implementation Steps

### 2.1 Console
- Enable **Google** provider (Auth → Sign-in method).
- Configure OAuth consent screen.
- **Authorized domains:** `localhost`, `<project>.web.app`, `<project>.firebaseapp.com`, custom domain, and Hosting **preview-channel** domains (`<project>--*.web.app`) so OAuth works on PR previews.

### 2.2 `src/hooks/useAuth.ts` + `AuthContext`
```typescript
import { createContext, useContext, useEffect, useState } from 'react';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { errorTracker } from '../lib/error-tracker';

interface AuthState { user: User | null; loading: boolean; signIn: () => Promise<void>; logout: () => Promise<void>; }
const Ctx = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => onAuthStateChanged(auth, (u) => {
    setUser(u); setLoading(false); errorTracker.setUser(u?.uid ?? null);
  }), []);
  const signIn = async () => { await signInWithPopup(auth, new GoogleAuthProvider()); };
  const logout = async () => { await signOut(auth); };
  return <Ctx.Provider value={{ user, loading, signIn, logout }}>{children}</Ctx.Provider>;
}
export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used within AuthProvider');
  return c;
};
```
> If `lib/error-tracker` (task 13) isn't built yet, stub `errorTracker.setUser` as a no-op so this compiles independently.

### 2.3 `<ProtectedRoute>` — `src/components/auth/ProtectedRoute.tsx`
Render a spinner while `loading`; redirect to `/login` (preserve intended path) when `!user`; else render children.

### 2.4 Login page — `src/pages/LoginPage.tsx`
"Sign in with Google" button → `signIn()`; on success redirect to the intended path or `/profile/edit`. All copy via `t()`.

### 2.5 Wire `App.tsx`
Wrap routes in `<AuthProvider>`. Routes: `/`, `/login`, `/profile/edit` (protected), `/speaker/:uid`.

---

## Corner Cases & Gotchas
- **Popup blockers / mobile:** `signInWithPopup` can fail on some mobile browsers → catch and offer `signInWithRedirect` fallback; handle `getRedirectResult` on load.
- **Preview-channel OAuth:** forgetting preview domains in authorized domains → `auth/unauthorized-domain` on PR previews. Add the wildcard.
- **App Check + Auth (task 17):** once enforced, popups still work, but ensure App Check init doesn't block the auth flow when debug token missing in dev.
- **Loading flash:** guard routing on `loading` to avoid redirecting before auth resolves.
- **setUser timing:** call `errorTracker.setUser` inside `onAuthStateChanged`, and `setUser(null)` on sign-out (covered by the same listener).
- **`auth_signin` trace** (task 15) starts on button click, stops when `onAuthStateChanged` fires with a user.

## Definition of Done
- [ ] Google sign-in/out works locally.
- [ ] `useAuth` exposes `user`, `loading`, `signIn`, `logout`.
- [ ] `<ProtectedRoute>` redirects unauthenticated users to `/login` and restores intended path after login.
- [ ] `errorTracker.setUser(uid|null)` fires on auth changes (or no-op stub until task 13).
- [ ] Redirect fallback handles popup-blocked environments.
- [ ] Unit tests: ProtectedRoute (authed/unauthed/loading), useAuth context error.
