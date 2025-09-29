/**
 * Legacy AuthService file - functionality moved to static/auth-service.js.
 * This file is kept for TypeScript type definitions and backward compatibility.
 */

// Type definitions for the global AuthService
export interface IAuthState {
    isLoggedIn: boolean;
    user: any | null;
}

export interface IAuthService {
    getAccessToken: () => string | null;
    getUser: () => any | null;
    isLoggedIn: () => boolean;
    login: (redirectArgs?: any) => Promise<void>;
    logout: () => Promise<void>;
    subscribe: (listener: (state: IAuthState) => void) => () => void;
}

/**
 * Legacy function - AuthService is now loaded from static/auth-service.js.
 * This function provides access to the global AuthService instance.
 *
 * @returns {IAuthService} The AuthService instance.
 */
export function getAuthService(): IAuthService {
    if (typeof window !== 'undefined' && (window as any).AuthService) {
        return (window as any).AuthService.getAuthService();
    }

    throw new Error('AuthService not available. Make sure auth-service.js is loaded.');
}
