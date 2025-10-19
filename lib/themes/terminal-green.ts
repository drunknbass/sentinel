import { ThemeConfig } from './theme-types';

/**
 * Terminal Green Theme
 *
 * Modern terminal aesthetic with green/cyan accents, rounded borders,
 * and glass morphism effects. This is the current default theme.
 */
export const terminalGreenTheme: ThemeConfig = {
  id: 'terminal-green',
  name: 'Terminal Green',

  colors: {
    primary: '#22c55e',        // green-400
    secondary: '#16a34a',      // green-600
    accent: '#22d3ee',         // cyan-400

    text: {
      primary: '#22c55e',      // green-400
      secondary: '#22d3ee',    // cyan-400
      tertiary: '#9ca3af',     // gray-400
      inverse: '#000000',      // black
    },

    background: {
      primary: '#000000',      // pure black
      secondary: '#0a0e14',    // dark blue-black
      tertiary: '#0f1419',     // dark slate
      overlay: 'rgba(0, 0, 0, 0.6)',
    },

    border: {
      primary: 'rgba(34, 197, 94, 0.3)',   // green with 30% opacity
      secondary: 'rgba(34, 211, 238, 0.3)', // cyan with 30% opacity
      focus: 'rgba(34, 197, 94, 0.5)',      // green with 50% opacity
    },

    status: {
      success: '#22c55e',      // green-400
      warning: '#eab308',      // yellow-500
      error: '#ef4444',        // red-500
      info: '#22d3ee',         // cyan-400
    },
  },

  typography: {
    fontFamily: "'BBH Sans Bogle', 'Space Grotesk', ui-sans-serif, system-ui",
    fontMono: "'BBH Sans Bogle', 'Space Grotesk', ui-monospace, monospace",

    sizes: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem', // 36px
    },

    weights: {
      normal: 400,
      medium: 400,     // BBH Sans Bogle only has 400
      semibold: 400,
      bold: 400,
    },

    lineHeights: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },

  borders: {
    radius: {
      none: '0',
      sm: '0.125rem',   // 2px
      base: '0.5rem',   // 8px
      md: '0.375rem',   // 6px
      lg: '0.5rem',     // 8px
      xl: '0.75rem',    // 12px
      '2xl': '1rem',    // 16px
      '3xl': '1.5rem',  // 24px
      full: '9999px',
    },

    widths: {
      thin: '1px',
      base: '1px',
      thick: '1px',
    },
  },

  effects: {
    blur: {
      sm: '8px',
      base: '16px',
      lg: '40px',
    },

    shadows: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      base: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    },

    glows: {
      sm: '0 0 8px rgba(34, 197, 94, 0.5)',
      base: '0 0 10px rgba(34, 197, 94, 0.2), inset 0 0 10px rgba(34, 197, 94, 0.05)',
      lg: '0 0 12px rgba(34, 197, 94, 0.6), 0 0 20px rgba(34, 197, 94, 0.4)',
    },
  },

  animations: {
    durations: {
      fast: '0.15s',
      base: '0.3s',
      slow: '0.5s',
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
 * Utility class names for Terminal Green theme
 */
export const terminalClasses = {
  border: {
    primary: 'border border-green-400/30 shadow-[0_0_10px_rgba(34,197,94,0.2),inset_0_0_10px_rgba(34,197,94,0.05)]',
    cyan: 'border border-cyan-400/30 shadow-[0_0_10px_rgba(34,211,238,0.2),inset_0_0_10px_rgba(34,211,238,0.05)]',
    base: 'terminal-border',
  },

  text: {
    primary: 'text-green-400 terminal-text',
    cyan: 'text-cyan-400 terminal-text-cyan',
    secondary: 'text-gray-400',
    inverse: 'text-black',
  },

  background: {
    primary: 'bg-black',
    secondary: 'bg-[#0a0e14]',
    overlay: 'bg-black/80 backdrop-blur-2xl',
    scanlines: 'terminal-scanlines',
  },

  components: {
    hudBadge: 'bg-black/80 backdrop-blur-2xl terminal-border rounded-lg px-4 py-2 shadow-lg',
    panel: 'bg-black/80 backdrop-blur-xl terminal-border rounded-lg shadow-2xl',
    button: 'terminal-border rounded-lg hover:bg-green-500/10 transition-all',
    input: 'bg-black/50 terminal-border rounded text-green-400',
    navbar: 'bg-black/90 backdrop-blur-xl border-b terminal-border',
  },
};
