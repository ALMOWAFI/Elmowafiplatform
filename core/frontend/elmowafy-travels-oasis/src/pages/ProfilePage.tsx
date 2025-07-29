
import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useLanguage } from '@/context/LanguageContext';

const ProfilePage = () => {
  const { language } = useLanguage();
  
  return (
    <div className={`min-h-screen flex flex-col ${language === 'ar' ? 'rtl-text' : 'ltr-text'}`}>
      <Navbar />
      <main className="flex-grow">
        <div className="container mx-auto py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-primary to-primary/70 text-white">
                <CardTitle className="text-2xl">
                  {language === 'en' ? 'Elmowafy Family Profile' : 'الملف الشخصي لعائلة الموافي'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="flex flex-col items-center">
                    <Avatar className="w-32 h-32">
                      <AvatarImage src="https://images.unsplash.com/photo-1612151855475-877969f4a6cc?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8MzN8fGZhbWlseXxlbnwwfHwwfHw%3D&auto=format&fit=crop&w=500&q=60" alt="Elmowafy Family" />
                      <AvatarFallback>EM</AvatarFallback>
                    </Avatar>
                    <h2 className="mt-4 font-bold text-xl">
                      {language === 'en' ? 'The Elmowafy Family' : 'عائلة الموافي'}
                    </h2>
                    <p className="text-muted-foreground">
                      {language === 'en' ? 'Travel Enthusiasts' : 'عشاق السفر'}
                    </p>
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-2">
                      {language === 'en' ? 'About Us' : 'عنا'}
                    </h3>
                    <p className="mb-4">
                      {language === 'en'
                        ? 'We are the Elmowafy family, passionate travelers and explorers. We love discovering new cultures, cuisines, and creating unforgettable memories together. Our mission is to visit every continent and document our adventures.'
                        : 'نحن عائلة الموافي، مسافرون ومستكشفون شغوفون. نحب اكتشاف ثقافات وأطعمة جديدة، وخلق ذكريات لا تنسى معًا. مهمتنا هي زيارة كل قارة وتوثيق مغامراتنا.'}
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                      <div className="border rounded-lg p-4">
                        <h4 className="font-medium">
                          {language === 'en' ? 'Countries Visited' : 'البلدان التي تمت زيارتها'}
                        </h4>
                        <p className="text-2xl font-bold">12</p>
                      </div>
                      <div className="border rounded-lg p-4">
                        <h4 className="font-medium">
                          {language === 'en' ? 'Planned Trips' : 'الرحلات المخططة'}
                        </h4>
                        <p className="text-2xl font-bold">3</p>
                      </div>
                      <div className="border rounded-lg p-4">
                        <h4 className="font-medium">
                          {language === 'en' ? 'Travel Photos' : 'صور السفر'}
                        </h4>
                        <p className="text-2xl font-bold">253</p>
                      </div>
                      <div className="border rounded-lg p-4">
                        <h4 className="font-medium">
                          {language === 'en' ? 'Days Traveled' : 'أيام السفر'}
                        </h4>
                        <p className="text-2xl font-bold">87</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProfilePage;
