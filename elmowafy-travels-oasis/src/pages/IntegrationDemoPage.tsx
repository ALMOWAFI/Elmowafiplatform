import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { IntegrationDemo } from '@/components/IntegrationDemo';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  Sparkles, 
  Brain, 
  Users, 
  Calendar, 
  MapPin, 
  MessageSquare,
  Upload,
  Eye,
  Zap
} from 'lucide-react';

export default function IntegrationDemoPage() {
  const { language } = useLanguage();
  const isArabic = language === 'ar';

  const features = [
    {
      icon: <Brain className="h-5 w-5 text-purple-600" />,
      title: isArabic ? 'الذكاء الاصطناعي للعائلة' : 'Family AI Assistant',
      description: isArabic 
        ? 'مساعد ذكي يفهم تاريخ العائلة وذكرياتها ويقدم توصيات مخصصة للسفر'
        : 'Intelligent assistant that understands family history and memories, providing personalized travel recommendations',
      status: 'active'
    },
    {
      icon: <Upload className="h-5 w-5 text-blue-600" />,
      title: isArabic ? 'تحليل الذكريات' : 'Memory Analysis',
      description: isArabic 
        ? 'تحليل تلقائي للصور مع التعرف على الوجوه والأماكن والمشاعر'
        : 'Automatic photo analysis with face recognition, location detection, and emotion analysis',
      status: 'active'
    },
    {
      icon: <Calendar className="h-5 w-5 text-green-600" />,
      title: isArabic ? 'الخط الزمني الذكي' : 'Smart Timeline',
      description: isArabic 
        ? 'عرض تفاعلي للذكريات مع اقتراحات ذكية بناءً على التاريخ والموقع'
        : 'Interactive memory timeline with smart suggestions based on date and location patterns',
      status: 'active'
    },
    {
      icon: <MapPin className="h-5 w-5 text-red-600" />,
      title: isArabic ? 'خريطة العالم التفاعلية' : 'Interactive World Map',
      description: isArabic 
        ? 'خريطة ثلاثية الأبعاد تعرض مواقع الذكريات العائلية مع التفاصيل'
        : '3D globe showing family memory locations with detailed information overlays',
      status: 'active'
    },
    {
      icon: <MessageSquare className="h-5 w-5 text-orange-600" />,
      title: isArabic ? 'المحادثة الذكية' : 'Intelligent Chat',
      description: isArabic 
        ? 'روبوت محادثة يستخدم سياق العائلة لتقديم نصائح سفر مخصصة'
        : 'Context-aware chatbot using family data to provide personalized travel advice',
      status: 'active'
    },
    {
      icon: <Eye className="h-5 w-5 text-teal-600" />,
      title: isArabic ? 'البحث الذكي' : 'Smart Search',
      description: isArabic 
        ? 'بحث متقدم في الذكريات باستخدام الذكاء الاصطناعي والسياق العائلي'
        : 'Advanced memory search using AI and family context for accurate results',
      status: 'active'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Navbar />
      
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Zap className="h-12 w-12 text-blue-600" />
            <h1 className={`text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent ${isArabic ? 'font-noto' : ''}`}>
              {isArabic ? 'عرض التكامل الكامل' : 'Complete Integration Demo'}
            </h1>
          </div>
          <p className={`text-xl text-muted-foreground max-w-3xl mx-auto ${isArabic ? 'font-noto' : ''}`}>
            {isArabic 
              ? 'استكشف النظام المتكامل لإدارة الذكريات العائلية والسفر مع الذكاء الاصطناعي'
              : 'Explore the complete integrated system for family memory management and AI-powered travel planning'
            }
          </p>
        </div>

        {/* Feature Overview */}
        <div className="mb-12">
          <h2 className={`text-2xl font-bold mb-6 text-center ${isArabic ? 'font-noto' : ''}`}>
            {isArabic ? 'الميزات المتكاملة' : 'Integrated Features'}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-2 border-transparent hover:border-primary/20 transition-all duration-300">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-3">
                    {feature.icon}
                    <span className={`text-lg ${isArabic ? 'font-noto' : ''}`}>
                      {feature.title}
                    </span>
                    <Badge variant="secondary" className="ml-auto">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {isArabic ? 'نشط' : 'Active'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={`text-sm text-muted-foreground ${isArabic ? 'font-noto' : ''}`}>
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Main Integration Demo */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="h-6 w-6 text-purple-600" />
            <h2 className={`text-2xl font-bold ${isArabic ? 'font-noto' : ''}`}>
              {isArabic ? 'العرض التفاعلي' : 'Live Interactive Demo'}
            </h2>
          </div>
          <IntegrationDemo />
        </div>

        {/* System Status */}
        <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              {isArabic ? 'حالة النظام' : 'System Status'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">✓</div>
                <div className={`text-sm font-medium ${isArabic ? 'font-noto' : ''}`}>
                  {isArabic ? 'واجهة المستخدم' : 'Frontend UI'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {isArabic ? 'جاهز للإنتاج' : 'Production Ready'}
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">✓</div>
                <div className={`text-sm font-medium ${isArabic ? 'font-noto' : ''}`}>
                  {isArabic ? 'التكامل مع API' : 'API Integration'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {isArabic ? 'يعمل مع بيانات تجريبية' : 'Working with Demo Data'}
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">⚡</div>
                <div className={`text-sm font-medium ${isArabic ? 'font-noto' : ''}`}>
                  {isArabic ? 'الذكاء الاصطناعي' : 'AI Services'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {isArabic ? 'متوفر مع البيانات التجريبية' : 'Available with Fallback Data'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="mt-12 text-center">
          <h3 className={`text-lg font-semibold mb-4 ${isArabic ? 'font-noto' : ''}`}>
            {isArabic ? 'اكتشف المزيد' : 'Explore More'}
          </h3>
          <div className="flex flex-wrap justify-center gap-4">
            <Badge variant="outline" className="px-4 py-2 cursor-pointer hover:bg-primary/10">
              <Users className="h-4 w-4 mr-2" />
              {isArabic ? 'إدارة العائلة' : 'Family Management'}
            </Badge>
            <Badge variant="outline" className="px-4 py-2 cursor-pointer hover:bg-primary/10">
              <Calendar className="h-4 w-4 mr-2" />
              {isArabic ? 'خطط السفر' : 'Travel Planning'}
            </Badge>
            <Badge variant="outline" className="px-4 py-2 cursor-pointer hover:bg-primary/10">
              <MapPin className="h-4 w-4 mr-2" />
              {isArabic ? 'الذكريات' : 'Memory Timeline'}
            </Badge>
            <Badge variant="outline" className="px-4 py-2 cursor-pointer hover:bg-primary/10">
              <Brain className="h-4 w-4 mr-2" />
              {isArabic ? 'التحليل الذكي' : 'AI Analysis'}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}