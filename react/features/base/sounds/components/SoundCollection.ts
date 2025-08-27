import { Component } from 'react';

/**
 * This component is now a placeholder. With the Howler.js integration,
 * sound playback is handled entirely by the middleware, and we no longer need
 * to render HTML <audio> elements. Returning null ensures that this component
 * does nothing and has no impact on the application.
 */
class SoundCollection extends Component {
    /**
     * Implements React's {@link Component#render()}.
     *
     * @inheritdoc
     * @returns {null}
     */
    override render() {
        return null;
    }
}

export default SoundCollection;
