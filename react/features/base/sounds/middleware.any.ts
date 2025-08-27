import { Howl, Howler } from 'howler';
import i18next from 'i18next';

import { IStore } from '../../app/types';
import { APP_WILL_MOUNT } from '../app/actionTypes';
import { AudioSupportedLanguage } from '../media/constants';
import MiddlewareRegistry from '../redux/MiddlewareRegistry';
import StateListenerRegistry from '../redux/StateListenerRegistry';

import { PLAY_SOUND, SET_SOUNDS_MUTED, STOP_SOUND } from './actionTypes';
import logger from './logger';

const howlSounds: Map<string, Howl> = new Map();

/**
 * Initializes all registered sounds as Howl objects on application startup.
 *
 * @param {Store} store - The Redux store instance.
 * @private
 * @returns {void}
 */
function _initializeHowlerSounds({ getState }: IStore) {
    Howler.autoUnlock = true;

    const state = getState();
    const sounds = state['features/base/sounds'];

    for (const [ soundId, soundData ] of sounds.entries()) {
        if (howlSounds.has(soundId)) {
            continue; // Don't re-initialize if it already exists.
        }

        const { src } = soundData;
        const correctedSrc = `/meet/${src}`;

        const howlSound = new Howl({
            src: [ correctedSrc ],
            onload: () => {
                logger.info(`Sound '${soundId}' loaded successfully via Howler.`);
            },
            onloaderror: (howlId, error) => {
                logger.error(`Howler error loading sound '${soundId}' from '${correctedSrc}':`, error);
            },
            onplay: () => {
                logger.info(`Sound '${soundId}' played successfully via Howler.`);
            },
            onplayerror: (howlId, error) => {
                logger.error(`Howler error playing sound '${soundId}' from '${correctedSrc}':`, error);
            }
        });

        howlSounds.set(soundId, howlSound);
    }
}

MiddlewareRegistry.register(store => next => action => {
    switch (action.type) {
    case APP_WILL_MOUNT:
        _initializeHowlerSounds(store);
        break;
    case PLAY_SOUND:
        _playSound(action.soundId);
        break;
    case STOP_SOUND:
        _stopSound(action.soundId);
        break;
    case SET_SOUNDS_MUTED:
        Howler.mute(action.muted);
        break;
    }

    return next(action);
});

function _playSound(soundId: string) {
    const soundToPlay = howlSounds.get(soundId);

    if (soundToPlay) {
        logger.info(`Attempting to play sound '${soundId}' with Howler.`);
        soundToPlay.play();
    } else {
        logger.warn(`PLAY_SOUND: No Howl instance found for id: ${soundId}`);
    }
}


/**
 * Stops a sound from our Howl instance map.
 *
 * @param {string} soundId - The identifier of the sound to be stopped.
 * @private
 * @returns {void}
 */
function _stopSound(soundId: string) {
    const soundToStop = howlSounds.get(soundId);

    if (soundToStop) {
        soundToStop.stop();
    } else {
        logger.warn(`STOP_SOUND: No Howl instance found for id: ${soundId}`);
    }
}

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
