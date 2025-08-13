import { IStore } from '../../../app/types';
import { setDynamicBrandingData, setDynamicBrandingFailed } from '../../../dynamic-branding/actions.any';
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
        // If the URL is null, we are resetting to the default theme.
        // Dispatching with an empty object clears the custom theme.
        if (!themeUrl) {
            dispatch(setDynamicBrandingData({}));
            console.info('Dynamic branding has been reset to default.');
            localStorage.removeItem('user-selected-theme-url'); // Also clear storage

            return;
        }

        try {
            // Directly fetch the JSON from the provided, absolute URL
            const brandingJSON = await doGetJSON(themeUrl);

            // Dispatch the action that tells Redux to update the theme object.
            // This is the action that JitsiThemeProvider listens for.
            dispatch(setDynamicBrandingData(brandingJSON));
            console.info(`Successfully applied dynamic branding from ${themeUrl}`);

            // Save the choice for persistence
            localStorage.setItem('user-selected-theme-url', themeUrl);

        } catch (err) {
            console.error('Failed to fetch or apply dynamic theme:', err);

            // In case of an error, dispatch the failure action.
            dispatch(setDynamicBrandingFailed());
        }
    };
}
