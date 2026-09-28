import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      id="theme-toggle-btn"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className={`p-2.5 rounded-lg border transition-all duration-200 
        bg-white/90 dark:bg-[#121216]/90 hover:bg-slate-100 dark:hover:bg-[#1A1A22] 
        border-slate-200 dark:border-[#26262E] text-slate-700 dark:text-slate-200 
        shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8048A8]/60 ${className}`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 text-[#F8D299] transition-transform duration-200 hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 text-[#8048A8] transition-transform duration-200 hover:-rotate-12" />
      )}
    </button>
  );
};
