import React, { useCallback, useEffect, useState } from 'react';

import Dialog from '../../base/ui/components/web/Dialog';
import { detectBrowserAndDevice } from '../utils';

import TuneIcon from './TuneIcon';

const styles = {
    ol: {
        paddingLeft: 20,
        marginTop: 16
    },
    li: {
        marginBottom: 8
    },
    details: {
        marginTop: 24,
        borderRadius: 8,
        padding: 12
    } as React.CSSProperties,
    summary: {
        cursor: 'pointer',
        fontWeight: 500,
        color: '#007bff'
    },
    deviceHelp: {
        marginTop: 12,
        paddingLeft: 8
    }
};

type Props = {
    onClose: () => void;
};

const browserSteps: Record<string, (string | JSX.Element)[]> = {
    Chrome_Windows: [
        <>
            Click the Tune icon <TuneIcon /> in the address bar.
        </>,
        'Click \'Site settings\'.',
        'Allow Camera and Microphone under Permissions.'
    ],
    Chrome_macOS: [
        <>
            Click the Tune icon <TuneIcon /> in the address bar.
        </>,
        'Click \'Site settings\'.',
        'Allow Camera and Microphone under Permissions.'
    ],
    Chrome_Linux: [
        'Click the lock icon next to the URL in the address bar.',
        'Click \'Site settings\'.',
        'Allow Camera and Microphone.',
        'Reload the page.'
    ],
    Chrome_Android: [
        <>
            Click the Tune icon <TuneIcon /> in the address bar.
        </>,
        'Select \'Permissions\'.',
        'Set \'Camera\' and \'Microphone\' to \'Allow\'.'
    ],
    Chrome_iOS: [
        'Open iOS Settings > Chrome.',
        'Tap \'Camera\' and \'Microphone\'.',
        'Set both to \'Allow\'.',
        'Return to Chrome and reload the page.'
    ],
    Firefox_Windows: [
        <>
            Click the Tune icon <TuneIcon /> next to the URL.
        </>,
        'Enable Mic and Camera.',
        'Refresh the page.'
    ],
    Firefox_macOS: [
        <>
            Click the Tune icon <TuneIcon /> next to the URL.
        </>,
        'Click the arrow > \'More information\'.',
        'Go to the \'Permissions\' tab.',
        'Allow Camera and Microphone.',
        'Reload the page.'
    ],
    Firefox_Linux: [
        'Click the lock icon near the address bar.',
        'Click \'More information\'.',
        'In Permissions, allow Camera and Microphone.',
        'Refresh the page.'
    ],
    Firefox_Android: [
        'Tap the lock icon next to the URL bar.',
        'Tap \'Edit site settings\'.',
        'Allow Camera and Microphone.',
        'Reload the page.'
    ],
    Firefox_iOS: [
        'Open iOS Settings > Firefox.',
        'Enable Camera and Microphone.',
        'Return to Firefox and refresh the page.'
    ],
    Safari_macOS: [
        'Click \'Safari\' in the menu bar > \'Settings for This Website\'.',
        'Set Camera and Microphone to \'Allow\'.',
        'Reload the page.'
    ],
    Safari_iOS: [
        'Go to iOS Settings > Safari.',
        'Tap \'Camera\' and \'Microphone\'.',
        'Set both to \'Allow\'.',
        'Return to Safari and refresh.'
    ],
    Edge_Windows: [
        'Click the lock icon next to the site URL.',
        'Allow Camera and Microphone.',
        'Refresh the page.'
    ],
    Edge_macOS: [
        <>
            Click the Tune icon <TuneIcon /> in the address bar.
        </>,
        'Set Camera and Microphone to \'Allow\'.'
    ],
    Brave_Windows: [
        <>
            Click the Tune icon <TuneIcon /> in the address bar.
        </>,
        'Enable Mic and Camera.',
        'Refresh the page.'
    ],
    Brave_macOS: [
        <>
            Click the Tune icon <TuneIcon /> in the address bar.
        </>,
        'Enable Camera and Microphone in the permissions menu.',
        'Reload the page.'
    ],
    Brave_Linux: [
        <>
            Click the Tune icon <TuneIcon /> in the address bar.
        </>,
        'Allow Camera and Microphone in the permissions list.',
        'Refresh the page.'
    ],
    Brave_Android: [
        <>
            Click the Tune icon <TuneIcon /> next to the URL.
        </>,
        'Tap \'Permissions\'.',
        'Allow Camera and Microphone.',
        'Refresh the page.'
    ],
    Brave_iOS: [
        'Open iOS Settings > Brave.',
        'Tap \'Camera\' and \'Microphone\'.',
        'Set both to \'Allow\'.',
        'Return to Brave and refresh.'
    ],
    default: [
        'Open your browser settings.',
        'Find \'Privacy\' or \'Permissions\' section.',
        'Enable Camera and Microphone for this site.',
        'Reload the page.'
    ]
};

const deviceHelpSteps: Record<string, string[]> = {
    Android: [
        'Open your phone’s Settings.',
        'Tap "Apps" > your browser (e.g. Chrome, Brave).',
        'Tap "Permissions".',
        'Allow access to Camera and Microphone.',
        'Restart the browser and try again.'
    ],
    iOS: [
        'Open iOS Settings.',
        'Scroll down and select your browser (e.g. Safari, Chrome).',
        'Tap "Camera" and "Microphone".',
        'Set both to "Allow".',
        'Return to the browser and reload the page.'
    ]
};

const PermissionsGuideDialog = ({ onClose }: Props) => {
    const [ browser, setBrowser ] = useState('Unknown');
    const [ device, setDevice ] = useState('Unknown');

    useEffect(() => {
        Promise.resolve(detectBrowserAndDevice()).then(({ browser: b, device: d }) => {
            setBrowser(b);
            setDevice(d);
        });
    }, []);

    const handleSubmit = useCallback(() => {
        window.location.reload();
    }, []);

    const renderInstructions = () => {
        const key = `${browser}_${device}`;
        const steps = browserSteps[key] || browserSteps.default;

        return (
            <ol style = { styles.ol }>
                {steps.map((step, idx) => (
                    <li
                        key = { idx }
                        style = { styles.li }>
                        {step}
                    </li>
                ))}
            </ol>
        );
    };

    const renderDeviceHelp = () => {
        if (device !== 'Android' && device !== 'iOS') {
            return null;
        }

        const steps = deviceHelpSteps[device] || [];

        if (!steps.length) {
            return null;
        }

        return (
            <details style = { styles.details }>
                <summary style = { styles.summary }>
                    Still not working?
                </summary>
                <div style = { styles.deviceHelp }>
                    <ol style = { styles.ol }>
                        {steps.map((step, idx) => (
                            <li
                                key = { idx }
                                style = { styles.li }>
                                {step}
                            </li>
                        ))}
                    </ol>
                </div>
            </details>
        );
    };

    return (
        <Dialog
            cancel = {{ translationKey: 'dialog.close' }}
            onCancel = { onClose }
            onSubmit = { handleSubmit }
            submit = {{ translationKey: 'dialog.Ok' }}
            titleKey = 'Enable Mic and Camera'
            useCall = { true }>
            <div className = 'prejoin-permissions-dialog'>
                <p>
                    <strong>Detected:</strong> {browser} on {device}
                </p>
                <h4>How to allow access:</h4>
                {renderInstructions()}
                {renderDeviceHelp()}
            </div>
        </Dialog>
    );
};

export default PermissionsGuideDialog;
