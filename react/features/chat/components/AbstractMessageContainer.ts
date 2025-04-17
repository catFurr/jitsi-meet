import { Component } from 'react';
import { ReactReduxContext } from 'react-redux';

import { isReactionsInChatEnabled } from '../functions';
import { IMessage } from '../types';

export interface IProps {
    messages: IMessage[];
}

export default class AbstractMessageContainer<P extends IProps, S> extends Component<P, S> {
    static contextType = ReactReduxContext;
    declare context: React.ContextType<typeof ReactReduxContext>;

    static defaultProps = {
        messages: [] as IMessage[]
    };

    _getMessagesGroupedBySender() {
        const messagesCount = this.props.messages.length;
        const groups: IMessage[][] = [];
        let currentGrouping: IMessage[] = [];
        let currentGroupParticipantId;

        const { store } = this.context;
        const state = store.getState();
        const reactionsInChatEnabled = isReactionsInChatEnabled(state);

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
