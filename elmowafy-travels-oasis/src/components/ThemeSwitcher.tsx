import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

type ThemeSwitcherProps = {
  className?: string;
  showText?: boolean;
  iconSize?: 'sm' | 'md' | 'lg';
  variant?: 'minimal' | 'button' | 'dropdown';
};

const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  className = '',
  showText = true,
  iconSize = 'md',
  variant = 'button',
}) => {
  const { theme, setTheme, isDark } = useTheme();
  const { t, isRTL } = useLanguage();

  const getIconSizeClass = () => {
    switch (iconSize) {
      case 'sm': return 'w-4 h-4';
      case 'lg': return 'w-6 h-6';
      case 'md':
      default: return 'w-5 h-5';
    }
  };

  const getButtonClass = () => {
    const baseClass = 'flex items-center transition-colors duration-200';
    
    switch (variant) {
      case 'minimal':
        return `${baseClass} p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700`;
      case 'dropdown':
        return `${baseClass} w-full px-2 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700`;
      case 'button':
      default:
        return `${baseClass} px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700`;
    }
  };

  const handleThemeChange = () => {
    // Cycle through themes: light -> dark -> system -> light
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const renderIcon = () => {
    if (theme === 'system') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={getIconSizeClass()} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    }
    
    if (isDark) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={getIconSizeClass()} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      );
    }
    
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className={getIconSizeClass()} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    );
  };

  const getThemeText = () => {
    if (theme === 'system') return t('settings.theme.system');
    if (isDark) return t('settings.theme.dark');
    return t('settings.theme.light');
  };

  return (
    <button
      onClick={handleThemeChange}
      className={`${getButtonClass()} ${className}`}
      aria-label={t('settings.theme.toggle')}
      title={t('settings.theme.toggle')}
    >
      {renderIcon()}
      {showText && (
        <span className={`${isRTL ? 'mr-2' : 'ml-2'} ${variant === 'minimal' ? 'sr-only' : ''}`}>
          {getThemeText()}
        </span>
      )}
    </button>
  );
};

export default ThemeSwitcher;