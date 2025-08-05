import React from 'react';

import AbstractAudio, { IProps } from '../AbstractAudio';

import { WebAudioSound } from './WebAudioSound';

/**
 * The React/Web {@link Component} which is similar to and wraps around
 * {@code HTMLAudioElement} in order to facilitate cross-platform source code.
 */
export default class Audio extends AbstractAudio {
    /**
     * Set to <code>true</code> when the whole file is loaded.
     */
    _audioFileLoaded: boolean;

    /**
     * Reference to the HTML audio element, stored until the file is ready.
     */
    _ref?: HTMLAudioElement | null;

    /**
     * WebAudioSound instance used when this is a notification sound.
     */
    _webAudioSound?: WebAudioSound;

    /**
     * Creates new <code>Audio</code> element instance with given props.
     *
     * @param {Object} props - The read-only properties with which the new
     * instance is to be initialized.
     */
    constructor(props: IProps) {
        super(props);

        // Bind event handlers so they are only bound once for every instance.
        this._onCanPlayThrough = this._onCanPlayThrough.bind(this);
        this._setRef = this._setRef?.bind(this);

        // Check if this is a notification sound based on the presence of setRef prop
        // Notification sounds from SoundCollection always have setRef
        this._isNotificationSound = this._isNotificationSound.bind(this);
    }

    /**
     * Determines if this Audio component is being used for notification sounds.
     *
     * @private
     * @returns {boolean}
     */
    _isNotificationSound() {
        // Notification sounds from SoundCollection have setRef prop and src is a string path
        return Boolean(this.props.setRef && typeof this.props.src === 'string');
    }

    /**
     * Implements React's {@link Component#render()}.
     *
     * @inheritdoc
     * @returns {ReactElement}
     */
    override render() {
        // For notification sounds, we don't render an HTML audio element
        // The WebAudioSound will handle playback
        if (this._isNotificationSound()) {
            return null;
        }

        // For participant audio tracks, render the HTML audio element as before
        return (
            <audio
                loop = { Boolean(this.props.loop) }
                onCanPlayThrough = { this._onCanPlayThrough }
                preload = 'auto'
                ref = { this._setRef }
                src = { this.props.src } />
        );
    }

    /**
     * Stops the audio HTML element.
     *
     * @returns {void}
     */
    override stop() {
        if (this._webAudioSound) {
            this._webAudioSound.stop();
        } else if (this._ref) {
            this._ref.pause();
            this._ref.currentTime = 0;
        }
    }

    /**
     * If audio element reference has been set and the file has been
     * loaded then {@link setAudioElementImpl} will be called to eventually add
     * the audio to the Redux store.
     *
     * @private
     * @returns {void}
     */
    _maybeSetAudioElementImpl() {
        if (this._ref && this._audioFileLoaded) {
            this.setAudioElementImpl(this._ref);
        }
    }

    /**
     * Called when 'canplaythrough' event is triggered on the audio element,
     * which means that the whole file has been loaded.
     *
     * @private
     * @returns {void}
     */
    _onCanPlayThrough() {
        this._audioFileLoaded = true;
        this._maybeSetAudioElementImpl();
    }

    /**
     * Sets the reference to the HTML audio element.
     *
     * @param {HTMLAudioElement} audioElement - The HTML audio element instance.
     * @private
     * @returns {void}
     */
    _setRef(audioElement?: HTMLAudioElement | null) {
        // For notification sounds, we don't use HTML audio elements
        if (this._isNotificationSound()) {
            return;
        }

        this._ref = audioElement;

        if (audioElement) {
            this._maybeSetAudioElementImpl();
        } else {
            // AbstractAudioElement is supposed to trigger "removeAudio" only if
            // it was previously added, so it's safe to just call it.
            this.setAudioElementImpl(null);

            // Reset the loaded flag, as the audio element is being removed from
            // the DOM tree.
            this._audioFileLoaded = false;
        }
    }

    /**
     * Implements React's {@link Component#componentDidMount()}.
     *
     * @inheritdoc
     * @returns {void}
     */
    override componentDidMount() {
        if (this._isNotificationSound() && typeof this.props.src === 'string') {
            // Use the source path as the base for the sound ID, but make it unique per component instance
            // This allows buffer sharing while avoiding registration conflicts
            const baseSoundId = this.props.src.replace(/[^a-zA-Z0-9]/g, '_');
            const uniqueSoundId = `${baseSoundId}_${Math.random().toString(36).substr(2, 9)}`;

            // Create WebAudioSound instance
            this._webAudioSound = new WebAudioSound(uniqueSoundId, this.props.src, Boolean(this.props.loop));

            // Call the setRef callback to register this audio element with Redux
            if (this.props.setRef) {
                this.props.setRef(this._webAudioSound);
            }
        }
    }

    /**
     * Implements React's {@link Component#componentWillUnmount()}.
     *
     * @inheritdoc
     * @returns {void}
     */
    override componentWillUnmount() {
        if (this._webAudioSound) {
            this._webAudioSound.dispose();
            this._webAudioSound = undefined;
        }
    }
}
