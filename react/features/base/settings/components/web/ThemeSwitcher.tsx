import React, { useCallback, useState } from 'react'; // 1. Import useCallback
import { useDispatch } from 'react-redux';

import { IStore } from '../../../../app/types';
import { loadAndApplyTheme } from '../../../components/themes/ThemeManager';
import Select from '../../../ui/components/web/Select';

const APP_ORIGIN = window.location.origin;

const THEMES = {
    default: { name: 'Jitsi Default', url: null },
    dark: { name: 'Dark', url: `${APP_ORIGIN}/meet/static/themes/dark-theme.json` },
    light: { name: 'Light', url: `${APP_ORIGIN}/meet/static/themes/light-theme.json` },
    midnightBlue: { name: 'Midnight Blue', url: `${APP_ORIGIN}/meet/static/themes/midnight-blue-theme.json` },
    solarizedLight: { name: 'Solarized Light', url: `${APP_ORIGIN}/meet/static/themes/solarized-light-theme.json` },
    forestCanopy: { name: 'Forest Canopy', url: `${APP_ORIGIN}/meet/static/themes/forest-canopy-theme.json` },
    charcoalLime: { name: 'Charcoal & Lime', url: `${APP_ORIGIN}/meet/static/themes/charcoal-lime-theme.json` },
    nebula: { name: 'Nebula', url: `${APP_ORIGIN}/meet/static/themes/nebula-theme.json` }
};

const themeOptions = Object.entries(THEMES).map(([ key, { name } ]) => {
    return {
        label: name,
        value: key
    };
});

const ThemeSwitcher = () => {
    const dispatch = useDispatch<IStore['dispatch']>();

    const [ selectedThemeKey, setSelectedThemeKey ] = useState(() => {
        const currentUrl = localStorage.getItem('user-selected-theme-url');

        return Object.keys(THEMES).find(key => THEMES[key as keyof typeof THEMES].url === currentUrl) || 'default';
    });

    const handleThemeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        const newKey = e.target.value;
        const themeUrl = THEMES[newKey as keyof typeof THEMES].url;

        setSelectedThemeKey(newKey);
        dispatch(loadAndApplyTheme(themeUrl));

        if (themeUrl) {
            localStorage.setItem('user-selected-theme-url', themeUrl);
        } else {
            localStorage.removeItem('user-selected-theme-url');
        }
    }, []);

    return (
        <div className = 'settings-sub-pane-element'>
            <Select
                id = 'theme-switcher'
                label = 'Theme'
                onChange = { handleThemeChange }
                options = { themeOptions }
                value = { selectedThemeKey } />
        </div>
    );
};

export default ThemeSwitcher;
