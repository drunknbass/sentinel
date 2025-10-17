import { ThemeConfig } from './theme-types';

/**
 * Amber MDT Theme
 *
 * Retro police terminal aesthetic with amber monochrome display,
 * ASCII borders, CRT effects, and sharp square edges.
 * Inspired by 1980s-90s Mobile Data Terminals.
 */
export const amberMDTTheme: ThemeConfig = {
  id: 'amber-mdt',
  name: 'Amber MDT',

  colors: {
    primary: '#ffb000',        // amber-500
    secondary: '#9b870c',      // dark amber
    accent: '#ffc933',         // light amber

    text: {
      primary: '#ffb000',      // amber
      secondary: '#ffb000',    // amber (monochrome)
      tertiary: 'rgba(255, 176, 0, 0.7)',  // muted amber
      inverse: '#000000',      // black
    },

    background: {
      primary: '#000000',      // pure black
      secondary: '#000000',    // pure black (no variation)
      tertiary: '#000000',     // pure black
      overlay: 'rgba(0, 0, 0, 0.95)',
    },

    border: {
      primary: '#ffb000',      // solid amber
      secondary: 'rgba(255, 176, 0, 0.5)',  // 50% amber
      focus: '#ffc933',        // light amber
    },

    status: {
      success: '#ffb000',      // amber (monochrome)
      warning: '#ffc933',      // light amber
      error: '#ff0066',        // red for critical
      info: '#ffb000',         // amber
    },
  },

  typography: {
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontMono: "'IBM Plex Mono', 'Courier New', monospace",

    sizes: {
      xs: '0.625rem',   // 10px - smaller for terminal
      sm: '0.75rem',    // 12px
      base: '0.875rem', // 14px
      lg: '1rem',       // 16px
      xl: '1.125rem',   // 18px
      '2xl': '1.25rem', // 20px
      '3xl': '1.5rem',  // 24px
      '4xl': '2rem',    // 32px
    },

    weights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },

    lineHeights: {
      tight: 1.2,
      normal: 1.4,
      relaxed: 1.6,
    },
  },

  borders: {
    radius: {
      none: '0',
      sm: '0',
      base: '0',
      md: '0',
      lg: '0',
      xl: '0',
      '2xl': '0',
      '3xl': '0',
      full: '0',
    },

    widths: {
      thin: '1px',
      base: '2px',
      thick: '4px',
    },
  },

  effects: {
    blur: {
      sm: '0',
      base: '0',
      lg: '0',
    },

    shadows: {
      sm: 'none',
      base: 'none',
      lg: 'none',
      xl: 'none',
    },

    glows: {
      sm: '0 0 2px #ffb000',
      base: '0 0 10px rgba(255, 176, 0, 0.3), inset 0 0 10px rgba(255, 176, 0, 0.1)',
      lg: '0 0 15px rgba(255, 176, 0, 0.5), 0 0 30px rgba(255, 176, 0, 0.3)',
    },
  },

  animations: {
    durations: {
      fast: '0.2s',
      base: '0.4s',
      slow: '0.6s',
    },

    easings: {
      linear: 'linear',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
};

/**
 * Utility class names for Amber MDT theme
 */
export const amberClasses = {
  border: {
    primary: 'border-2 border-amber-500',
    heavy: 'border-4 border-amber-500',
    base: 'border-2 border-amber-500',
  },

  text: {
    primary: 'text-amber-500 font-mono tracking-wider',
    secondary: 'text-amber-400 font-mono',
    muted: 'text-amber-500/70 font-mono',
    inverse: 'text-black',
    bold: 'text-amber-500 font-mono font-bold tracking-wider',
  },

  background: {
    primary: 'bg-black',
    secondary: 'bg-black',
    overlay: 'bg-black/80',
    scanlines: 'relative after:absolute after:inset-0 after:bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,176,0,0.03)_2px,rgba(255,176,0,0.03)_4px)] after:pointer-events-none',
  },

  components: {
    hudBadge: 'bg-black border-2 border-amber-500 px-4 py-2',
    panel: 'bg-black border-4 border-amber-500',
    button: 'border-2 border-amber-500 bg-black hover:bg-amber-500 hover:text-black transition-all font-mono font-bold tracking-wider',
    buttonPrimary: 'bg-amber-500 text-black border-4 border-amber-600 font-mono font-bold tracking-widest hover:bg-amber-400 transition-all',
    input: 'bg-black border-2 border-amber-500 text-amber-500 font-mono placeholder:text-amber-500/50 tracking-wide',
    navbar: 'bg-black border-b-2 border-amber-500',
  },

  effects: {
    crtGlow: 'shadow-[0_0_10px_rgba(255,176,0,0.3),inset_0_0_10px_rgba(255,176,0,0.1)]',
    textGlow: 'text-shadow-[0_0_2px_rgba(255,176,0,0.8)]',
    bloom: '[text-shadow:0_0_2px_#ffb000,0_0_4px_#ffb000]',
  },
};

/**
 * ASCII art utility for MDT theme
 */
export const asciiArt = {
  corners: {
    topLeft: '╔',
    topRight: '╗',
    bottomLeft: '╚',
    bottomRight: '╝',
  },
  borders: {
    horizontal: '═',
    vertical: '║',
  },
  decorations: {
    arrow: '&gt;',
    bracket: {
      open: '[',
      close: ']',
    },
  },
};
