
import React from 'react';
import { useLanguage } from '@/context/LanguageContext';

const Footer = () => {
  const { language } = useLanguage();
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className={`bg-primary text-white py-8 ${language === 'ar' ? 'rtl-text' : 'ltr-text'}`}>
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-6 md:mb-0">
            <h2 className="font-playfair text-2xl font-bold">
              {language === 'en' ? 'Elmowafy Travels' : 'رحلات الموافي'}
            </h2>
            <p className="mt-2 text-white/80">
              {language === 'en' 
                ? 'Creating memories around the world' 
                : 'نصنع الذكريات حول العالم'}
            </p>
          </div>
          
          <div className="text-sm text-white/80">
            &copy; {currentYear} Elmowafy Travels. {language === 'en' ? 'All Rights Reserved.' : 'جميع الحقوق محفوظة.'}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
