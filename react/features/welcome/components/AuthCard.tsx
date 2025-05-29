import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { connect, useDispatch } from 'react-redux';
import type { IReduxState } from '../../app/types';
import type { IJwtState } from '../../base/jwt/reducer';
import type { IConfig } from '../../base/config/configType';
import { getTokenAuthUrl } from '../../authentication/functions.web';
import { setJWT } from '../../base/jwt/actions';

interface IProps {
    config: IConfig;
    jwtFromRedux?: IJwtState;
}

function base64UrlDecode(base64Url: string): string {
    const padded = base64Url + '==='.slice((base64Url.length + 3) % 4);

    return atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
}

function parseJwtPayload(token: string) {
    try {
        const [ , payloadB64 ] = token.split('.');

        return JSON.parse(base64UrlDecode(payloadB64));
    } catch {
        return null;
    }
}

const AuthCard: React.FC<IProps> = ({ jwtFromRedux, config }) => {
    const hostname = window.location.host;
    const isProd = hostname === 'sonacove.com' || hostname === 'www.sonacove.com';
    const authDomain = isProd ? 'auth.sonacove.com' : 'staj.sonacove.com/auth';

    const [ isExpired, setIsExpired ] = useState(false);
    const [ subscriptionUrl, setSubscriptionUrl ] = useState('https://' + hostname + '/onboarding/');
    const dispatch = useDispatch()

    const userData = useMemo(() => {
        const token = jwtFromRedux?.jwt;
        const payload = token ? parseJwtPayload(token) : null;
        const contextUser = payload?.context?.user;

        if (!token || !contextUser) return null;

        return {
            user: {
                name: contextUser?.name || '',
                email: contextUser?.email || '',
                subscriptionStatus: contextUser.subscription_status || 'pending'
            }
        };
    }, [ jwtFromRedux ]);

    useEffect(() => {
        const token = jwtFromRedux?.jwt;

        if (!token) return;

        const payload = parseJwtPayload(token);
        const exp = payload?.exp;

        if (!exp) return;

        const currentTime = Math.floor(Date.now() / 1000);
        const msUntilExpiry = (exp - currentTime) * 1000;

        if (msUntilExpiry <= 0) {
            setIsExpired(true);

            return;
        }

        const timeout = setTimeout(() => {
            setIsExpired(true);
        }, msUntilExpiry);

        return () => clearTimeout(timeout);
    }, [ jwtFromRedux ]);

    useEffect(() => {
        setSubscriptionUrl(`https://${hostname}/onboarding#access_token=${jwtFromRedux?.jwt}`);
        if (userData?.user.subscriptionStatus === 'active') {
            fetch('https://' + hostname + '/api/paddle-customer-portal',
                {
                    headers: {
                        Authorization: `Bearer ${jwtFromRedux?.jwt}`,
                    },
                }
            )
            .then(response => response.json())
            .then(data => {
                data.url && setSubscriptionUrl(data.url);
            })
            .catch(error => {
                console.error('Error fetching subscription URL:', error);
            });
        }
    }, [ userData, jwtFromRedux ]);

    const handleLogin = useCallback(() => {
        getTokenAuthUrl(
            config,
            new URL(window.location.href),
            {
                audioMuted: undefined,
                audioOnlyEnabled: undefined,
                skipPrejoin: undefined,
                videoMuted: undefined
            },
            undefined,
            undefined
        ).then(url => {
            if (url) {
                window.location.href = url;
            }
        });
    }, [ config.tokenAuthUrl ]);

    const handleLogout = useCallback(() => {
        const logoutUrl = config.tokenLogoutUrl;
        dispatch(setJWT(undefined))

        if (logoutUrl) {
            window.location.href = logoutUrl;
        }
    }, [ config.tokenLogoutUrl ]);

    const handleSubscription = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
        if (isExpired) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, [ isExpired ]);

    return (
        <div className = 'welcome-card-text auth-card'>
            <div id = 'jitsi-auth-container'>
                {userData?.user ? (
                    <div className = 'auth-user-info'>
                        <div className = 'auth-header-row'>
                            <h3 className = 'auth-title'>Account</h3>
                            <div className = 'auth-header-buttons'>
                                {isExpired && (
                                    <button
                                        className = 'welcome-page-button auth-button auth-refresh'
                                        onClick = { handleLogin }
                                        title = 'Refresh Session'>
                                        <svg
                                            fill = 'none'
                                            height = '20'
                                            stroke = 'currentColor'
                                            strokeLinecap = 'round'
                                            strokeLinejoin = 'round'
                                            strokeWidth = '2.5'
                                            viewBox = '0 0 24 24'
                                            width = '20'
                                            xmlns = 'http://www.w3.org/2000/svg'>
                                            <path d = 'M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8' />
                                            <path d = 'M21 3v5h-5' />
                                            <path d = 'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16' />
                                            <path d = 'M8 16H3v5' />
                                        </svg>
                                    </button>
                                )}
                                <button
                                    className = 'welcome-page-button auth-button auth-logout'
                                    onClick = { handleLogout }>
                                    Logout
                                </button>
                            </div>
                        </div>

                        {[ 'Name', 'Email', 'Subscription Status' ].map((label, i) => {
                            const key = [ 'name', 'email', 'subscriptionStatus' ][i] as keyof typeof userData.user;
                            const value = userData.user?.[key] || 'Not available';
                            const displayValue = key === 'subscriptionStatus' && value === 'active' ? ' Active' : value;

                            return (
                                <div
                                    className = 'auth-user-detail'
                                    key = { label }>
                                    <span className = 'auth-label'>{label}:</span>
                                    <span className = 'auth-value'>{displayValue}</span>
                                </div>
                            );
                        })}

                        <div className = 'auth-buttons'>
                            <div className = 'auth-button-row'>
                                <a
                                    className = { 'welcome-page-button auth-button' }
                                    href = { 'https://' + authDomain + '/realms/jitsi/account' }
                                    rel = 'noopener noreferrer'
                                    target = '_blank'>
                                    Manage Account
                                </a>

                                <a
                                    className = { `welcome-page-button auth-button ${isExpired ? 'disabled' : ''}` }
                                    href = { subscriptionUrl }
                                    onClick = { handleSubscription }
                                    rel = 'noopener noreferrer'
                                    target = '_blank'>
                                    Manage Subscription
                                </a>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className = 'auth-login-container'>
                        <h3 className = 'auth-title'>Login</h3>
                        <p className = 'auth-description'>Sign in to access your account and meetings</p>

                        <button
                            className = 'welcome-page-button auth-button'
                            onClick = { handleLogin }>
                            Login
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const mapStateToProps = (state: IReduxState) => ({
    jwtFromRedux: {
        jwt: "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJ6ZDBLclk0emtrNkZ4UmtSWFR3MThUUEwzS2E4RU5XaktuUWp2NF80ZTN3In0.eyJleHAiOjE3NDg0NjU1ODksImlhdCI6MTc0ODQ2NDY4OSwiYXV0aF90aW1lIjoxNzQ4NDUyNjIxLCJqdGkiOiJkZjg3NzE3ZC02YjVjLTQ5NTMtOGQwZC1lMDkwY2Y4YmE4ZWMiLCJpc3MiOiJodHRwczovL2F1dGguc29uYWNvdmUuY29tL3JlYWxtcy9qaXRzaSIsImF1ZCI6WyJqaXRzaS13ZWIiLCJhY2NvdW50Il0sInN1YiI6Im1lZXQuaml0c2kiLCJ0eXAiOiJCZWFyZXIiLCJhenAiOiJqaXRzaS13ZWIiLCJzaWQiOiJmN2M3MzY1ZS1mMjAwLTRjMmEtOGQ5Ni02NDRjOTcyNDFmNjIiLCJhbGxvd2VkLW9yaWdpbnMiOlsiaHR0cHM6Ly9tZWV0LnNvbmFjb3ZlLmNvbSJdLCJyZWFsbV9hY2Nlc3MiOnsicm9sZXMiOlsib2ZmbGluZV9hY2Nlc3MiLCJkZWZhdWx0LXJvbGVzLWppdHNpIiwidW1hX2F1dGhvcml6YXRpb24iXX0sInJlc291cmNlX2FjY2VzcyI6eyJhY2NvdW50Ijp7InJvbGVzIjpbIm1hbmFnZS1hY2NvdW50IiwibWFuYWdlLWFjY291bnQtbGlua3MiLCJ2aWV3LXByb2ZpbGUiXX19LCJzY29wZSI6InByb2ZpbGUgZW1haWwiLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsImNvbnRleHQiOnsidXNlciI6eyJzdWJzY3JpcHRpb25fc3RhdHVzIjoiYWN0aXZlIiwibmFtZSI6IlphaWQgQWhtZWQgIiwiZW1haWwiOiJ6YWlkYWhtZWQwNDEyQGdtYWlsLmNvbSJ9fSwibmFtZSI6IlphaWQgQWhtZWQgIiwicHJlZmVycmVkX3VzZXJuYW1lIjoiemFpZGFobWVkMDQxMkBnbWFpbC5jb20iLCJnaXZlbl9uYW1lIjoiWmFpZCIsImZhbWlseV9uYW1lIjoiQWhtZWQgIiwicm9vbSI6IioiLCJlbWFpbCI6InphaWRhaG1lZDA0MTJAZ21haWwuY29tIn0.NOa0vGJj40831-bCgalJa-PDXVev8C7Kc_gyjuunL14uUozHYEkrWXLAsdOw0YTCgxCc9xSY_-qdcBy93X7etWkEi2ZDvOu0yFNVCCR0jCoWzNnnE0nWwJtxyKClYA9flTENeAeFQ5VawynaH1U8bWy5-smpTBeQhpGPNzJUDNuMq5ADk-581o5kAv2ZCZcAG0l1gK80Z4d67Ldby9TeXFXxINGXsarCa-lbRNR_EAK1lp5S0qiIBXMBIWySgMCAcG7VIDEATugcvjCTW1QTAC8GYF9JHW86_nsZORoW6QRPSWMkRvComS64ETaLoS7o5vBfEbmYyOphnpXEVLuzvA",
    },
    config: state["features/base/config"],
});

export default connect(mapStateToProps)(AuthCard);
