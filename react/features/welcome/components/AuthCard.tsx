import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { IReduxState } from '../../app/types';

interface Props {
    jwtFromRedux?: {
        jwt?: string;
        name?: string;
        email?: string;
    };
}

interface UserData {
    user?: {
        name?: string;
        email?: string;
        subscriptionStatus?: string;
    };
}

const AuthCard: React.FC<Props> = ({ jwtFromRedux }) => {
    const [userData, setUserData] = useState<UserData | null>(null);
    const [isExpired, setIsExpired] = useState<boolean>(false);

    const getUserData = (): UserData | null => {
        if (!jwtFromRedux?.jwt) return null;

        const userStatus = getUserStatus(jwtFromRedux.jwt);

        return {
            user: {
                name: jwtFromRedux.name || '',
                email: jwtFromRedux.email || '',
                subscriptionStatus: userStatus || undefined
            }
        };
    };

    useEffect(() => {
        setUserData(getUserData());
    }, [jwtFromRedux]);

    useEffect(() => {
        const token = jwtFromRedux?.jwt;
        if (!token) return;

        const checkExpiration = () => {
            const expired = isJwtExpired(token);
            setIsExpired(expired);
        };

        checkExpiration(); // Initial check
        const interval = setInterval(checkExpiration, 1000); // Check every 1s

        return () => clearInterval(interval); // Cleanup
    }, [jwtFromRedux]);

    const handleLogin = () => {
        let loginUrl = (window as any).config.tokenAuthUrl;
        if (loginUrl) {
            loginUrl = loginUrl
                .replace('{room}', '&no_room=true')
                .replace('{code_challenge}', 'dummy')
                .replace('{state}', '{}');
            window.location.href = loginUrl;
        }
    };

    const handleLogout = () => {
        const logoutUrl = (window as any).config.tokenLogoutUrl;
        if (logoutUrl) {
            window.location.href = logoutUrl;
        }
    };

    function base64UrlDecode(base64Url: string) {
        return base64Url.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (4 - (base64Url.length % 4)) % 4);
    }

    function getUserStatus(token: string) {
        const [, payloadB64] = token.split('.');
        const payload = JSON.parse(atob(base64UrlDecode(payloadB64)));
        return payload.context.user.subscription_status;
    }

    function isJwtExpired(token: string): boolean {
        try {
            const [, payloadB64] = token.split('.');
            const decodedPayload = JSON.parse(atob(base64UrlDecode(payloadB64)));
            const exp = decodedPayload.exp; 
            const currentTime = Math.floor(Date.now() / 1000); 
            return currentTime >= exp;
        } catch (e) {
            console.error('JWT parse error', e);
            return true; // assume expired if we can't decode it
        }
    }


    return (
        <div className="welcome-card-text auth-card">
            <div id="jitsi-auth-container">
                {userData?.user ? (
                    <div className="auth-user-info">
                        <h3 className="auth-title">Account</h3>

                        <div className="auth-user-detail">
                            <span className="auth-label">Name:</span>
                            <span className="auth-value">{userData.user.name || 'Not available'}</span>
                        </div>

                        <div className="auth-user-detail">
                            <span className="auth-label">Email:</span>
                            <span className="auth-value">{userData.user.email || 'Not available'}</span>
                        </div>

                        <div className="auth-user-detail">
                            <span className="auth-label">Subscription Status:</span>
                            <span className="auth-value">
                                {userData.user.subscriptionStatus === 'active' ? ' Active' : ' Pending'}
                            </span>
                        </div>

                        <div className="auth-buttons">
                            <a
                                href="https://auth.sonacove.com/realms/jitsi/account"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`welcome-page-button auth-button ${isExpired ? 'disabled' : ''}`}
                                onClick={(e) => {
                                    if (isExpired) {
                                        e.preventDefault();
                                    }
                                }}
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
    jwtFromRedux: state['features/base/jwt']
});

export default connect(mapStateToProps)(AuthCard);
