import { Howl, Howler } from 'howler';

import logger from '../logger';

class SoundService {
    /**
     * A map of sound IDs to their initialized Howl instances.
     * This is the internal state of our service.
     *
     * @private
     */
    private howlSounds: Map<string, Howl> = new Map();

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
        if (this.howlSounds.has(soundId)) {
            logger.warn(`Sound '${soundId}' is already registered.`);

            return;
        }

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
     * @returns {void}
     */
    public play(soundId: string): void {
        const soundToPlay = this.howlSounds.get(soundId);

        console.log(`playing '${soundId}'`);

        if (soundToPlay) {
            soundToPlay.play();
        } else {
            logger.warn(`SoundService.play: No sound found for id: ${soundId}`);
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
     * Globally mutes or unmutes all sounds managed by the service.
     *
     * @param {boolean} muted - Whether to mute or unmute the sounds.
     * @returns {void}
     */
    public mute(muted: boolean): void {
        Howler.mute(muted);
    }
}

// Create and export a single, global instance of the service.
export default new SoundService();
