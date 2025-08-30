import i18next from 'i18next';

import { registerE2eeAudioFiles } from '../../../features/e2ee/functions';
import { registerRecordingAudioFiles } from '../../../features/recording/functions';
import { AudioSupportedLanguage } from '../media/constants';
import StateListenerRegistry from '../redux/StateListenerRegistry';

/**
 * Returns whether the language is supported for audio messages.
 *
 * @param {string} language - The requested language.
 * @returns {boolean}
 */
function isLanguageSupported(language: string): Boolean {
    return Boolean(AudioSupportedLanguage[language as keyof typeof AudioSupportedLanguage]);
}

/**
 * Checking if it's necessary to reload the translated files.
 *
 * @param {string} language - The next language.
 * @param {string} prevLanguage - The previous language.
 * @returns {boolean}
 */
function shouldReloadAudioFiles(language: string, prevLanguage: string): Boolean {
    const isNextLanguageSupported = isLanguageSupported(language);
    const isPrevLanguageSupported = isLanguageSupported(prevLanguage);

    return (

        // From an unsupported language (which defaulted to English) to a supported language (that isn't English).
        (isNextLanguageSupported && language !== AudioSupportedLanguage.en && !isPrevLanguageSupported)
        // From a supported language (that wasn't English) to English.
        || (!isNextLanguageSupported && isPrevLanguageSupported && prevLanguage !== AudioSupportedLanguage.en)
        // From a supported language to another.
        || (isNextLanguageSupported && isPrevLanguageSupported)
    );
}

/**
 * Set up state change listener for language.
 */
StateListenerRegistry.register(
    () => i18next.language,
    (language, _, prevLanguage): void => {

        if (language !== prevLanguage && shouldReloadAudioFiles(language, prevLanguage)) {
            registerE2eeAudioFiles(true);
            registerRecordingAudioFiles(true);
        }
    }
);
