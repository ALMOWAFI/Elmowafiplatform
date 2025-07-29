
import React from 'react';
import Hero from '@/components/Hero';
import Navbar from '@/components/Navbar';
import TravelCards from '@/components/TravelCards';
import ChatBot from '@/components/ChatBot';
import Footer from '@/components/Footer';
import WorldMap from '@/components/WorldMap';
import FamilyTree from '@/components/FamilyTree';
import FamilyCouncil from '@/components/FamilyCouncil';
import { useLanguage } from '@/context/LanguageContext';

const Index = () => {
  const { language } = useLanguage();
  
  return (
    <div className={`min-h-screen flex flex-col ${language === 'ar' ? 'rtl-text' : 'ltr-text'}`}>
      <Navbar />
      <main className="flex-grow">
        <Hero />
        
        {/* World Map Section */}
        <div className="container mx-auto py-12 px-6">
          <h2 className="text-3xl font-bold mb-6 text-center">
            {language === 'en' ? 'Explore Our Journey Around The World' : 'استكشف رحلاتنا حول العالم'}
          </h2>
          <p className="text-center mb-8 max-w-2xl mx-auto">
            {language === 'en' 
              ? 'Interactive 3D globe showing the Elmowafy family travels. Click on markers to see details about our adventures.' 
              : 'كرة أرضية تفاعلية ثلاثية الأبعاد تعرض رحلات عائلة الموافي. انقر على العلامات لمشاهدة تفاصيل مغامراتنا.'}
          </p>
          <WorldMap />
        </div>
        
        <TravelCards />
        
        {/* Family Tree Section */}
        <div className="container mx-auto py-12 px-6 bg-sand/10">
          <h2 className="text-3xl font-bold mb-6 text-center">
            {language === 'en' ? 'Our Family Tree' : 'شجرة العائلة'}
          </h2>
          <div className="max-w-4xl mx-auto">
            <FamilyTree />
          </div>
        </div>
        
        {/* Family Council Section */}
        <div className="container mx-auto py-12 px-6">
          <h2 className="text-3xl font-bold mb-6 text-center">
            {language === 'en' ? 'Family Council' : 'مجلس العيلة'}
          </h2>
          <p className="text-center mb-8 max-w-2xl mx-auto">
            {language === 'en' 
              ? 'Collaborate on trip finances, track expenses, and manage budgets as a family.' 
              : 'تعاون في إدارة نفقات الرحلات، وتتبع المصروفات، وإدارة الميزانيات كعائلة واحدة.'}
          </p>
          <div className="max-w-4xl mx-auto">
            <FamilyCouncil />
          </div>
        </div>
        
        <div className="container mx-auto py-16 px-6">
          <div className="flex flex-col lg:flex-row gap-8 items-center justify-center">
            <div className="w-full lg:w-1/2">
              <h2 className="text-3xl font-bold mb-4">
                {language === 'en' 
                  ? 'Your AI Travel Companion' 
                  : 'رفيق السفر الذكي الخاص بك'}
              </h2>
              <p className="mb-6">
                {language === 'en'
                  ? 'Get personalized recommendations, answers to your travel questions, and even have a laugh or two with our friendly AI assistant.'
                  : 'احصل على توصيات مخصصة، وإجابات على أسئلة سفرك، وحتى ضحكة أو اثنتين مع مساعدنا الذكي الودود.'}
              </p>
            </div>
            
            <div className="w-full lg:w-1/2">
              <ChatBot />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
