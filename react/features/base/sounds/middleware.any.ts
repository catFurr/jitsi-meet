import i18next from 'i18next';

import { registerE2eeAudioFiles } from '../../../features/e2ee/functions';
import { registerRecordingAudioFiles } from '../../../features/recording/functions';
import { APP_WILL_MOUNT } from '../app/actionTypes';
import { AudioSupportedLanguage } from '../media/constants';
import MiddlewareRegistry from '../redux/MiddlewareRegistry';
import StateListenerRegistry from '../redux/StateListenerRegistry';

import SoundService from './components/SoundService';
import logger from './logger';

MiddlewareRegistry.register(store => next => action => {
    switch (action.type) {
    case APP_WILL_MOUNT:
        SoundService.init();

        const state = store.getState();
        const sounds = state['features/base/sounds'];

        for (const [ soundId, soundData ] of sounds.entries()) {
            const correctedSrc = `${soundData.src}`;

            if (typeof correctedSrc === 'string') {
                SoundService.register(soundId, correctedSrc);
            } else {
                logger.warn(`Sound with ID '${soundId}' was registered without a valid string source.`);
            }
        }
        break;
    }

    return next(action);
});

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
    (language, { dispatch }, prevLanguage): void => {

        if (language !== prevLanguage && shouldReloadAudioFiles(language, prevLanguage)) {
            registerE2eeAudioFiles(dispatch, true);
            registerRecordingAudioFiles(dispatch, true);
        }
    }
);
