import React, { createContext, useContext, useState, ReactNode } from 'react';

// Simple translation function type
type TranslationFunction = (key: string, values?: Record<string, any>) => string;

interface LanguageContextType {
  language: 'en' | 'ar';
  setLanguage: (lang: 'en' | 'ar') => void;
  toggleLanguage: () => void;
  t: TranslationFunction; // Add translation function
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<'en' | 'ar'>('en');

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'ar' : 'en');
  };

  // Simple translation function
  const t: TranslationFunction = (key, values) => {
    // In a real app, you would load these from translation files
    const translations: Record<string, Record<string, string>> = {
      // Add your translations here
      // Example:
      // 'challenge.title': {
      //   en: 'Challenge Title',
      //   ar: 'عنوان التحدي'
      // }
    };

    const translation = translations[key]?.[language] || key;
    
    // Simple variable replacement
    if (values) {
      return Object.entries(values).reduce(
        (result, [k, v]) => result.replace(`{{${k}}}`, String(v)),
        translation
      );
    }
    
    return translation;
  };

  const value = {
    language,
    setLanguage,
    toggleLanguage,
    t, // Add translation function to context value
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};