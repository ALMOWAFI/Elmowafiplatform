import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';

// Define the memory item type
interface MemoryItem {
  id: string;
  title: string;
  arabicTitle: string;
  location: string;
  arabicLocation: string;
  date: string;
  imageUrl: string;
  description?: string;
  arabicDescription?: string;
  tags: string[];
  familyMembers: string[];
}

// Sample memories data
const memoriesData: MemoryItem[] = [
  {
    id: 'mem1',
    title: 'Pyramids of Giza',
    arabicTitle: 'أهرامات الجيزة',
    location: 'Cairo, Egypt',
    arabicLocation: 'القاهرة، مصر',
    date: '2022-07-15',
    imageUrl: '/memories/cairo-1.jpg',
    description: 'Exploring the ancient wonders with the whole family',
    arabicDescription: 'استكشاف عجائب العالم القديم مع العائلة بأكملها',
    tags: ['historical', 'family-trip'],
    familyMembers: ['Ahmed Ali Elmowafy', 'Marwa Hani', 'Amr Elmowafy', 'Ali Elmowafy']
  },
  {
    id: 'mem2',
    title: 'Alexandria Beach',
    arabicTitle: 'شاطئ الإسكندرية',
    location: 'Alexandria, Egypt',
    arabicLocation: 'الإسكندرية، مصر',
    date: '2023-08-05',
    imageUrl: '/memories/alexandria-1.jpg',
    description: 'Summer fun at the Mediterranean coast',
    arabicDescription: 'المرح الصيفي على ساحل البحر المتوسط',
    tags: ['beach', 'summer'],
    familyMembers: ['Ali Elmowafy', 'Remas', 'Basmala']
  },
  {
    id: 'mem3',
    title: 'Burj Khalifa',
    arabicTitle: 'برج خليفة',
    location: 'Dubai, UAE',
    arabicLocation: 'دبي، الإمارات العربية المتحدة',
    date: '2021-12-20',
    imageUrl: '/memories/dubai-1.jpg',
    description: 'Visiting the tallest building in the world',
    arabicDescription: 'زيارة أطول مبنى في العالم',
    tags: ['architecture', 'city'],
    familyMembers: ['Mohamed Elmowafy', 'Hala El-Shorbini', 'Shahd Elmowafy', 'Nada Elmowafy']
  },
  {
    id: 'mem4',
    title: 'Blue Mosque',
    arabicTitle: 'المسجد الأزرق',
    location: 'Istanbul, Turkey',
    arabicLocation: 'اسطنبول، تركيا',
    date: '2022-04-10',
    imageUrl: '/memories/istanbul-1.jpg',
    description: 'Exploring the beautiful architecture of Istanbul',
    arabicDescription: 'استكشاف العمارة الجميلة في اسطنبول',
    tags: ['architecture', 'cultural'],
    familyMembers: ['Khaled Ali Elmowafy', 'Shaymaa', 'Seif', 'Selsabila']
  },
  {
    id: 'mem5',
    title: 'Red Sea Snorkeling',
    arabicTitle: 'الغوص في البحر الأحمر',
    location: 'Sharm El-Sheikh, Egypt',
    arabicLocation: 'شرم الشيخ، مصر',
    date: '2023-03-18',
    imageUrl: '/memories/sharm-1.jpg',
    description: 'Underwater adventures in the coral reefs',
    arabicDescription: 'مغامرات تحت الماء في الشعاب المرجانية',
    tags: ['beach', 'adventure'],
    familyMembers: ['Amr Elmowafy', 'Ali Elmowafy', 'Remas', 'Basmala']
  },
  {
    id: 'mem6',
    title: 'Khan el-Khalili',
    arabicTitle: 'خان الخليلي',
    location: 'Cairo, Egypt',
    arabicLocation: 'القاهرة، مصر',
    date: '2022-07-16',
    imageUrl: '/memories/cairo-2.jpg',
    description: 'Shopping in the historic bazaar',
    arabicDescription: 'التسوق في البازار التاريخي',
    tags: ['shopping', 'cultural'],
    familyMembers: ['Ahmed Ali Elmowafy', 'Marwa Hani', 'Amr Elmowafy', 'Ali Elmowafy']
  },
];

