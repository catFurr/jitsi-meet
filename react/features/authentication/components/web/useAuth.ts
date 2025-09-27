import { useState, useEffect } from 'react';
import { getAuthService } from '../../AuthService';
import type { User as OidcUser } from 'oidc-client-ts';


export function useAuth() {
  const authService = getAuthService();
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => authService?.isLoggedIn() ?? false,
  );
  const [oidcUser, setOidcUser] = useState<OidcUser | null>(
    () => authService?.getUser() ?? null,
  );

  // Effect to keep the hook's state in sync with the AuthService
  useEffect(() => {
    if (!authService) return;
    const unsubscribe = authService.subscribe((state) => {
      setIsLoggedIn(state.isLoggedIn);
      setOidcUser(state.user);
    });
    return unsubscribe;
  }, []);

  return {
    isLoggedIn,
    user: oidcUser,
    // login: () => authService?.login(),
    // signup: () => authService?.signup(),
    logout: () => authService?.logout(),
    getAccessToken: () => authService?.getAccessToken() ?? null,
  };
}
