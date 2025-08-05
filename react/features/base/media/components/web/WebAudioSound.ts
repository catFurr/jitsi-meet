import logger from '../../logger';
import { AudioElement } from '../AbstractAudio';

import { WebAudioSoundManager } from './WebAudioSoundManager';

/**
 * WebAudioSound implements the AudioElement interface using WebAudio API
 * instead of HTML audio elements. This reduces thread usage in WebKitGTK browsers.
 */
export class WebAudioSound implements AudioElement {
    private _id: string;
    private _src: string;
    private _loop: boolean;
    private _manager: WebAudioSoundManager;
    private _currentTime: number = 0;
    private _isRegistered: boolean = false;

    /**
     * Creates a new WebAudioSound instance.
     *
     * @param {string} id - The unique identifier for this sound.
     * @param {string} src - The URL of the audio file.
     * @param {boolean} loop - Whether the sound should loop.
     */
    constructor(id: string, src: string, loop: boolean = false) {
        this._id = id;
        this._src = src;
        this._loop = loop;
        this._manager = WebAudioSoundManager.getInstance();

        // Register the sound with the manager
        this._registerSound();
    }

    /**
     * Registers this sound with the WebAudioSoundManager.
     *
     * @private
     * @returns {Promise<void>}
     */
    private async _registerSound(): Promise<void> {
        try {
            await this._manager.registerSound(this._id, this._src, { loop: this._loop });
            this._isRegistered = true;
        } catch (error) {
            logger.error(`Failed to register WebAudioSound ${this._id}:`, error);
        }
    }

    /**
     * Gets the current playback time.
     * Note: WebAudio doesn't provide easy access to current playback position,
     * so this is a simplified implementation.
     *
     * @returns {number} The current time in seconds.
     */
    get currentTime(): number {
        return this._currentTime;
    }

    /**
     * Sets the current playback time.
     * Note: Setting currentTime on WebAudio requires stopping and restarting playback,
     * which is complex. This implementation is simplified.
     *
     * @param {number} value - The time to seek to.
     * @returns {void}
     */
    set currentTime(value: number) {
        this._currentTime = value;
        // In a full implementation, we would need to stop current playback
        // and restart from the new position
        logger.warn('Setting currentTime on WebAudioSound is not fully implemented');
    }

    /**
     * Pauses the audio playback.
     * Note: WebAudio doesn't have a pause method, only stop.
     * This implementation stops the audio.
     *
     * @returns {void}
     */
    pause(): void {
        this.stop();
    }

    /**
     * Starts playing the audio.
     * Note: AudioElement interface expects synchronous play method.
     *
     * @returns {void}
     */
    play(): void {
        if (!this._isRegistered) {
            logger.warn(`WebAudioSound ${this._id} not yet registered, deferring playback`);
            // Schedule playback for next tick
            setTimeout(() => this.play(), 100);

            return;
        }

        // Play the sound asynchronously but return immediately
        this._manager
            .play(this._id)
            .then(() => {
                this._currentTime = 0; // Reset current time on play
            })
            .catch(error => {
                logger.error(`Failed to play WebAudioSound ${this._id}:`, error);
            });
    }

    /**
     * Sets the audio output device.
     * Delegates to the WebAudioSoundManager which manages the AudioContext.
     *
     * @param {string} sinkId - The ID of the output device.
     * @returns {Promise<void>}
     */
    setSinkId?(sinkId: string): Promise<void> {
        return this._manager.setSinkId(sinkId);
    }

    /**
     * Stops the audio playback and resets to the beginning.
     *
     * @returns {void}
     */
    stop(): void {
        this._manager.stop(this._id);
        this._currentTime = 0;
    }

    /**
     * Cleans up resources when this sound is no longer needed.
     *
     * @returns {void}
     */
    dispose(): void {
        this._manager.unregisterSound(this._id);
        this._isRegistered = false;
    }
}
