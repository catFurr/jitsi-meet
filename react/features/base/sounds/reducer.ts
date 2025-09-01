import { AnyAction } from 'redux';

import ReducerRegistry from '../redux/ReducerRegistry';

import {
    REGISTER_SOUND,
    UNREGISTER_SOUND,
    _ADD_AUDIO_ELEMENT,
    _REMOVE_AUDIO_ELEMENT
} from './actionTypes';

/**
 * The structure use by this reducer to describe a sound.
 */
export type Sound = {

    /**
     * This field is container for all optional parameters related to the sound.
     */
    options?: {
        loop: boolean;
    };

    /**
     * This field describes the source of the audio resource to be played. It
     * can be either a path to the file or an object depending on the platform
     * (native vs web).
     */
    src?: Object | string;
};

/**
 * Initial/default state of the feature {@code base/sounds}. It is a {@code Map}
 * of globally stored sounds.
 *
 * @type {Map<string, Sound>}
 */
const DEFAULT_STATE = new Map();

export type ISoundsState = Map<string, Sound>;

/**
 * The base/sounds feature's reducer.
 */
ReducerRegistry.register<ISoundsState>(
    'features/base/sounds',
    (state = DEFAULT_STATE, action): ISoundsState => {
        switch (action.type) {
        case REGISTER_SOUND:
            console.log(state);

            return _registerSound(state, action);

        case UNREGISTER_SOUND:
            return _unregisterSound(state, action);

        default:
            return state;
        }
    });


/**
 * Registers a new {@link Sound} for given id and source. It will make
 * the {@link SoundCollection} component render HTMLAudioElement for given
 * source making it available for playback through the redux actions.
 *
 * @param {Map<string, Sound>} state - The current Redux state of the sounds
 * features.
 * @param {REGISTER_SOUND} action - The register sound action.
 * @private
 * @returns {Map<string, Sound>}
 */
function _registerSound(state: ISoundsState, action: AnyAction) {
    const nextState = new Map(state);

    nextState.set(action.soundId, {
        src: action.src,
        options: action.options
    });

    return nextState;
}

/**
 * Unregisters a {@link Sound} which will make the {@link SoundCollection}
 * component stop rendering the corresponding HTMLAudioElement. This will
 * result further in the audio resource disposal.
 *
 * @param {Map<string, Sound>} state - The current Redux state of this feature.
 * @param {UNREGISTER_SOUND} action - The unregister sound action.
 * @private
 * @returns {Map<string, Sound>}
 */
function _unregisterSound(state: ISoundsState, action: AnyAction) {
    const nextState = new Map(state);

    nextState.delete(action.soundId);

    return nextState;
}
