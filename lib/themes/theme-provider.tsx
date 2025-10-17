"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeName, ThemeConfig } from './theme-types';
import { terminalGreenTheme } from './terminal-green';
import { amberMDTTheme } from './amber-mdt';

interface ThemeContextType {
  theme: ThemeConfig;
  themeName: ThemeName;
  setTheme: (themeName: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const themes: Record<ThemeName, ThemeConfig> = {
  'terminal-green': terminalGreenTheme,
  'amber-mdt': amberMDTTheme,
};

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemeName;
}

export function ThemeProvider({ children, defaultTheme = 'terminal-green' }: ThemeProviderProps) {
  const [themeName, setThemeName] = useState<ThemeName>(defaultTheme);
  const [theme, setTheme] = useState<ThemeConfig>(themes[defaultTheme]);

  // Load theme from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sentinel-theme') as ThemeName | null;
      if (stored && themes[stored]) {
        setThemeName(stored);
        setTheme(themes[stored]);
      }
    }
  }, []);

  // Apply CSS variables when theme changes
  useEffect(() => {
    const root = document.documentElement;
    
    // Apply CSS custom properties
    root.style.setProperty('--theme-primary', theme.colors.primary);
    root.style.setProperty('--theme-secondary', theme.colors.secondary);
    root.style.setProperty('--theme-accent', theme.colors.accent);
    
    root.style.setProperty('--theme-text-primary', theme.colors.text.primary);
    root.style.setProperty('--theme-text-secondary', theme.colors.text.secondary);
    root.style.setProperty('--theme-text-tertiary', theme.colors.text.tertiary);
    root.style.setProperty('--theme-text-inverse', theme.colors.text.inverse);
    
    root.style.setProperty('--theme-bg-primary', theme.colors.background.primary);
    root.style.setProperty('--theme-bg-secondary', theme.colors.background.secondary);
    root.style.setProperty('--theme-bg-tertiary', theme.colors.background.tertiary);
    root.style.setProperty('--theme-bg-overlay', theme.colors.background.overlay);
    
    root.style.setProperty('--theme-border-primary', theme.colors.border.primary);
    root.style.setProperty('--theme-border-secondary', theme.colors.border.secondary);
    root.style.setProperty('--theme-border-focus', theme.colors.border.focus);
    
    root.style.setProperty('--theme-font-family', theme.typography.fontFamily);
    root.style.setProperty('--theme-font-mono', theme.typography.fontMono);
    
    root.style.setProperty('--theme-radius-base', theme.borders.radius.base);
    root.style.setProperty('--theme-radius-lg', theme.borders.radius.lg);
    root.style.setProperty('--theme-radius-xl', theme.borders.radius.xl);
    root.style.setProperty('--theme-radius-2xl', theme.borders.radius['2xl']);
    root.style.setProperty('--theme-radius-3xl', theme.borders.radius['3xl']);
    root.style.setProperty('--theme-radius-full', theme.borders.radius.full);
    
    root.style.setProperty('--theme-border-width', theme.borders.widths.base);
    root.style.setProperty('--theme-border-width-thick', theme.borders.widths.thick);
    
    root.style.setProperty('--theme-blur-base', theme.effects.blur.base);
    root.style.setProperty('--theme-blur-lg', theme.effects.blur.lg);
    
    root.style.setProperty('--theme-glow-base', theme.effects.glows.base);
    
    // Apply theme class to body
    document.body.className = `theme-${themeName}`;
    
    // Store in localStorage
    localStorage.setItem('sentinel-theme', themeName);
  }, [theme, themeName]);

  const handleSetTheme = (newThemeName: ThemeName) => {
    setThemeName(newThemeName);
    setTheme(themes[newThemeName]);
  };

  return (
    <ThemeContext.Provider value={{ theme, themeName, setTheme: handleSetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
