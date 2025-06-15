import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Dialog from '../../base/ui/components/web/Dialog';
import { detectBrowserAndDevice } from '../utils';

type Props = {
    onClose: () => void;
};

const browserSteps: Record<string, string[]> = {
    Chrome_Windows: [
        'Click the lock icon next to the URL in the address bar.',
        'Click \'Site settings\'.',
        'Set both Camera and Microphone to \'Allow\'.',
        'Refresh the page.',
    ],
    Chrome_macOS: [
        'Click the lock icon next to the URL in the address bar.',
        'Select \'Site settings\'.',
        'Set \'Camera\' and \'Microphone\' to \'Allow\'.',
        'Reload the page.',
    ],
    Chrome_Linux: [
        'Click the lock icon next to the URL in the address bar.',
        'Click \'Site settings\'.',
        'Allow Camera and Microphone.',
        'Reload the page.',
    ],
    Chrome_Android: [
        'Tap the lock icon next to the URL.',
        'Select \'Permissions\'.',
        'Allow Camera and Microphone.',
        'Reload the page.',
    ],
    Chrome_iOS: [
        'Open iOS Settings > Chrome.',
        'Tap \'Camera\' and \'Microphone\'.',
        'Set both to \'Allow\'.',
        'Return to Chrome and reload the page.',
    ],
    Firefox_Windows: [
        'Click the lock icon next to the URL.',
        'Click the arrow next to \'Connection secure\'.',
        'Click \'More information\'.',
        'Allow Camera and Microphone in Permissions tab.',
        'Refresh the page.',
    ],
    Firefox_macOS: [
        'Click the lock icon next to the URL.',
        'Click the arrow > \'More information\'.',
        'Go to the \'Permissions\' tab.',
        'Allow Camera and Microphone.',
        'Reload the page.',
    ],
    Firefox_Linux: [
        'Click the lock icon near the address bar.',
        'Click \'More information\'.',
        'In Permissions, allow Camera and Microphone.',
        'Refresh the page.',
    ],
    Firefox_Android: [
        'Tap the lock icon next to the URL bar.',
        'Tap \'Edit site settings\'.',
        'Allow Camera and Microphone.',
        'Reload the page.',
    ],
    Firefox_iOS: [
        'Open iOS Settings > Firefox.',
        'Enable Camera and Microphone.',
        'Return to Firefox and refresh the page.',
    ],
    Safari_macOS: [
        'Click \'Safari\' in the menu bar > \'Settings for This Website\'.',
        'Set Camera and Microphone to \'Allow\'.',
        'Reload the page.',
    ],
    Safari_iOS: [
        'Go to iOS Settings > Safari.',
        'Tap \'Camera\' and \'Microphone\'.',
        'Set both to \'Allow\'.',
        'Return to Safari and refresh.',
    ],
    Edge_Windows: [
        'Click the lock icon next to the site URL.',
        'Select \'Permissions for this site\'.',
        'Allow Camera and Microphone.',
        'Refresh the page.',
    ],
    Edge_macOS: [
        'Click the lock icon in the address bar.',
        'Click \'Site settings\'.',
        'Set Camera and Microphone to \'Allow\'.',
        'Reload the page.',
    ],
    Brave_Windows: [
        'Click the lock icon in the address bar.',
        'Choose \'Site settings\'.',
        'Allow Camera and Microphone.',
        'Refresh the page.',
    ],
    Brave_macOS: [
        'Click the lock icon in the address bar.',
        'Select \'Site settings\'.',
        'Enable Camera and Microphone.',
        'Reload the page.',
    ],
    Brave_Linux: [
        'Click the lock icon in the address bar.',
        'Go to \'Site settings\'.',
        'Allow Camera and Microphone.',
        'Refresh the page.',
    ],
    Brave_Android: [
        'Tap the lock icon next to the URL.',
        'Tap \'Permissions\'.',
        'Allow Camera and Microphone.',
        'Refresh the page.',
    ],
    Brave_iOS: [
        'Open iOS Settings > Brave.',
        'Tap \'Camera\' and \'Microphone\'.',
        'Set both to \'Allow\'.',
        'Return to Brave and refresh.',
    ],
    default: [
        'Open your browser settings.',
        'Find \'Privacy\' or \'Permissions\' section.',
        'Enable Camera and Microphone for this site.',
        'Reload the page.',
    ],
};

const PermissionsGuideDialog = ({ onClose }: Props) => {
    const { t } = useTranslation();
    const [ browser, setBrowser ] = useState('Unknown');
    const [ device, setDevice ] = useState('Unknown');

    useEffect(() => {
        Promise.resolve(detectBrowserAndDevice()).then(({ browser, device }) => {
            setBrowser(browser);
            setDevice(device);
        });
    }, []);

    const renderInstructions = () => {
        const key = `${browser}_${device}`;
        const steps = browserSteps[key] || browserSteps.default;

        return (
            <ol style = {{ paddingLeft: 20, marginTop: 16 }}>
                {steps.map((step, idx) => (
                    <li
                        key = { idx }
                        style = {{ marginBottom: 8 }}>
                        {step}
                    </li>
                ))}
            </ol>
        );
    };

    return (
        <Dialog
            cancel = {{ translationKey: 'dialog.close' }}
            hideCloseButton = { false }
            onCancel = { onClose }
            titleKey = 'Enable Mic and Camera'>
            <div className = 'prejoin-permissions-dialog'>
                <p>
                    <strong>Detected:</strong> {browser} on {device}
                </p>
                <h4>How to allow access:</h4>
                {renderInstructions()}
            </div>
        </Dialog>
    );
};

export default PermissionsGuideDialog;
