import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Globe, Languages, Calendar, Book, Star, MapPin,
  Heart, Share2, Download, Edit, Plus, Search,
  Moon, Sun, Clock, Flag, Compass, Award,
  Users, Camera, Music, Utensils, Palette, CheckCircle
} from 'lucide-react';
import { culturalService } from '@/services/api';

interface CulturalEvent {
  id: string;
  title: string;
  titleArabic: string;
  description: string;
  descriptionArabic: string;
  date: string;
  type: 'religious' | 'national' | 'cultural' | 'family';
  significance: string;
  traditions: string[];
  image?: string;
  isUpcoming: boolean;
}

interface HeritageItem {
  id: string;
  title: string;
  titleArabic: string;
  description: string;
  descriptionArabic: string;
  category: 'story' | 'recipe' | 'tradition' | 'artifact' | 'place';
  author: string;
  dateAdded: string;
  tags: string[];
  media: string[];
  rating: number;
  isVerified: boolean;
}

interface Translation {
  original: string;
  translated: string;
  fromLang: 'en' | 'ar';
  toLang: 'en' | 'ar';
  confidence: number;
}

interface Recipe {
  id: string;
  name: string;
  nameArabic: string;
  description: string;
  ingredients: { name: string, nameArabic: string, amount: string }[];
  instructions: string[];
  instructionsArabic: string[];
  origin: string;
  difficulty: 'easy' | 'medium' | 'hard';
  prepTime: number;
  cookTime: number;
  servings: number;
  image?: string;
  familyStory?: string;
}

