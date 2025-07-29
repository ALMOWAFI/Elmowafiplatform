
import React from 'react';
import Navbar from '@/components/Navbar';
import TravelPlanner from '@/components/TravelPlanner';
import Footer from '@/components/Footer';
import { useLanguage } from '@/context/LanguageContext';

const PlannerPage = () => {
  const { language, t } = useLanguage();
  
  return (
    <div className={`min-h-screen flex flex-col ${language === 'ar' ? 'rtl-text' : 'ltr-text'}`}>
      <Navbar />
      <main className="flex-grow">
        <div className="container mx-auto py-16 px-6">
          <h1 className="text-4xl font-bold text-center mb-12">
            {t('planner.title')}
          </h1>
          
          <div className="max-w-2xl mx-auto">
            <TravelPlanner />
          </div>
          
          <div className="mt-16 text-center">
            <h2 className="text-2xl font-bold mb-4">
              {language === 'en' 
                ? 'Need Inspiration?' 
                : 'تحتاج إلى إلهام؟'}
            </h2>
            <p className="mb-8">
              {language === 'en'
                ? "Browse through our family's previous adventures to spark ideas for your next journey."
                : "تصفح مغامرات عائلتنا السابقة للحصول على أفكار لرحلتك القادمة."}
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {['Paris', 'Tokyo', 'Cairo', 'Dubai', 'New York', 'Istanbul'].map((city, index) => (
                <div 
                  key={index}
                  className="bg-sand p-4 rounded-lg hover:shadow-md cursor-pointer transition-all"
                >
                  {language === 'en' ? city : 
                    ['باريس', 'طوكيو', 'القاهرة', 'دبي', 'نيويورك', 'إسطنبول'][index]}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PlannerPage;
