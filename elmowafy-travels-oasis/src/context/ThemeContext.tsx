import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useLanguage } from './LanguageContext';
import { localStorage, addBodyClass, removeBodyClass } from '../utils/browser';

type Theme = 'light' | 'dark' | 'system';
type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Get the stored theme from localStorage or default to 'system'
  const getInitialTheme = (): Theme => {
    const storedTheme = localStorage?.getItem('theme') as Theme;
    return (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system') 
      ? storedTheme 
      : 'system';
  };

  const [theme, setThemeState] = useState<Theme>(getInitialTheme());
  const [isDark, setIsDark] = useState<boolean>(false);
  const { isRTL } = useLanguage();

  // Function to determine if the theme should be dark based on system preference
  const getSystemTheme = (): boolean => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  };

  // Update isDark state based on theme
  useEffect(() => {
    if (theme === 'system') {
      setIsDark(getSystemTheme());
    } else {
      setIsDark(theme === 'dark');
    }
  }, [theme]);

  // Listen for system theme changes if theme is set to 'system'
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => setIsDark(e.matches);
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Apply theme and RTL classes to body
  useEffect(() => {
    // Remove existing theme classes
    removeBodyClass('light-theme');
    removeBodyClass('dark-theme');
    
    // Add current theme class
    addBodyClass(isDark ? 'dark-theme' : 'light-theme');
    
    // Handle RTL class
    if (isRTL) {
      addBodyClass('rtl');
    } else {
      removeBodyClass('rtl');
    }
  }, [isDark, isRTL]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage?.setItem('theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};