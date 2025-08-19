import { IStore } from '../app/types';
import { APP_WILL_MOUNT } from '../base/app/actionTypes';
import { loadAndApplyTheme } from '../base/components/themes/ThemeManager';
import MiddlewareRegistry from '../base/redux/MiddlewareRegistry';

import { SET_DYNAMIC_BRANDING_DATA, SET_SELECTED_THEME_URL } from './actionTypes';
import { fetchCustomBrandingData } from './actions.any';
import { createMuiBrandingTheme } from './functions.web';

import './middleware.any';

MiddlewareRegistry.register((store: IStore) => next => action => {
    if (action.type === SET_DYNAMIC_BRANDING_DATA) {
        const { customTheme } = action.value;

        if (customTheme) {
            const muiBrandedTheme = createMuiBrandingTheme(customTheme);

            action.value = {
                ...action.value,
                ...customTheme,
                muiBrandedTheme
            };
        }
    }

    const result = next(action);

    switch (action.type) {
    case APP_WILL_MOUNT: {
        const { selectedThemeUrl } = store.getState()['features/dynamic-branding'];

        if (selectedThemeUrl) {
            store.dispatch(loadAndApplyTheme(selectedThemeUrl));
        } else {
            store.dispatch(fetchCustomBrandingData());
        }
        break;
    }

    case SET_SELECTED_THEME_URL: {
        const { url } = action;

        if (url) {
            localStorage.setItem('user-selected-theme-url', url);
        } else {
            localStorage.removeItem('user-selected-theme-url');
        }

        store.dispatch(loadAndApplyTheme(url));
        break;
    }
    }

    return result;
});
