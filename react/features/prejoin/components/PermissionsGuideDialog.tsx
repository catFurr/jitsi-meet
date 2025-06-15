import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import Dialog from "../../base/ui/components/web/Dialog";
import { detectBrowserAndDevice } from "../utils";

type Props = {
    onClose: () => void;
};

const videoLinks: Record<string, string> = {
    // Chrome desktop & mobile
    Chrome_Windows: "kCCEzRIL‑c4",
    Chrome_macOS: "kCCEzRIL‑c4",
    Chrome_Linux: "kCCEzRIL‑c4",
    Chrome_Android: "kCCEzRIL‑c4",
    Chrome_iOS: "kCCEzRIL‑c4",

    // Firefox desktop & mobile
    Firefox_Windows: "I4gvjfZmmmA",
    Firefox_macOS: "I4gvjfZmmmA",
    Firefox_Linux: "I4gvjfZmmmA",
    Firefox_Android: "-wurPpt_9Kw",
    Firefox_iOS: "-wurPpt_9Kw",

    // Edge desktop
    Edge_Windows: "f5PhfIM4wlU",
    Edge_macOS: "f5PhfIM4wlU",

    // Safari desktop & mobile
    Safari_macOS: "IcER3yshlzo",
    Safari_iOS: "fyH02rYLiyg",

    // Brave desktop & mobile (added Brave-specific guides)
    Brave_Windows: "jB21j7C0n90",
    Brave_macOS: "jB21j7C0n90",
    Brave_Linux: "jB21j7C0n90",
    Brave_Android: "nYJEdIStsM8",
    Brave_iOS: "nYJEdIStsM8",
};

const PermissionsGuideDialog = ({ onClose }: Props) => {
    const { t } = useTranslation();
    const [browser, setBrowser] = useState("Unknown");
    const [device, setDevice] = useState("Unknown");

    useEffect(() => {
        Promise.resolve(detectBrowserAndDevice()).then(({ browser, device }) => {
            setBrowser(browser);
            setDevice(device);
        });
    }, []);

    const videoId = videoLinks[`${browser}_${device}`];

    return (
        <Dialog
            cancel={{ translationKey: "dialog.close" }}
            hideCloseButton={false}
            onCancel={onClose}
            titleKey="prejoin.connection.permissionsHelpTitle"
        >
            <div className="prejoin-permissions-dialog">
                <p>
                    <strong>Detected:</strong> {browser} on {device}
                </p>
                <h4>{t("prejoin.connection.permissionsHelpSteps") || "How to allow access:"}</h4>

                {videoId ? (
                    <div
                        style={{
                            position: "relative",
                            paddingBottom: "56.25%",
                            height: 0,
                            marginTop: 16,
                            overflow: "hidden",
                        }}
                    >
                        <iframe
                            src={`https://www.youtube.com/embed/${videoId}?rel=0`}
                            title="Permission Guide Video"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                height: "100%",
                                border: "none",
                                borderRadius: 8,
                            }}
                        />
                    </div>
                ) : (
                    <p>
                        {t("prejoin.connection.permissionsHelpFallback") ||
                            "Please check your browser settings to allow camera and microphone access."}
                    </p>
                )}
            </div>
        </Dialog>
    );
};

export default PermissionsGuideDialog;
