import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { IReduxState } from '../../app/types';

interface Props {
    jwtFromRedux?: object;
}

interface UserData {
    user?: {
        name?: string;
        email?: string;
        subscriptionStatus?: string;
    };
}

const AuthCard: React.FC<Props> = ({jwtFromRedux}) => {
    const [userData, setUserData] = useState<UserData | null>(null);


    const getUserData = (): UserData | null => {
        if (!jwtFromRedux?.jwt) {
            return null;
        }

        const userStatus = getUserStatus(jwtFromRedux.jwt);

        try {
            return {
                user: {
                    name: jwtFromRedux.name || '',
                    email: jwtFromRedux.email || '',
                    subscriptionStatus: userStatus || undefined
                }
            };
        } catch (e) {
            console.error('Error Getting User Data:', e);
            return null;
        }
    };

    useEffect(() => {
        setUserData(getUserData());
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

    function base64UrlDecode(base64Url) {
        return base64Url.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (4 - (base64Url.length % 4)) % 4);
    }

    function getUserStatus(token) {
        const [headerB64, payloadB64, signatureB64] = token.split('.');

        const payload = JSON.parse(atob(base64UrlDecode(payloadB64)));

        return payload.context.user.subscription_status;
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
                            <span className="auth-label">Subscription Status: </span>
                            <span className="auth-value">
                                {userData.user.subscriptionStatus == 'active' ? ' Active' : ' Pending'}
                            </span>
                        </div>

                        <div className="auth-buttons">
                            <a
                                href="https://auth.sonacove.com/realms/jitsi/account"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="welcome-page-button auth-button"
                            >
                                Manage Account
                            </a>

                            <a
                                href={
                                    userData.user.subscriptionStatus == 'active'
                                        ? 'https://customer-portal.paddle.com/cpl_01jmwrfanv7gtn3y160bcw8c7w'
                                        : 'https://sonacove.com/onboarding/'
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="welcome-page-button auth-button"
                            >
                                Manage Subscription
                            </a>

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
