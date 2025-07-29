
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/context/LanguageContext';
import { Users, ChevronDown, ChevronRight, User } from 'lucide-react';
import { cn } from '@/lib/utils';

// Define the family member type
interface FamilyMember {
  id: number;
  name: string;
  arabicName?: string;
  role: string;
  arabicRole: string;
  children?: number[];
  spouseId?: number;
  imageUrl?: string;
  birthYear?: string;
  currentLocation?: string;
  achievements?: string[];
  favoriteDestinations?: string[];
  biography?: string;
  arabicBiography?: string;
  travelHistory?: {place: string; year: string}[];
  expanded?: boolean;
}

// Family members data based on the provided structure
const familyMembers: FamilyMember[] = [
  // First branch - Ahmed Ali Elmowafy and family
  {
    id: 1,
    name: 'Ahmed Ali Elmowafy',
    arabicName: 'أحمد علي الموافي',
    role: 'Grandfather',
    arabicRole: 'الجد',
    children: [10, 20, 30],
    imageUrl: '/family/ahmed-ali.jpg',
    birthYear: '1965',
    currentLocation: 'Cairo, Egypt',
    favoriteDestinations: ['Alexandria', 'Sharm El-Sheikh', 'Dubai'],
    biography: 'The patriarch of the Elmowafy family, known for his wisdom and love for family gatherings.',
    arabicBiography: 'كبير عائلة الموافي، معروف بحكمته وحبه للتجمعات العائلية.',
    travelHistory: [
      {place: 'Mecca, Saudi Arabia', year: '2010'},
      {place: 'Dubai, UAE', year: '2015'},
      {place: 'Istanbul, Turkey', year: '2018'}
    ],
  },
  {
    id: 2,
    name: 'Marwa Hani',
    arabicName: 'مروة هاني',
    role: 'Grandmother',
    arabicRole: 'الجدة',
    spouseId: 1,
    imageUrl: '/family/marwa-hani.jpg',
    birthYear: '1968',
    currentLocation: 'Cairo, Egypt',
    favoriteDestinations: ['Paris', 'Alexandria', 'Luxor'],
    biography: 'The matriarch of the family, known for her warmth and excellent cooking skills.',
    arabicBiography: 'سيدة العائلة المعروفة بدفئها ومهاراتها الممتازة في الطبخ.',
    travelHistory: [
      {place: 'Mecca, Saudi Arabia', year: '2010'},
      {place: 'Paris, France', year: '2016'},
      {place: 'Istanbul, Turkey', year: '2018'}
    ],
  },
  
  // Ahmed's children
  {
    id: 10,
    name: 'Amr Elmowafy',
    arabicName: 'عمرو الموافي',
    role: 'Son',
    arabicRole: 'الابن',
    children: [],
    imageUrl: '/family/amr-elmowafy.jpg',
    birthYear: '1988',
    currentLocation: 'Dubai, UAE',
    favoriteDestinations: ['London', 'New York', 'Tokyo'],
    biography: 'Entrepreneur and technology enthusiast who loves to explore new cities.',
    arabicBiography: 'رجل أعمال ومتحمس للتكنولوجيا يحب استكشاف المدن الجديدة.',
    travelHistory: [
      {place: 'London, UK', year: '2019'},
      {place: 'New York, USA', year: '2021'},
      {place: 'Tokyo, Japan', year: '2023'}
    ],
  },
  {
    id: 20,
    name: 'Ali Elmowafy',
    arabicName: 'علي الموافي',
    role: 'Son',
    arabicRole: 'الابن',
    children: [31, 32],
    imageUrl: '/family/ali-elmowafy.jpg',
    birthYear: '1990',
    currentLocation: 'Alexandria, Egypt',
    favoriteDestinations: ['Barcelona', 'Rome', 'Beirut'],
    biography: 'Creative designer with a passion for Mediterranean architecture.',
    arabicBiography: 'مصمم مبدع مع شغف بالعمارة المتوسطية.',
    travelHistory: [
      {place: 'Barcelona, Spain', year: '2018'},
      {place: 'Rome, Italy', year: '2020'},
      {place: 'Beirut, Lebanon', year: '2022'}
    ],
  },
  {
    id: 30, 
    name: 'Daughters',
    arabicName: 'البنات',
    role: 'Daughters',
    arabicRole: 'البنات',
    children: [],
  },
  // Ahmed's granddaughters
  {
    id: 31,
    name: 'Remas',
    arabicName: 'ريماس',
    role: 'Granddaughter',
    arabicRole: 'الحفيدة',
    children: [],
    imageUrl: '/family/remas.jpg',
    birthYear: '2012',
    currentLocation: 'Alexandria, Egypt',
    favoriteDestinations: ['Disney Paris', 'Barcelona', 'Cairo'],
    biography: 'Loves swimming and dreams of becoming a marine biologist.',
    arabicBiography: 'تحب السباحة وتحلم بأن تصبح عالمة بيولوجيا بحرية.',
    travelHistory: [
      {place: 'Barcelona, Spain', year: '2018'},
      {place: 'Disneyland Paris, France', year: '2020'}
    ],
  },
  {
    id: 32,
    name: 'Basmala',
    arabicName: 'بسملة',
    role: 'Granddaughter',
    arabicRole: 'الحفيدة',
    children: [],
    imageUrl: '/family/basmala.jpg',
    birthYear: '2014',
    currentLocation: 'Alexandria, Egypt',
    favoriteDestinations: ['London', 'Cairo Zoo', 'Sharm El-Sheikh'],
    biography: 'Artist in the making, loves drawing and painting landscapes.',
    arabicBiography: 'فنانة في طور التكوين، تحب الرسم وتلوين المناظر الطبيعية.',
    travelHistory: [
      {place: 'Sharm El-Sheikh, Egypt', year: '2019'},
      {place: 'London, UK', year: '2021'}
    ],
  },
  
  // Second branch - Mohamed Elmowafy and family
  {
    id: 100,
    name: 'Mohamed Elmowafy',
    arabicName: 'محمد الموافي',
    role: 'Uncle',
    arabicRole: 'العم',
    children: [110, 111, 112, 113, 114],
    imageUrl: '/family/mohamed-elmowafy.jpg',
    birthYear: '1970',
    currentLocation: 'Mansoura, Egypt',
    favoriteDestinations: ['Istanbul', 'Riyadh', 'Beirut'],
    biography: 'Respected physician and family health advisor who enjoys historical sites.',
    arabicBiography: 'طبيب محترم ومستشار صحي للعائلة يستمتع بزيارة المواقع التاريخية.',
    travelHistory: [
      {place: 'Istanbul, Turkey', year: '2017'},
      {place: 'Riyadh, Saudi Arabia', year: '2019'},
      {place: 'Beirut, Lebanon', year: '2022'}
    ],
  },
  {
    id: 101,
    name: 'Hala El-Shorbini',
    arabicName: 'هالة الشربيني',
    role: 'Aunt',
    arabicRole: 'العمة',
    spouseId: 100,
    imageUrl: '/family/hala-elshorbini.jpg',
    birthYear: '1975',
    currentLocation: 'Mansoura, Egypt',
    favoriteDestinations: ['Vienna', 'Dubai', 'Alexandria'],
    biography: 'Talented pianist and music teacher who organized many family cultural trips.',
    arabicBiography: 'عازفة بيانو موهوبة ومعلمة موسيقى نظمت العديد من الرحلات الثقافية العائلية.',
    travelHistory: [
      {place: 'Vienna, Austria', year: '2017'},
      {place: 'Dubai, UAE', year: '2020'},
      {place: 'Cairo, Egypt', year: '2021'}
    ],
  },
  
  // Mohamed's children
  {
    id: 110,
    name: 'Shahd Elmowafy',
    arabicName: 'شهد الموافي',
    role: 'Cousin',
    arabicRole: 'ابنة العم',
    children: [],
    imageUrl: '/family/shahd-elmowafy.jpg',
    birthYear: '1998',
    currentLocation: 'Cairo, Egypt',
    favoriteDestinations: ['Paris', 'Istanbul', 'Alexandria'],
    biography: 'Medical student following her father\'s footsteps and passionate about humanitarian travels.',
    arabicBiography: 'طالبة طب تتبع خطى والدها ولديها شغف بالرحلات الإنسانية.',
    travelHistory: [
      {place: 'Paris, France', year: '2018'},
      {place: 'Istanbul, Turkey', year: '2021'}
    ],
  },
  {
    id: 111,
    name: 'Nada Elmowafy',
    arabicName: 'ندى الموافي',
    role: 'Cousin',
    arabicRole: 'ابنة العم',
    children: [],
    imageUrl: '/family/nada-elmowafy.jpg',
    birthYear: '2000',
    currentLocation: 'Mansoura, Egypt',
    favoriteDestinations: ['Barcelona', 'Dubai', 'Aswan'],
    biography: 'Music enthusiast who inherited her mother\'s piano skills and loves cultural exchanges.',
    arabicBiography: 'عاشقة للموسيقى ورثت مهارات البيانو من والدتها وتحب التبادل الثقافي.',
    travelHistory: [
      {place: 'Barcelona, Spain', year: '2019'},
      {place: 'Dubai, UAE', year: '2022'}
    ],
  },
  {
    id: 112,
    name: 'Youssef Elmowafy',
    arabicName: 'يوسف الموافي',
    role: 'Cousin',
    arabicRole: 'ابن العم',
    children: [],
    imageUrl: '/family/youssef-elmowafy.jpg',
    birthYear: '2003',
    currentLocation: 'Mansoura, Egypt',
    favoriteDestinations: ['Rome', 'London', 'Luxor'],
    biography: 'Engineering student with a passion for ancient architecture and historical sites.',
    arabicBiography: 'طالب هندسة لديه شغف بالعمارة القديمة والمواقع التاريخية.',
    travelHistory: [
      {place: 'Rome, Italy', year: '2018'},
      {place: 'London, UK', year: '2020'}
    ],
  },
  {
    id: 113,
    name: 'Ali Mohamed Elmowafy',
    arabicName: 'علي محمد الموافي',
    role: 'Cousin',
    arabicRole: 'ابن العم',
    children: [],
    imageUrl: '/family/ali-mohamed-elmowafy.jpg',
    birthYear: '2006',
    currentLocation: 'Mansoura, Egypt',
    favoriteDestinations: ['Tokyo', 'Cairo', 'Alexandria'],
    biography: 'Tech enthusiast who dreams of visiting technology hubs around the world.',
    arabicBiography: 'متحمس للتكنولوجيا يحلم بزيارة مراكز التكنولوجيا حول العالم.',
    travelHistory: [
      {place: 'Cairo, Egypt', year: '2019'},
      {place: 'Alexandria, Egypt', year: '2021'}
    ],
  },
  {
    id: 114,
    name: 'Omar Mohamed Elmowafy',
    arabicName: 'عمر محمد الموافي',
    role: 'Cousin',
    arabicRole: 'ابن العم',
    children: [],
    imageUrl: '/family/omar-mohamed-elmowafy.jpg',
    birthYear: '2008',
    currentLocation: 'Mansoura, Egypt',
    favoriteDestinations: ['Sharm El-Sheikh', 'Istanbul', 'Hurghada'],
    biography: 'Young athlete who loves water sports and beach destinations.',
    arabicBiography: 'رياضي صغير يحب الرياضات المائية والوجهات الشاطئية.',
    travelHistory: [
      {place: 'Sharm El-Sheikh, Egypt', year: '2019'},
      {place: 'Hurghada, Egypt', year: '2021'}
    ],
  },

  // Third branch - Khaled Ali and family
  {
    id: 200,
    name: 'Khaled Ali Elmowafy',
    arabicName: 'خالد علي الموافي',
    role: 'Uncle',
    arabicRole: 'العم',
    children: [210, 211, 212, 213],
    imageUrl: '/family/khaled-ali-elmowafy.jpg',
    birthYear: '1973',
    currentLocation: 'Cairo, Egypt',
    favoriteDestinations: ['Dubai', 'London', 'Aswan'],
    biography: 'Business entrepreneur who combines work with pleasure during his international travels.',
    arabicBiography: 'رجل أعمال يجمع بين العمل والمتعة خلال رحلاته الدولية.',
    travelHistory: [
      {place: 'Dubai, UAE', year: '2018'},
      {place: 'London, UK', year: '2020'},
      {place: 'New York, USA', year: '2022'}
    ],
  },
  {
    id: 201,
    name: 'Shaymaa',
    arabicName: 'شيماء',
    role: 'Aunt',
    arabicRole: 'العمة',
    spouseId: 200,
    imageUrl: '/family/shaymaa.jpg',
    birthYear: '1978',
    currentLocation: 'Cairo, Egypt',
    favoriteDestinations: ['Paris', 'Istanbul', 'Marrakech'],
    biography: 'Fashion designer with an eye for diverse cultural influences in clothing and accessories.',
    arabicBiography: 'مصممة أزياء لديها عين للتأثيرات الثقافية المتنوعة في الملابس والإكسسوارات.',
    travelHistory: [
      {place: 'Paris, France', year: '2018'},
      {place: 'Istanbul, Turkey', year: '2019'},
      {place: 'Marrakech, Morocco', year: '2021'}
    ],
  },
    {
    id: 110,
    name: 'Shahd Elmowafy',
    arabicName: 'شهد الموافي',
    role: 'Cousin',
    arabicRole: 'ابنة العم',
    children: [],
  },
  {
    id: 111,
    name: 'Nada',
    arabicName: 'ندى',
    role: 'Cousin',
    arabicRole: 'ابنة العم',
    children: [],
  },
  {
    id: 112,
    name: 'Yousef',
    arabicName: 'يوسف',
    role: 'Cousin',
    arabicRole: 'ابن العم',
    children: [],
  },
  {
    id: 113,
    name: 'Ali',
    arabicName: 'علي',
    role: 'Cousin',
    arabicRole: 'ابن العم',
    children: [],
  },
  {
    id: 114,
    name: 'Omar',
    arabicName: 'عمر',
    role: 'Cousin',
    arabicRole: 'ابن العم',
    children: [],
  },
  
  // Third branch - Khaled Ali and family
  {
    id: 200,
    name: 'Khaled Ali',
    arabicName: 'خالد علي',
    role: 'Uncle',
    arabicRole: 'العم',
    children: [210, 211, 212, 213],
  },
  {
    id: 201,
    name: 'Shaymaa',
    arabicName: 'شيماء',
    role: 'Aunt',
    arabicRole: 'العمة',
    spouseId: 200,
  },
  
  // Khaled's children
  {
    id: 210,
    name: 'Seif',
    arabicName: 'سيف',
    role: 'Cousin',
    arabicRole: 'ابن العم',
    children: [],
  },
  {
    id: 211,
    name: 'Seela',
    arabicName: 'سيلة',
    role: 'Cousin',
    arabicRole: 'ابنة العم',
    children: [],
  },
  {
    id: 212,
    name: 'Saja',
    arabicName: 'سجى',
    role: 'Cousin',
    arabicRole: 'ابنة العم',
    children: [],
  },
  {
    id: 213,
    name: 'Sanad',
    arabicName: 'سند',
    role: 'Cousin',
    arabicRole: 'ابن العم',
    children: [],
  },
];

