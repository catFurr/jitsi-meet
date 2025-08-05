import logger from '../../logger';

/**
 * Interface for a WebAudio-based sound that can be played through the WebAudioSoundManager.
 */
export interface IWebAudioSound {
    /**
     * The audio buffer containing the decoded audio data.
     */
    buffer: AudioBuffer | null;

    /**
     * The unique identifier for the sound.
     */
    id: string;

    /**
     * Whether the sound should loop when played.
     */
    loop: boolean;

    /**
     * Currently playing source node, if any.
     */
    sourceNode?: AudioBufferSourceNode;

    /**
     * The URL source of the sound.
     */
    src: string;
}

/**
 * Singleton manager for WebAudio-based notification sounds.
 * This replaces individual HTML audio elements with a single AudioContext
 * to reduce thread usage in WebKitGTK browsers.
 */
export class WebAudioSoundManager {
    private static _instance: WebAudioSoundManager | null = null;
    private _audioContext: AudioContext | null = null;
    private _sounds: Map<string, IWebAudioSound> = new Map();
    private _gainNode: GainNode | null = null;
    private _isInitialized = false;
    private _currentSinkId: string | null = null;

    /**
     * Private constructor for singleton pattern.
     */
    private constructor() {
        // Private constructor
    }

    /**
     * Gets the singleton instance of WebAudioSoundManager.
     *
     * @returns {WebAudioSoundManager} The singleton instance.
     */
    static getInstance(): WebAudioSoundManager {
        if (!WebAudioSoundManager._instance) {
            WebAudioSoundManager._instance = new WebAudioSoundManager();
        }

        return WebAudioSoundManager._instance;
    }

    /**
     * Initializes the AudioContext and sets up the audio graph.
     * This should be called once when the application starts.
     *
     * @returns {Promise<void>}
     */
    async initialize(): Promise<void> {
        if (this._isInitialized) {
            return;
        }

        try {
            // Create AudioContext
            // @ts-ignore - AudioContext might not have all type definitions
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;

            this._audioContext = new AudioContextClass();

            // Create a master gain node for volume control
            this._gainNode = this._audioContext.createGain();
            this._gainNode.connect(this._audioContext.destination);

            this._isInitialized = true;
            logger.info('WebAudioSoundManager initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize WebAudioSoundManager:', error);
            throw error;
        }
    }

    /**
     * Registers a new sound by loading and decoding the audio file.
     *
     * @param {string} id - The unique identifier for the sound.
     * @param {string} src - The URL of the audio file.
     * @param {Object} options - Additional options for the sound.
     * @param {boolean} options.loop - Whether the sound should loop.
     * @returns {Promise<void>}
     */
    async registerSound(id: string, src: string, options: { loop?: boolean; } = {}): Promise<void> {
        if (!this._isInitialized) {
            await this.initialize();
        }

        // Check if sound is already registered
        if (this._sounds.has(id)) {
            // Sound already registered, skip silently
            return;
        }

        // Check if we already have a sound with the same source - reuse the buffer
        let existingSound = null;

        for (const sound of Array.from(this._sounds.values())) {
            if (sound.src === src && sound.buffer) {
                existingSound = sound;
                break;
            }
        }

        const sound: IWebAudioSound = {
            id,
            src,
            loop: options.loop || false,
            buffer: existingSound ? existingSound.buffer : null,
        };

        this._sounds.set(id, sound);

        // If we found an existing buffer, we're done
        if (existingSound) {
            return;
        }

        // Load and decode the audio file asynchronously
        await this._loadSoundWithFallback(sound, src, id);
    }

    /**
     * Attempts to load a sound with fallback to different formats.
     *
     * @private
     * @param {IWebAudioSound} sound - The sound object to load.
     * @param {string} originalSrc - The original source URL.
     * @param {string} id - The sound ID for logging.
     * @returns {Promise<void>}
     */
    private async _loadSoundWithFallback(sound: IWebAudioSound, originalSrc: string, id: string): Promise<void> {
        // Try different formats in order of preference: .mp3, .opus, .wav
        // .mp3 is most widely supported, .wav is largest but most compatible
        const formats = [ '.mp3', '.opus', '.wav' ];
        const baseSrc = originalSrc.replace(/\.[^/.]+$/, ''); // Remove extension

        for (const format of formats) {
            const src = baseSrc + format;

            try {
                const response = await fetch(src);

                if (!response.ok) {
                    // Don't log 404s as they're expected for missing formats
                    continue;
                }

                const arrayBuffer = await response.arrayBuffer();

                if (arrayBuffer.byteLength === 0) {
                    continue;
                }

                if (this._audioContext) {
                    try {
                        const audioBuffer = await this._audioContext.decodeAudioData(arrayBuffer);

                        sound.buffer = audioBuffer;

                        // Update all sounds with the same src to use this buffer
                        for (const otherSound of Array.from(this._sounds.values())) {
                            if (otherSound.src === originalSrc && !otherSound.buffer) {
                                otherSound.buffer = audioBuffer;
                            }
                        }

                        logger.info(
                            `Sound ${id} loaded successfully from ${src} (${audioBuffer.duration.toFixed(2)}s, ${
                                audioBuffer.sampleRate
                            }Hz)`
                        );

                        return; // Success, exit early
                    } catch (decodeError) {
                        logger.warn(`Failed to decode ${src}, trying next format:`, decodeError);
                        continue;
                    }
                }
            } catch (error) {
                // Network or other errors - continue to next format
                continue;
            }
        }

        // If we get here, all formats failed
        logger.error(`Failed to load sound ${id} in any format (.mp3, .opus, .wav) from base: ${baseSrc}`);
    }

