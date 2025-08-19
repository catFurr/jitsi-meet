import { IStore } from '../../../app/types';
import { setDynamicBrandingData, setDynamicBrandingFailed, setSelectedThemeUrl } from '../../../dynamic-branding/actions.any';
import { doGetJSON } from '../../util/httpUtils';

/**
 * Fetches theme data from a URL and dispatches an action to apply it live.
 * This bypasses the run-once logic of fetchCustomBrandingData.
 *
 * @param {string | null} themeUrl - The URL of the new theme JSON. If null, branding will be reset.
 * @returns {Function} - A Redux thunk.
 */
export function loadAndApplyTheme(themeUrl: string | null) {
    return async (dispatch: IStore['dispatch']) => {
        if (!themeUrl) {
            dispatch(setDynamicBrandingData({}));
            console.info('Dynamic branding has been reset to default.');
            localStorage.removeItem('user-selected-theme-url');

            return;
        }

        try {
            const brandingJSON = await doGetJSON(themeUrl);

            dispatch(setDynamicBrandingData(brandingJSON));
            console.info(`Successfully applied dynamic branding from ${themeUrl}`);
            localStorage.setItem('user-selected-theme-url', themeUrl);

        } catch (err) {
            console.error('Failed to fetch or apply dynamic theme:', err);
            dispatch(setDynamicBrandingFailed());
        }
    };
}

/**
 * Action dispatched by the UI to signal the user's intent to change the theme.
 * This is the function you asked for.
 *
 * @param {string | null} themeUrl - The new theme URL to set.
 * @returns {Function}
 */
export function changeTheme(themeUrl: string | null) {
    return setSelectedThemeUrl(themeUrl);
}