// Find family member by ID
const findMember = (id: number) => familyMembers.find(m => m.id === id);

// Find spouse of a family member
const findSpouse = (memberId: number) => {
  const member = findMember(memberId);
  if (member?.spouseId) return findMember(member.spouseId);
  
  // Also check if this member is a spouse of someone else
  const asSpouse = familyMembers.find(m => m.spouseId === memberId);
  if (asSpouse) return findMember(asSpouse.id);
  
  return null;
};

// Component for rendering a family member node
const FamilyMemberNode: React.FC<{
  member: FamilyMember;
  level?: number;
  isExpanded: boolean;
  toggleExpand: () => void;
}> = ({ member, level = 0, isExpanded, toggleExpand }) => {
  const { language } = useLanguage();
  const hasChildren = member.children && member.children.length > 0;
  const spouse = findSpouse(member.id);
  
  return (
    <div className={`p-3 rounded-md ${level === 0 ? 'bg-primary/20' : 'bg-primary/10'}`}>
      <div className="flex items-center gap-3">
        {hasChildren && (
          <button
            onClick={toggleExpand}
            className="rounded-full p-1 hover:bg-primary/20 transition-colors"
          >
            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
        )}
        
        <div className="bg-primary rounded-full p-2">
          <User className="text-white" size={20} />
        </div>
        
        <div className="flex-1">
          <h4 className="font-bold">
            {language === 'en' ? member.name : member.arabicName || member.name}
          </h4>
          <p className="text-sm text-muted-foreground">
            {language === 'en' ? member.role : member.arabicRole}
          </p>
        </div>
      </div>
      
      {spouse && (
        <div className="flex items-center gap-3 mt-2 ml-10 p-2 border-l-2 border-dashed border-primary/30 pl-4">
          <div className="bg-primary/60 rounded-full p-2">
            <User className="text-white" size={20} />
          </div>
          <div>
            <h4 className="font-bold">
              {language === 'en' ? spouse.name : spouse.arabicName || spouse.name}
            </h4>
            <p className="text-sm text-muted-foreground">
              {language === 'en' ? spouse.role : spouse.arabicRole}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// Component for rendering a branch of the family tree
const FamilyBranch: React.FC<{
  memberId: number;
  level?: number;
}> = ({ memberId, level = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(level < 1);
  const member = findMember(memberId);
  
  if (!member) return null;
  
  const childrenObjects = member.children 
    ? member.children.map(id => findMember(id)).filter(Boolean) as FamilyMember[]
    : [];
  
  return (
    <div className="mb-3">
      <FamilyMemberNode
        member={member}
        level={level}
        isExpanded={isExpanded}
        toggleExpand={() => setIsExpanded(!isExpanded)}
      />
      
      {isExpanded && childrenObjects.length > 0 && (
        <div 
          className={cn(
            "border-l-2 border-dashed border-primary/50 ml-6 pl-4 mt-2 space-y-3",
            "animate-accordion-down"
          )}
        >
          {childrenObjects.map((child) => (
            <FamilyBranch 
              key={child.id} 
              memberId={child.id} 
              level={level + 1} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Main Family Tree component
const FamilyTree: React.FC = () => {
  const { language } = useLanguage();
  const rootIds = [1, 100, 200]; // The root family members
  
  return (
    <Card className="w-full shadow-md">
      <CardHeader className="bg-gradient-to-r from-primary to-primary/70 text-white">
        <CardTitle className="flex items-center gap-2">
          <Users />
          {language === 'en' ? 'Elmowafy Family Tree' : 'شجرة عائلة الموافي'}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          {rootIds.map(id => (
            <FamilyBranch key={id} memberId={id} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default FamilyTree;
