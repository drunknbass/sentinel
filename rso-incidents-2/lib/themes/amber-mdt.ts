/**
 * Amber MDT Theme Configuration
 *
 * Police Mobile Data Terminal (MDT) aesthetic with amber monochrome display.
 * Inspired by 1980s law enforcement terminal systems with CRT monitor effects.
 *
 * Design Principles:
 * - Pure amber (#ffb000) on pure black (#000000) for maximum contrast
 * - IBM Plex Mono for authentic terminal typography
 * - Square borders (0rem radius) for blocky, retro aesthetic
 * - CRT scanline and bloom effects for period-accurate display simulation
 * - ASCII art border support for terminal-style UI elements
 * - Red accent for critical/emergency alerts
 */

export interface ThemeConfig {
  /** Theme identification */
  id: string
  name: string
  description: string

  /** Color palette */
  colors: {
    /** Primary amber color for text and borders */
    primary: string
    /** Pure black background */
    background: string
    /** Muted amber for secondary text */
    muted: string
    /** Critical/emergency alert color (red) */
    critical: string
    /** Card/panel background (near-black) */
    cardBackground: string
    /** Border color (amber at 30% opacity) */
    border: string
    /** Input field background (dark with amber tint) */
    input: string
    /** Accent color for highlights */
    accent: string
  }

  /** Typography settings */
  typography: {
    /** Font family stack */
    fontFamily: string
    /** Monospace font (same as primary for terminal aesthetic) */
    fontMono: string
    /** Letter spacing for terminal effect */
    letterSpacing: string
    /** Text shadow for CRT glow */
    textShadow: string
  }

  /** Border and shape settings */
  borders: {
    /** Border radius (0 for sharp corners) */
    radius: string
    /** Standard border width */
    width: string
    /** Heavy border width (for emphasis) */
    widthHeavy: string
    /** Border style */
    style: string
  }

  /** Visual effects */
  effects: {
    /** Enable CRT scanline effect */
    scanlines: boolean
    /** Enable bloom/glow effect */
    bloom: boolean
    /** Enable blur (disabled for sharp terminal look) */
    blur: boolean
    /** Glow/shadow configuration */
    glow: {
      /** Standard amber glow */
      standard: string
      /** Critical red glow */
      critical: string
      /** Pulsing glow for alerts */
      pulse: string
    }
  }

  /** CSS class names for common patterns */
  classNames: {
    /** Button with terminal styling */
    button: string
    /** Primary action button */
    buttonPrimary: string
    /** Secondary/outline button */
    buttonSecondary: string
    /** Card/panel container */
    card: string
    /** Input field */
    input: string
    /** Heading text */
    heading: string
    /** Body text */
    text: string
    /** Muted/secondary text */
    textMuted: string
    /** ASCII border decoration */
    asciiBorder: string
    /** Blinking cursor/indicator */
    blink: string
  }
}

export const amberMDTTheme: ThemeConfig = {
  id: 'amber-mdt',
  name: 'Amber MDT',
  description: 'Police Mobile Data Terminal with amber CRT display aesthetic',

  colors: {
    primary: '#ffb000',
    background: '#000000',
    muted: 'rgba(255, 176, 0, 0.5)',
    critical: '#ff0066',
    cardBackground: 'rgba(0, 0, 0, 0.95)',
    border: 'rgba(255, 176, 0, 0.3)',
    input: 'rgba(255, 176, 0, 0.08)',
    accent: '#ffc933',
  },

  typography: {
    fontFamily: '"IBM Plex Mono", "Courier New", monospace',
    fontMono: '"IBM Plex Mono", "Courier New", monospace',
    letterSpacing: '0.05em',
    textShadow: '0 0 2px rgba(255, 176, 0, 0.8)',
  },

  borders: {
    radius: '0rem',
    width: '2px',
    widthHeavy: '4px',
    style: 'solid',
  },

  effects: {
    scanlines: true,
    bloom: true,
    blur: false,
    glow: {
      standard: '0 0 10px rgba(255, 176, 0, 0.3), inset 0 0 10px rgba(255, 176, 0, 0.1)',
      critical: '0 0 15px rgba(255, 0, 102, 0.3), 0 0 30px rgba(255, 0, 102, 0.15)',
      pulse: '0 0 4px rgba(255, 176, 0, 0.6)',
    },
  },

  classNames: {
    button: 'border-2 border-amber-500 px-3 py-1 font-mono text-xs font-bold tracking-wider transition-all',
    buttonPrimary: 'bg-amber-500 text-black hover:bg-amber-400 border-2 border-amber-500 px-6 py-3 font-mono font-bold tracking-wider transition-all',
    buttonSecondary: 'bg-black text-amber-500 hover:bg-amber-500 hover:text-black border-2 border-amber-500 px-3 py-1 font-mono text-xs font-bold tracking-wider transition-all',
    card: 'bg-black border-2 border-amber-500 p-6',
    input: 'bg-black border-2 border-amber-500 text-amber-500 font-mono px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500',
    heading: 'font-mono font-bold text-amber-500 tracking-wider',
    text: 'font-mono text-amber-500',
    textMuted: 'font-mono text-amber-500/70',
    asciiBorder: 'border-2 border-amber-500 relative',
    blink: 'animate-blink',
  },
}

