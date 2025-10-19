"use client"

import { useTheme } from '@/lib/themes/theme-provider';
import { Monitor, Palette } from 'lucide-react';

export default function ThemeSwitcher() {
  const { themeName, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(themeName === 'terminal-green' ? 'amber-mdt' : 'terminal-green');
  };

  return (
    <button
      onClick={toggleTheme}
      className="relative flex items-center gap-2 bg-black/80 backdrop-blur-2xl terminal-border rounded-lg px-4 py-2 shadow-lg transition-all hover:scale-105 cursor-pointer"
      title={`Switch to ${themeName === 'terminal-green' ? 'Amber MDT' : 'Terminal Green'} theme`}
    >
      <div className="terminal-scanlines" />
      {themeName === 'terminal-green' ? (
        <Monitor className="w-4 h-4 text-green-400" />
      ) : (
        <Palette className="w-4 h-4 text-amber-500" />
      )}
      <span className="text-xs font-mono tracking-wider whitespace-nowrap terminal-text">
        {themeName === 'terminal-green' ? 'TRM' : 'MDT'}
      </span>
    </button>
  );
}