export const CulturalFeatures: React.FC = () => {
  const [activeTab, setActiveTab] = useState('calendar');
  const [language, setLanguage] = useState<'en' | 'ar'>('en');
  const [culturalEvents, setCulturalEvents] = useState<CulturalEvent[]>([]);
  const [heritageItems, setHeritageItems] = useState<HeritageItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [translationInput, setTranslationInput] = useState('');
  const [translationResult, setTranslationResult] = useState<Translation | null>(null);

  useEffect(() => {
    loadCulturalData();
  }, []);

  const loadCulturalData = () => {
    // Demo cultural events
    const demoEvents: CulturalEvent[] = [
      {
        id: '1',
        title: 'Eid al-Fitr',
        titleArabic: 'عيد الفطر',
        description: 'Festival celebrating the end of Ramadan',
        descriptionArabic: 'مهرجان يحتفل بنهاية شهر رمضان',
        date: '2024-04-10',
        type: 'religious',
        significance: 'One of the most important Islamic holidays',
        traditions: ['Family gatherings', 'Gift giving', 'Special prayers', 'Traditional sweets'],
        isUpcoming: true
      },
      {
        id: '2',
        title: 'UAE National Day',
        titleArabic: 'اليوم الوطني للإمارات',
        description: 'Celebration of UAE independence',
        descriptionArabic: 'احتفال باستقلال دولة الإمارات',
        date: '2024-12-02',
        type: 'national',
        significance: 'Commemorates the formation of the UAE',
        traditions: ['Flag ceremonies', 'Fireworks', 'Cultural performances', 'Heritage displays'],
        isUpcoming: true
      },
      {
        id: '3',
        title: 'Arabic Language Day',
        titleArabic: 'يوم اللغة العربية',
        description: 'Celebrating Arabic language and culture',
        descriptionArabic: 'احتفال باللغة العربية والثقافة',
        date: '2024-12-18',
        type: 'cultural',
        significance: 'Promotes Arabic language preservation',
        traditions: ['Poetry recitations', 'Calligraphy displays', 'Literary discussions'],
        isUpcoming: true
      }
    ];

    // Demo heritage items
    const demoHeritage: HeritageItem[] = [
      {
        id: '1',
        title: 'The Story of Our Family Migration',
        titleArabic: 'قصة هجرة عائلتنا',
        description: 'How our family moved from Egypt to the UAE in search of better opportunities',
        descriptionArabic: 'كيف انتقلت عائلتنا من مصر إلى الإمارات بحثاً عن فرص أفضل',
        category: 'story',
        author: 'Grandfather Ahmed',
        dateAdded: '2024-01-15',
        tags: ['migration', 'family history', 'Egypt', 'UAE'],
        media: [],
        rating: 5,
        isVerified: true
      },
      {
        id: '2',
        title: 'Traditional Mansaf Recipe',
        titleArabic: 'وصفة المنسف التقليدية',
        description: 'Grandmother\'s authentic Mansaf recipe passed down through generations',
        descriptionArabic: 'وصفة المنسف الأصلية للجدة المتوارثة عبر الأجيال',
        category: 'recipe',
        author: 'Grandmother Fatima',
        dateAdded: '2024-02-20',
        tags: ['recipe', 'traditional', 'Jordanian', 'family'],
        media: ['mansaf-photo.jpg'],
        rating: 5,
        isVerified: true
      },
      {
        id: '3',
        title: 'The Old House in Cairo',
        titleArabic: 'البيت القديم في القاهرة',
        description: 'Memories and photos of our ancestral home in Cairo',
        descriptionArabic: 'ذكريات وصور من بيت الأجداد في القاهرة',
        category: 'place',
        author: 'Uncle Mohamed',
        dateAdded: '2024-03-10',
        tags: ['Cairo', 'ancestral home', 'memories', 'Egypt'],
        media: ['cairo-house-1.jpg', 'cairo-house-2.jpg'],
        rating: 4,
        isVerified: true
      }
    ];

    // Demo recipes
    const demoRecipes: Recipe[] = [
      {
        id: '1',
        name: 'Traditional Hummus',
        nameArabic: 'الحمص التقليدي',
        description: 'Creamy, delicious hummus made the traditional way',
        ingredients: [
          { name: 'Chickpeas', nameArabic: 'حمص', amount: '1 cup dried' },
          { name: 'Tahini', nameArabic: 'طحينة', amount: '1/4 cup' },
          { name: 'Lemon juice', nameArabic: 'عصير ليمون', amount: '2 tbsp' },
          { name: 'Garlic', nameArabic: 'ثوم', amount: '2 cloves' },
          { name: 'Olive oil', nameArabic: 'زيت زيتون', amount: '2 tbsp' }
        ],
        instructions: [
          'Soak chickpeas overnight',
          'Cook chickpeas until tender',
          'Blend with tahini, lemon juice, and garlic',
          'Drizzle with olive oil and serve'
        ],
        instructionsArabic: [
          'انقع الحمص طوال الليل',
          'اطبخ الحمص حتى ينضج',
          'اخلط مع الطحينة وعصير الليمون والثوم',
          'رش بزيت الزيتون وقدمه'
        ],
        origin: 'Middle Eastern',
        difficulty: 'easy',
        prepTime: 15,
        cookTime: 60,
        servings: 4,
        familyStory: 'This is how grandmother always made hummus for family gatherings'
      }
    ];

    setCulturalEvents(demoEvents);
    setHeritageItems(demoHeritage);
    setRecipes(demoRecipes);
  };

  const handleTranslate = async () => {
    if (!translationInput.trim()) return;

    try {
      // Determine language automatically
      const isArabic = /[\u0600-\u06FF]/.test(translationInput);
      const fromLang = isArabic ? 'ar' : 'en';
      const toLang = isArabic ? 'en' : 'ar';

      // Mock translation - in real app, call translation API
      const mockTranslations = {
        'Hello': 'مرحبا',
        'Family': 'عائلة',
        'Love': 'حب',
        'Home': 'بيت',
        'مرحبا': 'Hello',
        'عائلة': 'Family',
        'حب': 'Love',
        'بيت': 'Home'
      };

      const translated = mockTranslations[translationInput] || 'Translation not available';
      
      const result: Translation = {
        original: translationInput,
        translated,
        fromLang,
        toLang,
        confidence: 0.95
      };

      setTranslationResult(result);
      setTranslations(prev => [...prev, result]);
    } catch (error) {
      console.error('Translation failed:', error);
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'religious': return 'bg-green-100 text-green-800';
      case 'national': return 'bg-blue-100 text-blue-800';
      case 'cultural': return 'bg-purple-100 text-purple-800';
      case 'family': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'story': return <Book className="h-4 w-4" />;
      case 'recipe': return <Utensils className="h-4 w-4" />;
      case 'tradition': return <Users className="h-4 w-4" />;
      case 'artifact': return <Award className="h-4 w-4" />;
      case 'place': return <MapPin className="h-4 w-4" />;
      default: return <Heart className="h-4 w-4" />;
    }
  };

  const formatArabicDate = (date: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date(date).toLocaleDateString('ar-EG', options);
  };

  const isRTL = language === 'ar';

  return (
    <div className={`w-full ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Language Toggle */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {language === 'en' ? 'Cultural Heritage' : 'التراث الثقافي'}
        </h2>
        
        <div className="flex items-center space-x-3">
          <Button
            variant={language === 'en' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setLanguage('en')}
          >
            <Flag className="h-4 w-4 mr-1" />
            English
          </Button>
          <Button
            variant={language === 'ar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setLanguage('ar')}
          >
            <Flag className="h-4 w-4 mr-1" />
            العربية
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="calendar">
            {language === 'en' ? 'Cultural Calendar' : 'التقويم الثقافي'}
          </TabsTrigger>
          <TabsTrigger value="heritage">
            {language === 'en' ? 'Family Heritage' : 'التراث العائلي'}
          </TabsTrigger>
          <TabsTrigger value="recipes">
            {language === 'en' ? 'Traditional Recipes' : 'الوصفات التقليدية'}
          </TabsTrigger>
          <TabsTrigger value="translation">
            {language === 'en' ? 'Translation' : 'الترجمة'}
          </TabsTrigger>
          <TabsTrigger value="stories">
            {language === 'en' ? 'Family Stories' : 'قصص العائلة'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {culturalEvents.map((event) => (
              <Card key={event.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 rounded-t-lg flex items-center justify-center">
                    <div className="text-center">
                      <Calendar className="h-12 w-12 text-blue-600 mx-auto mb-2" />
                      <p className="text-sm font-medium text-gray-600">
                        {language === 'en' ? event.title : event.titleArabic}
                      </p>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-lg">
                        {language === 'en' ? event.title : event.titleArabic}
                      </h3>
                      <Badge className={getEventTypeColor(event.type)}>
                        {event.type}
                      </Badge>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-3">
                      {language === 'en' ? event.description : event.descriptionArabic}
                    </p>
                    
                    <div className="space-y-2">
                      <div className="flex items-center text-xs text-gray-500">
                        <Calendar className="h-3 w-3 mr-1" />
                        {language === 'en' 
                          ? new Date(event.date).toLocaleDateString()
                          : formatArabicDate(event.date)
                        }
                      </div>
                      
                      <div className="text-xs text-gray-600">
                        <strong>
                          {language === 'en' ? 'Significance:' : 'الأهمية:'}
                        </strong>
                        <p className="mt-1">{event.significance}</p>
                      </div>
                      
                      <div className="text-xs text-gray-600">
                        <strong>
                          {language === 'en' ? 'Traditions:' : 'التقاليد:'}
                        </strong>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {event.traditions.map((tradition, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tradition}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="heritage" className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder={language === 'en' ? "Search heritage items..." : "البحث في التراث..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {language === 'en' ? 'Add Heritage Item' : 'إضافة عنصر تراثي'}
            </Button>
          </div>

          <div className="space-y-4">
            {heritageItems.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center text-white">
                        {getCategoryIcon(item.category)}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-semibold text-lg">
                            {language === 'en' ? item.title : item.titleArabic}
                          </h3>
                          {item.isVerified && (
                            <Badge variant="default" className="bg-green-500">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {language === 'en' ? 'Verified' : 'مُتحقق'}
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-gray-600 mb-2">
                          {language === 'en' ? item.description : item.descriptionArabic}
                        </p>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                          <span className="flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            {item.author}
                          </span>
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {new Date(item.dateAdded).toLocaleDateString()}
                          </span>
                          <Badge variant="outline">
                            {item.category}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < item.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-gray-600">{item.rating}/5</span>
                        </div>
                        
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm">
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="recipes" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map((recipe) => (
              <Card key={recipe.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  <div className="aspect-video bg-gradient-to-br from-orange-100 to-red-100 rounded-t-lg flex items-center justify-center">
                    {recipe.image ? (
                      <img src={recipe.image} alt={recipe.name} className="w-full h-full object-cover rounded-t-lg" />
                    ) : (
                      <Utensils className="h-12 w-12 text-orange-600" />
                    )}
                  </div>
                  
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2">
                      {language === 'en' ? recipe.name : recipe.nameArabic}
                    </h3>
                    
                    <p className="text-gray-600 text-sm mb-3">{recipe.description}</p>
                    
                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 mb-3">
                      <div className="text-center">
                        <Clock className="h-3 w-3 mx-auto mb-1" />
                        <span>{recipe.prepTime}m prep</span>
                      </div>
                      <div className="text-center">
                        <Clock className="h-3 w-3 mx-auto mb-1" />
                        <span>{recipe.cookTime}m cook</span>
                      </div>
                      <div className="text-center">
                        <Users className="h-3 w-3 mx-auto mb-1" />
                        <span>{recipe.servings} servings</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Badge className={
                        recipe.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                        recipe.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }>
                        {recipe.difficulty}
                      </Badge>
                      <Button variant="outline" size="sm">
                        {language === 'en' ? 'View Recipe' : 'عرض الوصفة'}
                      </Button>
                    </div>
                    
                    {recipe.familyStory && (
                      <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-800">
                        💙 {recipe.familyStory}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="translation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Languages className="h-5 w-5" />
                <span>{language === 'en' ? 'Arabic-English Translation' : 'ترجمة عربي-إنجليزي'}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  placeholder={language === 'en' ? "Enter text to translate..." : "أدخل النص للترجمة..."}
                  value={translationInput}
                  onChange={(e) => setTranslationInput(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleTranslate}>
                  <Languages className="h-4 w-4 mr-2" />
                  {language === 'en' ? 'Translate' : 'ترجم'}
                </Button>
              </div>
              
              {translationResult && (
                <Card className="bg-blue-50">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700">
                          {language === 'en' ? 'Original:' : 'الأصل:'}
                        </label>
                        <p className="text-lg">{translationResult.original}</p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-700">
                          {language === 'en' ? 'Translation:' : 'الترجمة:'}
                        </label>
                        <p className="text-lg font-semibold text-blue-800">{translationResult.translated}</p>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <span>
                          {language === 'en' ? 'Confidence:' : 'الثقة:'} {(translationResult.confidence * 100).toFixed(0)}%
                        </span>
                        <Badge variant="outline">
                          {translationResult.fromLang} → {translationResult.toLang}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {translations.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">
                    {language === 'en' ? 'Recent Translations' : 'الترجمات الأخيرة'}
                  </h3>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {translations.slice(-10).reverse().map((translation, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="text-sm">{translation.original}</p>
                              <p className="text-sm font-medium text-blue-600">{translation.translated}</p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {translation.fromLang} → {translation.toLang}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stories" className="space-y-6">
          <div className="text-center py-12">
            <Book className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {language === 'en' ? 'Family Stories Coming Soon' : 'قصص العائلة قريباً'}
            </h3>
            <p className="text-gray-600 mb-6">
              {language === 'en' 
                ? 'Share and preserve your family\'s precious stories and memories.'
                : 'شارك واحفظ قصص وذكريات عائلتك الثمينة.'
              }
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {language === 'en' ? 'Add First Story' : 'أضف أول قصة'}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CulturalFeatures; 