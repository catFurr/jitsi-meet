import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { makeStyles } from 'tss-react/mui';

import { IStore } from '../../../../app/types';
import { loadAndApplyTheme } from '../../../components/themes/ThemeManager';
import Select from '../../../ui/components/web/Select';

const THEMES_PATH = '/meet/static/themes';

const useStyles = makeStyles()(theme => {
    return {
        container: {
            marginTop: theme.spacing(2)
        }
    };
});

interface ITheme {
    file: string | null;
    key: string;
    name: string;
    url: string | null;
}

const ThemeSwitcher = () => {
    const dispatch = useDispatch<IStore['dispatch']>();

    const { classes, cx } = useStyles();

    const [ availableThemes, setAvailableThemes ] = useState<ITheme[]>([]);
    const [ selectedThemeKey, setSelectedThemeKey ] = useState('default');

    useEffect(() => {
        const fetchThemes = async () => {
            try {
                const response = await fetch(`${THEMES_PATH}/themes.json`);

                if (!response.ok) {
                    throw new Error('Themes manifest not found');
                }
                const manifest = await response.json();

                const allThemes: ITheme[] = [
                    { name: 'Jitsi Default', file: null, key: 'default', url: null },
                    ...manifest.map((theme: { file: string; name: string; }) => {
                        const key = theme.file.replace('-theme.json', '');

                        return {
                            ...theme,
                            key,
                            url: `${THEMES_PATH}/${theme.file}`
                        };
                    })
                ];

                setAvailableThemes(allThemes);

                const currentUrl = localStorage.getItem('user-selected-theme-url');
                const foundTheme = allThemes.find(theme => theme.url === currentUrl);

                if (foundTheme) {
                    setSelectedThemeKey(foundTheme.key);
                }
            } catch (error) {
                console.error('Failed to load dynamic themes manifest:', error);
                setAvailableThemes([ { name: 'Jitsi Default', file: null, key: 'default', url: null } ]);
            }
        };

        fetchThemes();
    }, []);

    const handleThemeChange = useCallback(
        (e: React.ChangeEvent<HTMLSelectElement>) => {
            const newKey = e.target.value;
            const theme = availableThemes.find(t => t.key === newKey);

            if (!theme) {
                return;
            }

            setSelectedThemeKey(newKey);
            dispatch(loadAndApplyTheme(theme.url));

            if (theme.url) {
                localStorage.setItem('user-selected-theme-url', theme.url);
            } else {
                localStorage.removeItem('user-selected-theme-url');
            }
        },
        [ availableThemes, dispatch ]
    );

    const themeOptions = availableThemes.map(theme => {
        return {
            label: theme.name,
            value: theme.key
        };
    });

    return (
        <div className = { cx('settings-sub-pane-element', classes.container) }>
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
