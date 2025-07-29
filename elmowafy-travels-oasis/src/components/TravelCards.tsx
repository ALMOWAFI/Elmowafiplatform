
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/context/LanguageContext';

// Sample travel experiences data
const travelExperiences = [
  {
    id: 1,
    title: { en: 'Paris Adventure', ar: 'مغامرة في باريس' },
    date: { en: 'June 2023', ar: 'يونيو ٢٠٢٣' },
    description: { 
      en: 'Exploring the city of lights and experiencing its rich culture and cuisine.',
      ar: 'استكشاف مدينة الأنوار وتجربة ثقافتها وأطعمتها الغنية.' 
    },
    image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1473&q=80'
  },
  {
    id: 2,
    title: { en: 'Tokyo Expedition', ar: 'رحلة طوكيو' },
    date: { en: 'September 2023', ar: 'سبتمبر ٢٠٢٣' },
    description: { 
      en: 'Immersing in the fascinating blend of traditional and ultramodern Japanese culture.',
      ar: 'الانغماس في المزيج الرائع من الثقافة اليابانية التقليدية والحديثة.' 
    },
    image: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1374&q=80'
  },
  {
    id: 3,
    title: { en: 'Cairo Getaway', ar: 'عطلة القاهرة' },
    date: { en: 'January 2024', ar: 'يناير ٢٠٢٤' },
    description: { 
      en: 'Discovering ancient wonders and vibrant markets in the heart of Egypt.',
      ar: 'اكتشاف العجائب القديمة والأسواق النابضة بالحياة في قلب مصر.' 
    },
    image: 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80'
  },
];

const TravelCards = () => {
  const { language, t } = useLanguage();
  
  return (
    <div className={`container mx-auto py-16 px-6 ${language === 'ar' ? 'rtl-text' : 'ltr-text'}`}>
      <h2 className="text-3xl font-bold mb-12 text-center">
        {t('recent')}
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {travelExperiences.map((experience) => (
          <Card key={experience.id} className="overflow-hidden transition-all hover:shadow-lg">
            <div className="h-48 overflow-hidden">
              <img 
                src={experience.image} 
                alt={experience.title[language]} 
                className="w-full h-full object-cover transition-transform hover:scale-105"
              />
            </div>
            <CardHeader>
              <CardTitle>{experience.title[language]}</CardTitle>
              <CardDescription>{experience.date[language]}</CardDescription>
            </CardHeader>
            <CardContent>
              <p>{experience.description[language]}</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">{t('viewMore')}</Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default TravelCards;
