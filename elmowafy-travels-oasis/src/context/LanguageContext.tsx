import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  en: {
    'dashboard': 'Dashboard',
    'memories': 'Memories',
    'travel': 'Travel Guide',
    'activities': 'Activities',
    'gaming': 'Gaming',
    'settings': 'Settings',
    'welcome': 'Welcome to Elmowafy Travels Oasis',
    'upload_memory': 'Upload Memory',
    'create_game': 'Create Game',
    'join_game': 'Join Game',
    'start_game': 'Start Game',
    'copy_code': 'Copy Code',
    'system_health': 'System Health',
    'healthy': 'Healthy',
    'unhealthy': 'Unhealthy',
    'checking': 'Checking...',
    'frontend': 'Frontend',
    'backend': 'Backend API',
    'database': 'Database',
    'last_checked': 'Last checked',
    'overall_status': 'Overall status',
    'all_systems_operational': 'All Systems Operational',
    'issues_detected': 'Issues Detected',
    // Budget related translations
    'family_budget': 'Family Budget',
    'manage_budget': 'Manage Budget',
    'budget_dashboard': 'Family Budget Dashboard',
    'total_budget': 'Total Budget',
    'total_spent': 'Total Spent',
    'remaining': 'Remaining',
    'budget_health': 'Budget Health',
    'budget_envelopes': 'Budget Envelopes',
    'add_envelope': 'Add Envelope',
    'spent': 'Spent',
    'budget': 'Budget',
    'used': 'used',
    'left': 'left',
    'monthly_trends': 'Monthly Trends',
    'income': 'Income',
    'expenses': 'Expenses',
    'ai_budget_insights': 'AI Budget Insights',
    'retry': 'Retry'
  },
  ar: {
    'dashboard': 'لوحة التحكم',
    'memories': 'الذكريات',
    'travel': 'دليل السفر',
    'activities': 'الأنشطة',
    'gaming': 'الألعاب',
    'settings': 'الإعدادات',
    'welcome': 'مرحباً بك في واحة السفر العائلة',
    'upload_memory': 'رفع ذكرى',
    'create_game': 'إنشاء لعبة',
    'join_game': 'انضم للعبة',
    'start_game': 'ابدأ اللعبة',
    'copy_code': 'نسخ الكود',
    'system_health': 'صحة النظام',
    'healthy': 'صحي',
    'unhealthy': 'غير صحي',
    'checking': 'جاري الفحص...',
    'frontend': 'الواجهة الأمامية',
    'backend': 'واجهة برمجة التطبيقات الخلفية',
    'database': 'قاعدة البيانات',
    'last_checked': 'آخر فحص',
    'overall_status': 'الحالة العامة',
    'all_systems_operational': 'جميع الأنظمة تعمل',
    'issues_detected': 'تم اكتشاف مشاكل',
    // Budget related translations
    'family_budget': 'ميزانية العائلة',
    'manage_budget': 'إدارة الميزانية',
    'budget_dashboard': 'لوحة ميزانية العائلة',
    'total_budget': 'إجمالي الميزانية',
    'total_spent': 'إجمالي المصروفات',
    'remaining': 'المتبقي',
    'budget_health': 'صحة الميزانية',
    'budget_envelopes': 'مظاريف الميزانية',
    'add_envelope': 'إضافة مظروف',
    'spent': 'تم صرفه',
    'budget': 'الميزانية',
    'used': 'مستخدم',
    'left': 'متبقي',
    'monthly_trends': 'الاتجاهات الشهرية',
    'income': 'الدخل',
    'expenses': 'المصروفات',
    'ai_budget_insights': 'رؤى الميزانية بالذكاء الاصطناعي',
    'retry': 'إعادة المحاولة'
  }
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'ar' : 'en');
  };

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations[typeof language]] || key;
  };

  const isRTL = language === 'ar';

  return (
    <LanguageContext.Provider value={{
      language,
      setLanguage,
      toggleLanguage,
      t,
      isRTL
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
