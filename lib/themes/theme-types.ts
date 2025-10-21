/**
 * Theme Type Definitions for Sentinel
 *
 * Defines all theme configuration interfaces and types
 */

export type ThemeName = 'terminal-green' | 'amber-mdt';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
  };
  background: {
    primary: string;
    secondary: string;
    tertiary: string;
    overlay: string;
  };
  border: {
    primary: string;
    secondary: string;
    focus: string;
  };
  status: {
    success: string;
    warning: string;
    error: string;
    info: string;
  };
}

export interface ThemeTypography {
  fontFamily: string;
  fontMono: string;
  sizes: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
  };
  weights: {
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
  };
  lineHeights: {
    tight: number;
    normal: number;
    relaxed: number;
  };
}

export interface ThemeBorders {
  radius: {
    none: string;
    sm: string;
    base: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    full: string;
  };
  widths: {
    thin: string;
    base: string;
    thick: string;
  };
}

export interface ThemeEffects {
  blur: {
    sm: string;
    base: string;
    lg: string;
  };
  shadows: {
    sm: string;
    base: string;
    lg: string;
    xl: string;
  };
  glows: {
    sm: string;
    base: string;
    lg: string;
  };
}

export interface ThemeAnimations {
  durations: {
    fast: string;
    base: string;
    slow: string;
  };
  easings: {
    linear: string;
    easeIn: string;
    easeOut: string;
    easeInOut: string;
  };
}

export interface ThemeConfig {
  id: ThemeName;
  name: string;
  colors: ThemeColors;
  typography: ThemeTypography;
  borders: ThemeBorders;
  effects: ThemeEffects;
  animations: ThemeAnimations;
}

export type ThemeRegistry = Record<ThemeName, ThemeConfig>;