const MemoriesGallery: React.FC = () => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  
  // State for filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  
  // Get unique years from memories data
  const years = Array.from(new Set(memoriesData.map(memory => new Date(memory.date).getFullYear().toString())));
  
  // Get unique tags from memories data
  const tags = Array.from(new Set(memoriesData.flatMap(memory => memory.tags)));
  
  // Filter memories based on search term, year, and tag
  const filteredMemories = memoriesData.filter(memory => {
    const matchesSearch = isArabic
      ? memory.arabicTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        memory.arabicLocation.toLowerCase().includes(searchTerm.toLowerCase())
      : memory.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        memory.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesYear = selectedYear === 'all' || new Date(memory.date).getFullYear().toString() === selectedYear;
    const matchesTag = selectedTag === 'all' || memory.tags.includes(selectedTag);
    
    return matchesSearch && matchesYear && matchesTag;
  });
  
  // Animation variants for gallery items
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.4
      }
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder={isArabic ? 'ابحث عن ذكريات...' : 'Search memories...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={isArabic ? 'text-right' : 'text-left'}
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder={isArabic ? 'السنة' : 'Year'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isArabic ? 'كل السنوات' : 'All Years'}</SelectItem>
              {years.map(year => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedTag} onValueChange={setSelectedTag}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={isArabic ? 'النوع' : 'Category'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isArabic ? 'كل الأنواع' : 'All Categories'}</SelectItem>
              {tags.map(tag => (
                <SelectItem key={tag} value={tag}>
                  {isArabic
                    ? tag === 'historical' ? 'تاريخي'
                      : tag === 'beach' ? 'شاطئ'
                      : tag === 'architecture' ? 'عمارة'
                      : tag === 'cultural' ? 'ثقافي'
                      : tag === 'adventure' ? 'مغامرة'
                      : tag === 'shopping' ? 'تسوق'
                      : tag === 'family-trip' ? 'رحلة عائلية'
                      : tag === 'summer' ? 'صيف'
                      : tag === 'city' ? 'مدينة'
                      : tag
                    : tag.charAt(0).toUpperCase() + tag.slice(1).replace('-', ' ')
                  }
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Gallery */}
      {filteredMemories.length > 0 ? (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {filteredMemories.map(memory => (
            <motion.div key={memory.id} variants={itemVariants}>
              <Card className="overflow-hidden h-full hover:shadow-lg transition-shadow">
                <div className="aspect-video relative overflow-hidden">
                  <img 
                    src={memory.imageUrl} 
                    alt={isArabic ? memory.arabicTitle : memory.title}
                    className="w-full h-full object-cover transition-transform hover:scale-105 duration-500"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                    <h3 className={`text-white font-bold ${isArabic ? 'font-noto' : ''}`}>
                      {isArabic ? memory.arabicTitle : memory.title}
                    </h3>
                    <p className={`text-white/80 text-sm ${isArabic ? 'font-noto' : ''}`}>
                      {isArabic ? memory.arabicLocation : memory.location} • {new Date(memory.date).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US')}
                    </p>
                  </div>
                </div>
                <CardContent className="p-4">
                  <p className={`text-sm text-muted-foreground mb-3 ${isArabic ? 'font-noto' : ''}`}>
                    {isArabic ? memory.arabicDescription : memory.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {memory.tags.map(tag => (
                      <Button 
                        key={tag} 
                        variant="outline" 
                        size="sm" 
                        className="rounded-full text-xs"
                        onClick={() => setSelectedTag(tag)}
                      >
                        {isArabic
                          ? tag === 'historical' ? 'تاريخي'
                            : tag === 'beach' ? 'شاطئ'
                            : tag === 'architecture' ? 'عمارة'
                            : tag === 'cultural' ? 'ثقافي'
                            : tag === 'adventure' ? 'مغامرة'
                            : tag === 'shopping' ? 'تسوق'
                            : tag === 'family-trip' ? 'رحلة عائلية'
                            : tag === 'summer' ? 'صيف'
                            : tag === 'city' ? 'مدينة'
                            : tag
                          : tag.charAt(0).toUpperCase() + tag.slice(1).replace('-', ' ')
                        }
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="text-center py-12">
          <p className={`text-muted-foreground ${isArabic ? 'font-noto' : ''}`}>
            {isArabic ? 'لا توجد ذكريات تطابق معايير البحث' : 'No memories match your search criteria'}
          </p>
        </div>
      )}
    </div>
  );
};

export default MemoriesGallery;