/**
 * CSS Variables for theme integration
 * Can be applied to :root or a theme-specific wrapper
 */
export const amberMDTCSSVariables = {
  '--theme-primary': '#ffb000',
  '--theme-background': '#000000',
  '--theme-muted': 'rgba(255, 176, 0, 0.5)',
  '--theme-critical': '#ff0066',
  '--theme-card-bg': 'rgba(0, 0, 0, 0.95)',
  '--theme-border': 'rgba(255, 176, 0, 0.3)',
  '--theme-input': 'rgba(255, 176, 0, 0.08)',
  '--theme-accent': '#ffc933',
  '--theme-font-family': '"IBM Plex Mono", "Courier New", monospace',
  '--theme-letter-spacing': '0.05em',
  '--theme-text-shadow': '0 0 2px rgba(255, 176, 0, 0.8)',
  '--theme-border-radius': '0rem',
  '--theme-border-width': '2px',
  '--theme-border-width-heavy': '4px',
  '--theme-glow-standard': '0 0 10px rgba(255, 176, 0, 0.3), inset 0 0 10px rgba(255, 176, 0, 0.1)',
  '--theme-glow-critical': '0 0 15px rgba(255, 0, 102, 0.3), 0 0 30px rgba(255, 0, 102, 0.15)',
  '--theme-glow-pulse': '0 0 4px rgba(255, 176, 0, 0.6)',
}

/**
 * Utility function to apply theme CSS variables to an element
 */
export function applyThemeVariables(element: HTMLElement = document.documentElement): void {
  Object.entries(amberMDTCSSVariables).forEach(([key, value]) => {
    element.style.setProperty(key, value)
  })
}

/**
 * CSS keyframes for CRT scanline effect
 * Should be added to global styles
 */
export const scanlineKeyframes = `
@keyframes scanline {
  0% {
    transform: translateY(-100%);
  }
  100% {
    transform: translateY(100vh);
  }
}
`

/**
 * CSS classes for CRT effects
 * Can be injected into global styles or used via CSS modules
 */
export const crtEffectStyles = `
/* CRT Scanline overlay */
.crt-scanlines::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    transparent 0%,
    rgba(255, 176, 0, 0.03) 50%,
    transparent 100%
  );
  background-size: 100% 4px;
  pointer-events: none;
  z-index: 9999;
  animation: scanline 8s linear infinite;
}

/* CRT bloom effect for amber text */
.crt-bloom-amber {
  text-shadow: 0 0 2px #ffb000, 0 0 4px #ffb000;
  filter: brightness(1.05);
}

/* CRT bloom effect for red/critical text */
.crt-bloom-red {
  text-shadow: 0 0 2px #ff0066, 0 0 4px #ff0066;
  filter: brightness(1.05);
}

/* CRT glow effect for containers */
.crt-glow {
  box-shadow: 0 0 10px rgba(255, 176, 0, 0.3), inset 0 0 10px rgba(255, 176, 0, 0.1);
}

/* CRT glow effect for critical/red containers */
.crt-glow-red {
  box-shadow: 0 0 15px rgba(255, 0, 102, 0.3), 0 0 30px rgba(255, 0, 102, 0.15), inset 0 0 15px rgba(255, 0, 102, 0.08);
}

/* Terminal text glow */
.terminal-glow {
  text-shadow: 0 0 2px #ffb000;
  letter-spacing: 0.05em;
}

/* ASCII border decoration */
.ascii-border {
  border: 2px solid #ffb000;
  position: relative;
}

.ascii-border::before {
  content: '+';
  position: absolute;
  top: -2px;
  left: -2px;
  color: #ffb000;
  font-size: 12px;
  line-height: 1;
}

.ascii-border::after {
  content: '+';
  position: absolute;
  top: -2px;
  right: -2px;
  color: #ffb000;
  font-size: 12px;
  line-height: 1;
}

/* Blinking cursor/indicator */
@keyframes blink {
  0%, 49% {
    opacity: 1;
  }
  50%, 100% {
    opacity: 0;
  }
}

.animate-blink {
  animation: blink 1s step-end infinite;
}

/* Amber pulse animation */
@keyframes pulseAmber {
  0%, 100% {
    opacity: 1;
    box-shadow: 0 0 4px #ffb000;
  }
  50% {
    opacity: 0.6;
    box-shadow: 0 0 8px #ffb000;
  }
}

.animate-pulse-amber {
  animation: pulseAmber 2s ease-in-out infinite;
}
`

export default amberMDTTheme
