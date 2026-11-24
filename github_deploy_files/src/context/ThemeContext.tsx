import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'student_portal_theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Check saved local storage first
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    const doc = typeof document !== 'undefined' ? (document as Document) : null;

    if (!doc) {
      setThemeState(next);
      return;
    }

    // 1. If View Transitions API is supported, use seamless native crossfade
    const anyDoc = doc as unknown as { startViewTransition?: (cb: () => void) => void };
    if (typeof anyDoc.startViewTransition === 'function') {
      anyDoc.startViewTransition(() => {
        setThemeState(next);
      });
      return;
    }

    // 2. Fallback: Add theme-transitioning class to animate CSS properties smoothly
    doc.documentElement.classList.add('theme-transitioning');
    setTimeout(() => {
      doc.documentElement.classList.remove('theme-transitioning');
    }, 500);
    setThemeState(next);
  };

  const setTheme = (newTheme: Theme) => {
    const doc = typeof document !== 'undefined' ? (document as Document) : null;
    const anyDoc = doc as unknown as { startViewTransition?: (cb: () => void) => void };
    if (anyDoc && typeof anyDoc.startViewTransition === 'function') {
      anyDoc.startViewTransition(() => {
        setThemeState(newTheme);
      });
      return;
    }
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
