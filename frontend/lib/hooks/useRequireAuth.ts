'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSessionUser, isLoggedIn, SessionUser } from '../auth/session';

/**
 * Client-side route protection. This is deliberately simple for now —
 * it checks localStorage and redirects if there's no token. It does NOT
 * verify the token is still valid server-side (an expired-but-present
 * token would pass this check and only fail on the first actual API
 * call, which apiRequest already handles by clearing the stale session
 * on a 401). A production app would likely also verify server-side on
 * protected page loads, but for this project's scope, client-side
 * redirect + the existing 401 handling covers the real cases.
 */
export function useRequireAuth(): { user: SessionUser | null; isChecking: boolean } {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push('/login');
      return;
    }
    setUser(getSessionUser());
    setIsChecking(false);
  }, [router]);

  return { user, isChecking };
}