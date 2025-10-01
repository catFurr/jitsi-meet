import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { IReduxState } from '../app/types';

import { toggleWebPip } from './actions';

/**
 * A custom hook that handles the logic for automatically entering Picture-in-Picture
 * when the page becomes hidden.
 */
export function useAutomaticWebPip() {
    const dispatch = useDispatch();
    const { inPip } = useSelector((state: IReduxState) => state['features/picture-in-picture-web']);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && !inPip) {
                dispatch(toggleWebPip());
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [ dispatch, inPip ]);
}
