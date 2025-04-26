import { Component } from 'react';
import { ReactReduxContext } from 'react-redux';

import { IMessage } from '../types';
import { getFeatureFlag } from '../../base/flags/functions';
import { REACTIONS_IN_CHAT_ENABLED } from '../../base/flags/constants';

export interface IProps {

    /**
     * The messages array to render.
     */
    messages: IMessage[];
}

/**
 * Abstract component to display a list of chat messages, grouped by sender.
 *
 * @augments PureComponent
 */
export default class AbstractMessageContainer<P extends IProps, S> extends Component<P, S> {
    static contextType = ReactReduxContext;
    declare context: React.ContextType<typeof ReactReduxContext>;

    static defaultProps = {
        messages: [] as IMessage[]
    };

    /**
     * Iterates over all the messages and creates nested arrays which hold
     * consecutive messages sent by the same participant.
     *
     * @private
     * @returns {Array<Array<Object>>}
     */
    _getMessagesGroupedBySender() {
        const messagesCount = this.props.messages.length;
        const groups: IMessage[][] = [];
        let currentGrouping: IMessage[] = [];
        let currentGroupParticipantId;

        const { store } = this.context;
        const state = store.getState();
        const reactionsInChatEnabled = getFeatureFlag(state, REACTIONS_IN_CHAT_ENABLED, true)

        for (let i = 0; i < messagesCount; i++) {
            const message = this.props.messages[i];

            if (message.isReaction && !reactionsInChatEnabled) {
                continue;
            }

            if (message.participantId === currentGroupParticipantId) {
                currentGrouping.push(message);
            } else {
                currentGrouping.length && groups.push(currentGrouping);

                currentGrouping = [ message ];
                currentGroupParticipantId = message.participantId;
            }
        }

        currentGrouping.length && groups.push(currentGrouping);

        return groups;
    }
}
