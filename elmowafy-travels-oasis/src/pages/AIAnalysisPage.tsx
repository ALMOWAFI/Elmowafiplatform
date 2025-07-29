import React from 'react';
import { AIFamilyPhotoAnalyzer } from '@/components/AIFamilyPhotoAnalyzer';
import { useLanguage } from '@/context/LanguageContext';

const AIAnalysisPage: React.FC = () => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className={`text-4xl font-bold mb-4 ${isArabic ? 'font-noto' : ''}`}>
            {isArabic ? 'محلل الصور العائلية بالذكاء الاصطناعي' : 'AI Family Photo Analysis'}
          </h1>
          <p className={`text-lg text-muted-foreground max-w-2xl mx-auto ${isArabic ? 'font-noto' : ''}`}>
            {isArabic 
              ? 'اكتشف القوة الكاملة للذكاء الاصطناعي في تحليل صورك العائلية وتمييز أفراد الأسرة وإنشاء الذكريات الذكية'
              : 'Discover the full power of AI in analyzing your family photos, recognizing family members, and creating smart memories'
            }
          </p>
        </div>

        {/* Main Component */}
        <AIFamilyPhotoAnalyzer 
          onAnalysisComplete={(analysis) => {
            console.log('Analysis complete:', analysis);
          }}
        />

        {/* Features Section */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <div className="text-center p-6 bg-white rounded-lg shadow-sm border">
            <div className="w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">🧠</span>
            </div>
            <h3 className={`text-lg font-semibold mb-2 ${isArabic ? 'font-noto' : ''}`}>
              {isArabic ? 'تمييز الوجوه' : 'Face Recognition'}
            </h3>
            <p className={`text-sm text-muted-foreground ${isArabic ? 'font-noto' : ''}`}>
              {isArabic 
                ? 'تمييز أفراد العائلة تلقائياً في الصور باستخدام تقنيات الذكاء الاصطناعي المتقدمة'
                : 'Automatically identify family members in photos using advanced AI recognition technology'
              }
            </p>
          </div>

          <div className="text-center p-6 bg-white rounded-lg shadow-sm border">
            <div className="w-12 h-12 bg-green-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">🏷️</span>
            </div>
            <h3 className={`text-lg font-semibold mb-2 ${isArabic ? 'font-noto' : ''}`}>
              {isArabic ? 'الوسوم الذكية' : 'Smart Tagging'}
            </h3>
            <p className={`text-sm text-muted-foreground ${isArabic ? 'font-noto' : ''}`}>
              {isArabic 
                ? 'إنشاء وسوم ذكية تلقائياً بناءً على محتوى الصورة والسياق العائلي'
                : 'Generate smart tags automatically based on photo content and family context'
              }
            </p>
          </div>

          <div className="text-center p-6 bg-white rounded-lg shadow-sm border">
            <div className="w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">💡</span>
            </div>
            <h3 className={`text-lg font-semibold mb-2 ${isArabic ? 'font-noto' : ''}`}>
              {isArabic ? 'رؤى عائلية' : 'Family Insights'}
            </h3>
            <p className={`text-sm text-muted-foreground ${isArabic ? 'font-noto' : ''}`}>
              {isArabic 
                ? 'الحصول على رؤى ذكية حول السياق العائلي والعلاقات والذكريات المقترحة'
                : 'Get intelligent insights about family context, relationships, and suggested memories'
              }
            </p>
          </div>
        </div>

        {/* Technical Details */}
        <div className="mt-12 bg-white rounded-lg shadow-sm border p-6">
          <h2 className={`text-2xl font-bold mb-4 ${isArabic ? 'font-noto' : ''}`}>
            {isArabic ? 'التقنيات المستخدمة' : 'Technology Stack'}
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className={`text-lg font-semibold mb-3 ${isArabic ? 'font-noto' : ''}`}>
                {isArabic ? 'تحليل الصور' : 'Image Analysis'}
              </h3>
              <ul className={`space-y-2 text-sm text-muted-foreground ${isArabic ? 'font-noto' : ''}`}>
                <li>• {isArabic ? 'OpenCV لمعالجة الصور' : 'OpenCV for image processing'}</li>
                <li>• {isArabic ? 'Azure AI للتعرف على الوجوه' : 'Azure AI for facial recognition'}</li>
                <li>• {isArabic ? 'PyTorch للنماذج المخصصة' : 'PyTorch for custom models'}</li>
                <li>• {isArabic ? 'تحليل المشاعر والكائنات' : 'Emotion and object detection'}</li>
              </ul>
            </div>
            <div>
              <h3 className={`text-lg font-semibold mb-3 ${isArabic ? 'font-noto' : ''}`}>
                {isArabic ? 'الذكاء الاصطناعي' : 'AI Features'}
              </h3>
              <ul className={`space-y-2 text-sm text-muted-foreground ${isArabic ? 'font-noto' : ''}`}>
                <li>• {isArabic ? 'تمييز أفراد العائلة' : 'Family member recognition'}</li>
                <li>• {isArabic ? 'تحليل السياق العائلي' : 'Family context analysis'}</li>
                <li>• {isArabic ? 'اقتراح عناوين ذكية' : 'Smart title suggestions'}</li>
                <li>• {isArabic ? 'تصنيف الذكريات تلقائياً' : 'Automatic memory categorization'}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAnalysisPage;