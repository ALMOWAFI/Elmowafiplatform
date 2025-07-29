import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { WorldMapFeature } from '@/features/world-map/WorldMapFeature';
import { FamilyTreeView } from '@/features/family';
import ChatBot from '@/components/ChatBot';
import MemoriesGallery from '@/components/MemoriesGallery';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Globe, Users, MessageSquare, Map, Calendar, Heart } from 'lucide-react';

const BeautyPlatformPage: React.FC = () => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  const [activeTab, setActiveTab] = useState('world-map');

  // Animation variants for page elements
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <div className={`min-h-screen flex flex-col ${isArabic ? 'rtl-text' : 'ltr-text'}`}>
      <Navbar />
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative h-[50vh] md:h-[70vh] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 z-10" />
          <div 
            className="absolute inset-0 bg-cover bg-center z-0" 
            style={{ backgroundImage: 'url(/earth-day-map.jpg)' }}
          />
          <div className="relative z-20 container mx-auto h-full flex flex-col justify-center items-center text-center px-4">
            <motion.h1 
              className={`text-4xl md:text-6xl font-bold text-white mb-4 ${isArabic ? 'font-noto' : ''}`}
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.7 }}
            >
              {isArabic ? 'منصة جمال رحلات عائلة الموافي' : 'Elmowafy Family Beauty Platform'}
            </motion.h1>
            <motion.p 
              className={`text-xl text-white max-w-2xl ${isArabic ? 'font-noto' : ''}`}
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              {isArabic 
                ? 'استكشف رحلات عائلتنا حول العالم من خلال تجربة تفاعلية مذهلة'
                : 'Explore our family travels around the world through an immersive interactive experience'}
            </motion.p>
          </div>
        </section>

        {/* Main Content */}
        <section className="container mx-auto py-12 px-4">
          <Tabs defaultValue="world-map" className="w-full" onValueChange={setActiveTab}>
            <div className="flex justify-center mb-8">
              <TabsList className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <TabsTrigger value="world-map" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <span>{isArabic ? 'خريطة العالم' : 'World Map'}</span>
                </TabsTrigger>
                <TabsTrigger value="family-tree" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{isArabic ? 'شجرة العائلة' : 'Family Tree'}</span>
                </TabsTrigger>
                <TabsTrigger value="ai-assistant" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>{isArabic ? 'المساعد الذكي' : 'AI Assistant'}</span>
                </TabsTrigger>
                <TabsTrigger value="memories" className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  <span>{isArabic ? 'الذكريات' : 'Memories'}</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <TabsContent value="world-map" className="mt-0">
                <motion.div variants={itemVariants}>
                  <WorldMapFeature />
                </motion.div>
              </TabsContent>

              <TabsContent value="family-tree" className="mt-0">
                <motion.div variants={itemVariants}>
                  <Card>
                    <CardHeader>
                      <CardTitle className={isArabic ? 'font-noto' : ''}>
                        {isArabic ? 'شجرة عائلة الموافي' : 'Elmowafy Family Tree'}
                      </CardTitle>
                      <CardDescription className={isArabic ? 'font-noto' : ''}>
                        {isArabic 
                          ? 'استكشف العلاقات العائلية وتعرف على أفراد العائلة'
                          : 'Explore family relationships and get to know family members'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[70vh] min-h-[500px] w-full">
                        <FamilyTreeView 
                          onMemberClick={(member) => {
                            // You can add additional handling when a member is clicked
                            console.log('Selected family member:', member);
                          }}
                          onViewChange={(view) => {
                            // You can track view changes if needed
                            console.log(`Switched to ${view} view`);
                          }}
                          defaultView="2d"
                          data={{
                            members: [
                              // Add your family members data here
                              { id: '1', name: 'Ahmad Ali Elmowafy', arabicName: 'أحمد علي الموفى', birthDate: '1960-01-01' },
                              { id: '2', name: 'Marwa Hani', arabicName: 'مروة هاني', birthDate: '1965-05-15' },
                              { id: '3', name: 'Amr Elmowafy', arabicName: 'عمرو الموفى', birthDate: '1990-08-20' },
                              { id: '4', name: 'Ali Elmowafy', arabicName: 'على الموفى', birthDate: '1992-03-10' },
                              { id: '5', name: 'Rimas', arabicName: 'ريماس', birthDate: '1995-11-25' },
                              { id: '6', name: 'Basmala', arabicName: 'بسمة', birthDate: '1998-07-30' },
                              { id: '7', name: 'Mohamed Elmowafy', arabicName: 'محمد الموفى', birthDate: '1988-09-12' },
                              { id: '8', name: 'Hala El-Sherbini', arabicName: 'هالة الشربيني', birthDate: '1989-04-05' },
                            ],
                            relationships: [
                              { from: '3', to: '1', type: 'child' },
                              { from: '3', to: '2', type: 'child' },
                              { from: '4', to: '1', type: 'child' },
                              { from: '4', to: '2', type: 'child' },
                              { from: '5', to: '1', type: 'child' },
                              { from: '5', to: '2', type: 'child' },
                              { from: '6', to: '1', type: 'child' },
                              { from: '6', to: '2', type: 'child' },
                              { from: '7', to: '1', type: 'child' },
                              { from: '7', to: '2', type: 'child' },
                              { from: '8', to: '7', type: 'spouse' },
                            ]
                          }}
                          onViewChange={(view) => console.log(`Switched to ${view} view`)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>

              <TabsContent value="ai-assistant" className="mt-0">
                <motion.div variants={itemVariants}>
                  <Card>
                    <CardHeader>
                      <CardTitle className={isArabic ? 'font-noto' : ''}>
                        {isArabic ? 'المساعد الذكي للسفر' : 'AI Travel Assistant'}
                      </CardTitle>
                      <CardDescription className={isArabic ? 'font-noto' : ''}>
                        {isArabic 
                          ? 'اسأل المساعد الذكي عن نصائح السفر وتوصيات الأماكن'
                          : 'Ask the AI assistant for travel tips and location recommendations'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChatBot />
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>

              <TabsContent value="memories" className="mt-0">
                <motion.div variants={itemVariants}>
                  <Card>
                    <CardHeader>
                      <CardTitle className={isArabic ? 'font-noto' : ''}>
                        {isArabic ? 'ذكريات رحلاتنا' : 'Our Travel Memories'}
                      </CardTitle>
                      <CardDescription className={isArabic ? 'font-noto' : ''}>
                        {isArabic 
                          ? 'استعرض الصور والذكريات من رحلات العائلة السابقة'
                          : 'Browse photos and memories from past family trips'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <MemoriesGallery />
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>
            </motion.div>
          </Tabs>
        </section>

        {/* Call to Action */}
        <section className="bg-primary/5 py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className={`text-3xl font-bold mb-6 ${isArabic ? 'font-noto' : ''}`}>
              {isArabic ? 'خطط لرحلتك القادمة مع العائلة' : 'Plan Your Next Family Adventure'}
            </h2>
            <p className={`mb-8 max-w-2xl mx-auto ${isArabic ? 'font-noto' : ''}`}>
              {isArabic 
                ? 'استخدم أدواتنا التفاعلية لتخطيط رحلتك القادمة واستكشاف وجهات جديدة مع العائلة'
                : 'Use our interactive tools to plan your next trip and explore new destinations with the family'}
            </p>
            <Button size="lg" className="rounded-full">
              {isArabic ? 'ابدأ التخطيط الآن' : 'Start Planning Now'}
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default BeautyPlatformPage;