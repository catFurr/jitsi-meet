import React from 'react';

import { loadAndApplyTheme } from '../../base/components/themes/ThemeManager';
import GlobalStyles from '../../base/ui/components/GlobalStyles.web';
import JitsiThemeProvider from '../../base/ui/components/JitsiThemeProvider.web';
import DialogContainer from '../../base/ui/components/web/DialogContainer';
import ChromeExtensionBanner from '../../chrome-extension-banner/components/ChromeExtensionBanner.web';
import OverlayContainer from '../../overlay/components/web/OverlayContainer';

import { AbstractApp } from './AbstractApp';

// Register middlewares and reducers.
import '../middlewares';
import '../reducers';


/**
 * Root app {@code Component} on Web/React.
 *
 * @augments AbstractApp
 */
export class App extends AbstractApp {

    /**
     * This method is called when the component mounts. We use it to apply a
     * user's saved theme from their last session.
     *
     * @inheritdoc
     */
    override async componentDidMount() {
        await super.componentDidMount();

        const savedThemeUrl = localStorage.getItem('user-selected-theme-url');

        // If a saved URL is found, dispatch our thunk to load the theme.
        if (savedThemeUrl) {
            // @ts-ignore - This is acceptable here as dispatch can handle thunks.
            APP.store.dispatch(loadAndApplyTheme(savedThemeUrl));
        }
    }

    /**
     * Creates an extra {@link ReactElement}s to be added (unconditionally)
     * alongside the main element.
     *
     * @abstract
     * @protected
     * @returns {ReactElement}
     */
    override _createExtraElement() {
        return (
            <JitsiThemeProvider>
                <OverlayContainer />
            </JitsiThemeProvider>
        );
    }

    /**
     * Overrides the parent method to inject {@link JitsiThemeProvider} as
     * the top most component.
     *
     * @override
     */
    override _createMainElement(component: React.ComponentType, props?: Object) {
        return (
            <JitsiThemeProvider>
                <GlobalStyles />
                <ChromeExtensionBanner />
                { super._createMainElement(component, props) }
            </JitsiThemeProvider>
        );
    }

    /**
     * Renders the platform specific dialog container.
     *
     * @returns {React$Element}
     */
    override _renderDialogContainer() {
        return (
            <JitsiThemeProvider>
                <DialogContainer />
            </JitsiThemeProvider>
        );
    }
}
