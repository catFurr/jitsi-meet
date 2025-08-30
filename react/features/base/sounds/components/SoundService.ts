import { Howl, Howler } from 'howler';

import { IReduxState } from '../../../app/types';
import { getConferenceState } from '../../conference/functions';
import { Sounds } from '../../config/configType';
import { getDisabledSounds } from '../functions.any';
import logger from '../logger';

interface ISoundRegistration {
    filePath: string;
    options: any;
}

class SoundService {
    /**
     * A map of sound IDs to their initialized Howl instances.
     * This is the internal state of our service.
     *
     * @private
     */
    private howlSounds: Map<string, Howl> = new Map();

    /**
     * A map that stores the registration details for every sound.
     * This is necessary because when the audio output device changes, all Howl
     * instances must be destroyed and re-created on a new AudioContext.
     *
     * @private
     */
    private registrations: Map<string, ISoundRegistration> = new Map();

    /**
     * Initializes the sound service. This should be called once on app startup.
     * It ensures the audio context is unlocked and ready.
     *
     * @returns {void}
     */
    public init(): void {
        Howler.autoUnlock = true;
        logger.info('SoundService initialized.');
    }

    /**
     * Registers a new sound with the service, making it available for playback.
     * This is a plain function that can be called from anywhere.
     *
     * @param {string} soundId - A unique identifier for the sound.
     * @param {string} filePath - The root-relative path to the sound file (e.g., '/meet/sounds/my-sound.mp3').
     * @param {Object} [options] - Optional Howler.js options (e.g., { loop: true }).
     * @returns {void}
     */
    public register(soundId: string, filePath: string, options: any = {}): void {
        if (this.registrations.has(soundId)) {
            logger.warn(`Sound '${soundId}' is already registered.`);

            return;
        }

        this.registrations.set(soundId, { filePath, options });
        this._createHowl(soundId, filePath, options);
    }

    /**
     * Unregisters a sound from the service. This stops any ongoing playback
     * and unloads the audio file from memory.
     *
     * @param {string} soundId - The identifier of the sound to unregister.
     * @returns {void}
     */
    public unregister(soundId: string): void {
        const soundToUnregister = this.howlSounds.get(soundId);

        if (soundToUnregister) {
            // Stop the sound to prevent it from continuing to play after being unregistered.
            soundToUnregister.stop();

            // Unload the audio file from memory. This is crucial for memory management.
            soundToUnregister.unload();

            // Remove the sound from our internal map.
            this.howlSounds.delete(soundId);

            logger.info(`Sound '${soundId}' has been unregistered.`);
        } else {
            logger.warn(`SoundService.unregister: No sound found for id: ${soundId}`);
        }
    }

    /**
     * Plays a registered sound.
     *
     * @param {string} soundId - The identifier of the sound to play.
     * @param {IReduxState} state - The Redux state.
     * @returns {void}
     */
    public play(soundId: string, state: IReduxState): void {
        const soundToPlay = this.howlSounds.get(soundId);

        const disabledSounds = getDisabledSounds(state);
        const { leaving } = getConferenceState(state);

        // Skip playing sounds when leaving, to avoid hearing that recording has stopped and so on.
        if (leaving) {
            return;
        }

        if (!disabledSounds.includes(soundId as Sounds) && !disabledSounds.find(id => soundId.startsWith(id))) {
            if (soundToPlay) {
                soundToPlay.play();
            } else {
                logger.warn(`SoundService.play: No sound found for id: ${soundId}`);
            }
        }
    }

    /**
     * Stops a registered sound.
     *
     * @param {string} soundId - The identifier of the sound to stop.
     * @returns {void}
     */
    public stop(soundId: string): void {
        const soundToStop = this.howlSounds.get(soundId);

        if (soundToStop) {
            soundToStop.stop();
        } else {
            logger.warn(`SoundService.stop: No sound found for id: ${soundId}`);
        }
    }

    /**
     * Mutes or unmutes a specific sound.
     *
     * @param {string} soundId - The identifier of the sound to mute/unmute.
     * @param {boolean} muted - Whether to mute (true) or unmute (false) the sound.
     * @returns {void}
     */
    public muteSound(soundId: string, muted: boolean): void {
        const soundToMute = this.howlSounds.get(soundId);

        if (soundToMute) {
            soundToMute.mute(muted);
            logger.info(`Sound '${soundId}' has been ${muted ? 'muted' : 'unmuted'}.`);
        } else {
            logger.warn(`SoundService.muteSound: No sound found for id: ${soundId}`);
        }
    }

    /**
     * Globally mutes or unmutes all sounds managed by the service.
     *
     * @param {boolean} muted - Whether to mute or unmute the sounds.
     * @returns {void}
     */
    public mute(muted: boolean): void {
        Howler.mute(muted);
    }

    /**
     * Sets the audio output device for all sounds.
     * This works by re-initializing Howler's audio context and re-registering all sounds.
     *
     * @param {string} deviceId - The unique identifier of the audio output device (sinkId).
     */
    public setAudioOutputDevice(deviceId: string): void {
        logger.info(`Attempting to set audio output device to: ${deviceId}`);

        // 1. Unload all current sounds.
        Howler.unload();
        this.howlSounds.clear();

        // 2. Re-initialize Howler with the new sinkId.
        // @ts-ignore - sinkId is a valid but sometimes untyped property
        Howler.init({ sinkId: deviceId });

        // 3. Re-create all the sounds using our stored registration info.
        logger.info('Re-registering all sounds on the new audio output device...');
        for (const [ soundId, registrationInfo ] of this.registrations.entries()) {
            this._createHowl(soundId, registrationInfo.filePath, registrationInfo.options);
        }
    }

    /**
     * Internal helper to create a Howl instance and add it to the active sounds map.
     *
     * @param {string} soundId - The unique identifier for the sound.
     * @param {string} filePath - The path to the audio file.
     * @param {Object} options - Optional Howler.js options.
     * @private
     * @returns {void}
     */
    private _createHowl(soundId: string, filePath: string, options: any): void {
        const correctedSrc = `/meet/sounds/${filePath}`;

        const newHowl = new Howl({
            src: correctedSrc,
            loop: options.loop || false,
            onload: () => {
                logger.info(`Sound '${soundId}' loaded successfully.`);
            },
            onloaderror: (howlId: number, error: any) => {
                logger.error(`Error loading sound '${soundId}' from '${filePath}':`, error);
            },
            onplay: () => {
                logger.info(`Sound '${soundId}' played successfully.`);
            },
            onplayerror: (howlId: number, error: any) => {
                logger.error(`Error playing sound '${soundId}' from '${filePath}':`, error);
            },
        });

        this.howlSounds.set(soundId, newHowl);
    }
}

// Create and export a single, global instance of the service.
export default new SoundService();
