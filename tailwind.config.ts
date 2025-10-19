import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['BBH Sans Bogle', 'Space Grotesk', 'ui-sans-serif', 'system-ui'],
        mono: ['BBH Sans Bogle', 'Space Grotesk', 'ui-monospace', 'monospace'],
      }
    }
  },
  plugins: []
};

export default config;
