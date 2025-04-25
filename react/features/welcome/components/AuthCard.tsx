import React, { useEffect, useMemo, useState } from 'react';
import { connect } from 'react-redux';
import { IReduxState } from '../../app/types';

interface Props {
    jwtFromRedux?: {
        jwt?: string;
        name?: string;
        email?: string;
    };
}

function base64UrlDecode(base64Url: string): string {
    const padded = base64Url + '==='.slice((base64Url.length + 3) % 4);
    return atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
}

function parseJwtPayload(token: string) {
    try {
        const [, payloadB64] = token.split('.');
        return JSON.parse(base64UrlDecode(payloadB64));
    } catch {
        return null;
    }
}

function isJwtExpired(token: string): boolean {
    const payload = parseJwtPayload(token);
    const currentTime = Math.floor(Date.now() / 1000);
    return !payload?.exp || currentTime >= payload.exp;
}

const AuthCard: React.FC<Props> = ({ jwtFromRedux }) => {
    const [isExpired, setIsExpired] = useState(false);

    const userData = useMemo(() => {
        const token = jwtFromRedux?.jwt;
        const payload = token ? parseJwtPayload(token) : null;
        const contextUser = payload?.context?.user;

        if (!token || !contextUser) return null;

        return {
            user: {
                name: jwtFromRedux?.name || '',
                email: jwtFromRedux?.email || '',
                subscriptionStatus: contextUser.subscription_status || 'pending'
            }
        };
    }, [jwtFromRedux]);

    useEffect(() => {
        const token = jwtFromRedux?.jwt;
        if (!token) return;

        const checkExpiration = () => {
            setIsExpired(isJwtExpired(token));
        };

        checkExpiration(); // Initial
        const interval = setInterval(checkExpiration, 1000); // Every second

        return () => clearInterval(interval);
    }, [jwtFromRedux]);

    const handleLogin = () => {
        const config = (window as any).config;
        let loginUrl = config?.tokenAuthUrl;
        if (loginUrl) {
            loginUrl = loginUrl
                .replace('{room}', '&no_room=true')
                .replace('{code_challenge}', 'dummy')
                .replace('{state}', '{}');
            window.location.href = loginUrl;
        }
    };

    const handleLogout = () => {
        const logoutUrl = (window as any).config?.tokenLogoutUrl;
        if (logoutUrl) {
            window.location.href = logoutUrl;
        }
    };

    return (
        <div className="welcome-card-text auth-card">
            <div id="jitsi-auth-container">
                {userData?.user ? (
                    <div className="auth-user-info">
                        <h3 className="auth-title">Account</h3>

                        {['Name', 'Email', 'Subscription Status'].map((label, i) => {
                            const key = ['name', 'email', 'subscriptionStatus'][i] as keyof typeof userData.user;
                            const value = userData.user?.[key] || 'Not available';
                            const displayValue = key === 'subscriptionStatus' && value === 'active' ? ' Active' : value;

                            return (
                                <div className="auth-user-detail" key={label}>
                                    <span className="auth-label">{label}:</span>
                                    <span className="auth-value">{displayValue}</span>
                                </div>
                            );
                        })}

                        <div className="auth-buttons">
                            <a
                                href="https://auth.sonacove.com/realms/jitsi/account"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`welcome-page-button auth-button ${isExpired ? 'disabled' : ''}`}
                                onClick={(e) => isExpired && e.preventDefault()}
                            >
                                Manage Account
                            </a>

                            <a
                                href={
                                    userData.user.subscriptionStatus === 'active'
                                        ? 'https://customer-portal.paddle.com/cpl_01jmwrfanv7gtn3y160bcw8c7w'
                                        : 'https://sonacove.com/onboarding/'
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="welcome-page-button auth-button"
                            >
                                Manage Subscription
                            </a>

                            {isExpired && (
                                <button onClick={handleLogin} className="welcome-page-button auth-button">
                                    Refresh Session
                                </button>
                            )}

                            <button onClick={handleLogout} className="welcome-page-button auth-button auth-logout">
                                Logout
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="auth-login-container">
                        <h3 className="auth-title">Login</h3>
                        <p className="auth-description">Sign in to access your account and meetings</p>

                        <button onClick={handleLogin} className="welcome-page-button auth-button">
                            Login
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const mapStateToProps = (state: IReduxState) => ({
    jwtFromRedux: state['features/base/settings']
});

export default connect(mapStateToProps)(AuthCard);
