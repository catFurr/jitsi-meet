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
    };
}

const AuthCard: React.FC<Props> = ({ jwtFromRedux }) => {
    const [userData, setUserData] = useState<UserData | null>(null);
    console.log(jwtFromRedux);

    const getUserData = (): UserData | null => {
        if (!jwtFromRedux) {
            return null;
        }

        try {
            return {
                user: {
                    name: jwtFromRedux.name || '',
                    email: jwtFromRedux.email || ''
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
                                href="https://customer-portal.paddle.com/cpl_01jmwrfanv7gtn3y160bcw8c7w"
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
    jwtFromRedux: state['features/base/jwt']?.jwt
});

export default connect(mapStateToProps)(AuthCard);