    /**
     * Unregisters a sound and cleans up resources.
     *
     * @param {string} id - The unique identifier for the sound.
     * @returns {void}
     */
    unregisterSound(id: string): void {
        const sound = this._sounds.get(id);

        if (sound) {
            // Stop any playing instance
            if (sound.sourceNode) {
                try {
                    sound.sourceNode.stop();
                } catch (e) {
                    // Ignore errors when stopping
                }
            }
            this._sounds.delete(id);
            logger.info(`Sound ${id} unregistered`);
        }
    }

    /**
     * Plays a registered sound.
     *
     * @param {string} id - The unique identifier for the sound.
     * @returns {Promise<void>}
     */
    async play(id: string): Promise<void> {
        if (!this._isInitialized || !this._audioContext || !this._gainNode) {
            logger.warn('WebAudioSoundManager not initialized');

            return;
        }

        const sound = this._sounds.get(id);

        if (!sound) {
            logger.warn(`Sound ${id} not found`);

            return;
        }

        if (!sound.buffer) {
            logger.warn(`Sound ${id} not loaded yet`);

            return;
        }

        // Resume AudioContext if it's suspended (required by some browsers)
        if (this._audioContext.state === 'suspended') {
            try {
                await this._audioContext.resume();
            } catch (error) {
                logger.error('Failed to resume AudioContext:', error);

                return;
            }
        }

        // Stop any existing playback of this sound
        if (sound.sourceNode) {
            try {
                sound.sourceNode.stop();
            } catch (e) {
                // Ignore errors when stopping
            }
        }

        // Create a new source node for this playback
        const sourceNode = this._audioContext.createBufferSource();

        sourceNode.buffer = sound.buffer;
        sourceNode.loop = sound.loop;

        // Connect to the audio graph
        sourceNode.connect(this._gainNode);

        // Store reference for stopping
        sound.sourceNode = sourceNode;

        // Clean up reference when playback ends
        sourceNode.onended = () => {
            if (sound.sourceNode === sourceNode) {
                delete sound.sourceNode;
            }
        };

        // Start playback
        sourceNode.start(0);
        logger.debug(`Playing sound ${id}`);
    }

    /**
     * Stops a playing sound.
     *
     * @param {string} id - The unique identifier for the sound.
     * @returns {void}
     */
    stop(id: string): void {
        const sound = this._sounds.get(id);

        if (sound?.sourceNode) {
            try {
                sound.sourceNode.stop();
                delete sound.sourceNode;
                logger.debug(`Stopped sound ${id}`);
            } catch (error) {
                logger.error(`Error stopping sound ${id}:`, error);
            }
        }
    }

    /**
     * Sets the master volume for all sounds.
     *
     * @param {number} volume - The volume level (0.0 to 1.0).
     * @returns {void}
     */
    setVolume(volume: number): void {
        if (this._gainNode) {
            this._gainNode.gain.value = Math.max(0, Math.min(1, volume));
        }
    }

    /**
     * Checks if the WebAudioSoundManager is initialized and ready.
     *
     * @returns {boolean}
     */
    isInitialized(): boolean {
        return this._isInitialized;
    }

    /**
     * Gets the current AudioContext state.
     *
     * @returns {AudioContextState | null}
     */
    getAudioContextState(): AudioContextState | null {
        return this._audioContext ? this._audioContext.state : null;
    }

    /**
     * Sets the audio output device (sink) for all sounds.
     * Note: This requires browser support for AudioContext.setSinkId.
     *
     * @param {string} sinkId - The ID of the audio output device.
     * @returns {Promise<void>}
     */
    async setSinkId(sinkId: string): Promise<void> {
        if (!this._audioContext) {
            logger.warn('Cannot set sink ID: AudioContext not initialized');

            return;
        }

        this._currentSinkId = sinkId;

        // Check if setSinkId is supported (it's a newer API)
        // @ts-ignore - setSinkId might not be in TypeScript definitions yet
        if (typeof this._audioContext.setSinkId === 'function') {
            try {
                // @ts-ignore
                await this._audioContext.setSinkId(sinkId);
                logger.info(`Audio output device changed to: ${sinkId}`);
            } catch (error) {
                logger.error('Failed to set audio output device:', error);
                throw error;
            }
        } else {
            logger.warn('AudioContext.setSinkId is not supported in this browser');
        }
    }

    /**
     * Cleanup method to release resources.
     * Should be called when the application is shutting down.
     *
     * @returns {void}
     */
    dispose(): void {
        // Stop all playing sounds
        for (const sound of Array.from(this._sounds.values())) {
            if (sound.sourceNode) {
                try {
                    sound.sourceNode.stop();
                } catch (e) {
                    // Ignore errors
                }
            }
        }

        // Clear sounds
        this._sounds.clear();

        // Close AudioContext
        if (this._audioContext && this._audioContext.state !== 'closed') {
            this._audioContext.close();
        }

        // Reset state
        this._audioContext = null;
        this._gainNode = null;
        this._isInitialized = false;

        logger.info('WebAudioSoundManager disposed');
    }
}
