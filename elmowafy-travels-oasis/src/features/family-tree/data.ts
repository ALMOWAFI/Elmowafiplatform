import { FamilyMember, FamilyConnection } from './types';

/**
 * Complete data structure of the Elmowafy family
 * This serves as the core data for the family tree visualization
 */

export const familyMembers: FamilyMember[] = [
  // First branch - Ahmed Ali Elmowafy and family
  {
    id: 'ahmed-ali',
    name: 'Ahmed Ali Elmowafy',
    arabicName: 'أحمد علي الموافي',
    profileImage: '/family/ahmed-ali.jpg',
    birthYear: '1965',
    gender: 'male',
    spouseId: 'marwa-hani',
    childrenIds: ['amr-elmowafy', 'ali-elmowafy', 'daughters'],
    bio: 'The patriarch of the Elmowafy family, known for his wisdom and love for family gatherings.',
    arabicBio: 'كبير عائلة الموافي، معروف بحكمته وحبه للتجمعات العائلية.',
    currentLocation: 'Cairo, Egypt',
    favoriteDestinations: ['Alexandria', 'Sharm El-Sheikh', 'Dubai'],
    travelHistory: [
      { locationId: 'mecca', year: '2010', photos: ['/travels/ahmed-mecca-1.jpg', '/travels/ahmed-mecca-2.jpg'] },
      { locationId: 'dubai', year: '2015', photos: ['/travels/ahmed-dubai-1.jpg'] },
      { locationId: 'istanbul', year: '2018', photos: ['/travels/ahmed-istanbul-1.jpg'] }
    ],
    achievements: ['Family Business Founder', 'Community Leader'],
    expanded: true
  },
  {
    id: 'marwa-hani',
    name: 'Marwa Hani',
    arabicName: 'مروة هاني',
    profileImage: '/family/marwa-hani.jpg',
    birthYear: '1968',
    gender: 'female',
    spouseId: 'ahmed-ali',
    bio: 'The matriarch of the family, known for her warmth and excellent cooking skills.',
    arabicBio: 'سيدة العائلة المعروفة بدفئها ومهاراتها الممتازة في الطبخ.',
    currentLocation: 'Cairo, Egypt',
    favoriteDestinations: ['Paris', 'Alexandria', 'Luxor'],
    travelHistory: [
      { locationId: 'mecca', year: '2010', photos: ['/travels/marwa-mecca-1.jpg'] },
      { locationId: 'paris', year: '2016', photos: ['/travels/marwa-paris-1.jpg', '/travels/marwa-paris-2.jpg'] },
      { locationId: 'istanbul', year: '2018', photos: ['/travels/marwa-istanbul-1.jpg'] }
    ],
    achievements: ['Master Chef', 'Family Historian'],
    expanded: true
  },
  
  // Ahmed's children
  {
    id: 'amr-elmowafy',
    name: 'Amr Elmowafy',
    arabicName: 'عمرو الموافي',
    profileImage: '/family/amr-elmowafy.jpg',
    birthYear: '1988',
    gender: 'male',
    parentIds: ['ahmed-ali', 'marwa-hani'],
    bio: 'Entrepreneur and technology enthusiast who loves to explore new cities.',
    arabicBio: 'رجل أعمال ومتحمس للتكنولوجيا يحب استكشاف المدن الجديدة.',
    currentLocation: 'Dubai, UAE',
    favoriteDestinations: ['London', 'New York', 'Tokyo'],
    travelHistory: [
      { locationId: 'london', year: '2019', photos: ['/travels/amr-london-1.jpg'] },
      { locationId: 'new-york', year: '2021', photos: ['/travels/amr-newyork-1.jpg'] },
      { locationId: 'tokyo', year: '2023', photos: ['/travels/amr-tokyo-1.jpg'] }
    ],
    achievements: ['Tech Startup Founder', 'International Business Award 2022'],
    expanded: false
  },
  {
    id: 'ali-elmowafy',
    name: 'Ali Elmowafy',
    arabicName: 'علي الموافي',
    profileImage: '/family/ali-elmowafy.jpg',
    birthYear: '1990',
    gender: 'male',
    parentIds: ['ahmed-ali', 'marwa-hani'],
    childrenIds: ['remas', 'basmala'],
    bio: 'Creative designer with a passion for Mediterranean architecture.',
    arabicBio: 'مصمم مبدع مع شغف بالعمارة المتوسطية.',
    currentLocation: 'Alexandria, Egypt',
    favoriteDestinations: ['Barcelona', 'Rome', 'Beirut'],
    travelHistory: [
      { locationId: 'barcelona', year: '2018', photos: ['/travels/ali-barcelona-1.jpg'] },
      { locationId: 'rome', year: '2020', photos: ['/travels/ali-rome-1.jpg'] },
      { locationId: 'beirut', year: '2022', photos: ['/travels/ali-beirut-1.jpg'] }
    ],
    achievements: ['Architecture Award 2021', 'Design Exhibition Curator'],
    expanded: false
  },
  {
    id: 'daughters',
    name: 'Daughters',
    arabicName: 'البنات',
    gender: 'female',
    parentIds: ['ahmed-ali', 'marwa-hani'],
    bio: 'Ahmed and Marwa\'s daughters, represented as a group.',
    arabicBio: 'بنات أحمد ومروة، ممثلات كمجموعة.',
    expanded: false
  },
  
  // Ali's children
  {
    id: 'remas',
    name: 'Remas',
    arabicName: 'ريماس',
    profileImage: '/family/remas.jpg',
    birthYear: '2012',
    gender: 'female',
    parentIds: ['ali-elmowafy'],
    bio: 'Loves swimming and dreams of becoming a marine biologist.',
    arabicBio: 'تحب السباحة وتحلم بأن تصبح عالمة بيولوجيا بحرية.',
    currentLocation: 'Alexandria, Egypt',
    favoriteDestinations: ['Disney Paris', 'Barcelona', 'Cairo'],
    travelHistory: [
      { locationId: 'barcelona', year: '2018', photos: ['/travels/remas-barcelona-1.jpg'] },
      { locationId: 'paris', year: '2020', photos: ['/travels/remas-paris-1.jpg'] }
    ],
    achievements: ['Junior Swimming Champion 2022', 'Science Fair Winner'],
    expanded: false
  },
  {
    id: 'basmala',
    name: 'Basmala',
    arabicName: 'بسملة',
    profileImage: '/family/basmala.jpg',
    birthYear: '2014',
    gender: 'female',
    parentIds: ['ali-elmowafy'],
    bio: 'Artist in the making, loves drawing and painting landscapes.',
    arabicBio: 'فنانة في طور التكوين، تحب الرسم وتلوين المناظر الطبيعية.',
    currentLocation: 'Alexandria, Egypt',
    favoriteDestinations: ['London', 'Cairo Zoo', 'Sharm El-Sheikh'],
    travelHistory: [
      { locationId: 'sharm', year: '2019', photos: ['/travels/basmala-sharm-1.jpg'] },
      { locationId: 'london', year: '2021', photos: ['/travels/basmala-london-1.jpg'] }
    ],
    achievements: ['Children\'s Art Competition Winner', 'School Art Exhibition'],
    expanded: false
  },
  
  // Second branch - Mohamed Elmowafy and family
  {
    id: 'mohamed-elmowafy',
    name: 'Mohamed Elmowafy',
    arabicName: 'محمد الموافي',
    profileImage: '/family/mohamed-elmowafy.jpg',
    birthYear: '1970',
    gender: 'male',
    spouseId: 'hala-el-shorbini',
    childrenIds: ['shahd-elmowafy', 'nada-elmowafy', 'youssef-elmowafy', 'ali-mohamed-elmowafy', 'omar-mohamed-elmowafy'],
    bio: 'Respected physician and family health advisor who enjoys historical sites.',
    arabicBio: 'طبيب محترم ومستشار صحي للعائلة يستمتع بزيارة المواقع التاريخية.',
    currentLocation: 'Mansoura, Egypt',
    favoriteDestinations: ['Istanbul', 'Riyadh', 'Beirut'],
    travelHistory: [
      { locationId: 'istanbul', year: '2017', photos: ['/travels/mohamed-istanbul-1.jpg'] },
      { locationId: 'riyadh', year: '2019', photos: ['/travels/mohamed-riyadh-1.jpg'] },
      { locationId: 'beirut', year: '2022', photos: ['/travels/mohamed-beirut-1.jpg'] }
    ],
    achievements: ['Medical Excellence Award', 'Research Publication 2020'],
    expanded: true
  },
  {
    id: 'hala-el-shorbini',
    name: 'Hala El-Shorbini',
    arabicName: 'هالة الشربيني',
    profileImage: '/family/hala-elshorbini.jpg',
    birthYear: '1975',
    gender: 'female',
    spouseId: 'mohamed-elmowafy',
    bio: 'Talented pianist and music teacher who organized many family cultural trips.',
    arabicBio: 'عازفة بيانو موهوبة ومعلمة موسيقى نظمت العديد من الرحلات الثقافية العائلية.',
    currentLocation: 'Mansoura, Egypt',
    favoriteDestinations: ['Vienna', 'Dubai', 'Alexandria'],
    travelHistory: [
      { locationId: 'vienna', year: '2017', photos: ['/travels/hala-vienna-1.jpg'] },
      { locationId: 'dubai', year: '2020', photos: ['/travels/hala-dubai-1.jpg'] },
      { locationId: 'cairo', year: '2021', photos: ['/travels/hala-cairo-1.jpg'] }
    ],
    achievements: ['Classical Music Award', 'Cultural Exchange Program Leader'],
    expanded: true
  },
  
  // Mohamed's children
  {
    id: 'shahd-elmowafy',
    name: 'Shahd Elmowafy',
    arabicName: 'شهد الموافي',
    profileImage: '/family/shahd-elmowafy.jpg',
    birthYear: '1998',
    gender: 'female',
    parentIds: ['mohamed-elmowafy', 'hala-el-shorbini'],
    bio: 'Medical student following her father\'s footsteps and passionate about humanitarian travels.',
    arabicBio: 'طالبة طب تتبع خطى والدها ولديها شغف بالرحلات الإنسانية.',
    currentLocation: 'Cairo, Egypt',
    favoriteDestinations: ['Paris', 'Istanbul', 'Alexandria'],
    travelHistory: [
      { locationId: 'paris', year: '2018', photos: ['/travels/shahd-paris-1.jpg'] },
      { locationId: 'istanbul', year: '2021', photos: ['/travels/shahd-istanbul-1.jpg'] }
    ],
    achievements: ['Medical Student of the Year', 'Volunteer Medical Mission'],
    expanded: false
  },
  {
    id: 'nada-elmowafy',
    name: 'Nada Elmowafy',
    arabicName: 'ندى الموافي',
    profileImage: '/family/nada-elmowafy.jpg',
    birthYear: '2000',
    gender: 'female',
    parentIds: ['mohamed-elmowafy', 'hala-el-shorbini'],
    bio: 'Music enthusiast who inherited her mother\'s piano skills and loves cultural exchanges.',
    arabicBio: 'عاشقة للموسيقى ورثت مهارات البيانو من والدتها وتحب التبادل الثقافي.',
    currentLocation: 'Mansoura, Egypt',
    favoriteDestinations: ['Barcelona', 'Dubai', 'Aswan'],
    travelHistory: [
      { locationId: 'barcelona', year: '2019', photos: ['/travels/nada-barcelona-1.jpg'] },
      { locationId: 'dubai', year: '2022', photos: ['/travels/nada-dubai-1.jpg'] }
    ],
    achievements: ['Piano Competition Winner', 'International Cultural Exchange Program'],
    expanded: false
  },
  {
    id: 'youssef-elmowafy',
    name: 'Youssef Elmowafy',
    arabicName: 'يوسف الموافي',
    profileImage: '/family/youssef-elmowafy.jpg',
    birthYear: '2003',
    gender: 'male',
    parentIds: ['mohamed-elmowafy', 'hala-el-shorbini'],
    bio: 'Engineering student with a passion for ancient architecture and historical sites.',
    arabicBio: 'طالب هندسة لديه شغف بالعمارة القديمة والمواقع التاريخية.',
    currentLocation: 'Mansoura, Egypt',
    favoriteDestinations: ['Rome', 'London', 'Luxor'],
    travelHistory: [
      { locationId: 'rome', year: '2018', photos: ['/travels/youssef-rome-1.jpg'] },
      { locationId: 'london', year: '2020', photos: ['/travels/youssef-london-1.jpg'] }
    ],
    achievements: ['Engineering Design Competition', 'Academic Excellence Award'],
    expanded: false
  },
  {
    id: 'ali-mohamed-elmowafy',
    name: 'Ali Mohamed Elmowafy',
    arabicName: 'علي محمد الموافي',
    profileImage: '/family/ali-mohamed-elmowafy.jpg',
    birthYear: '2006',
    gender: 'male',
    parentIds: ['mohamed-elmowafy', 'hala-el-shorbini'],
    bio: 'Tech enthusiast who dreams of visiting technology hubs around the world.',
    arabicBio: 'متحمس للتكنولوجيا يحلم بزيارة مراكز التكنولوجيا حول العالم.',
    currentLocation: 'Mansoura, Egypt',
    favoriteDestinations: ['Tokyo', 'Cairo', 'Alexandria'],
    travelHistory: [
      { locationId: 'cairo', year: '2019', photos: ['/travels/ali-m-cairo-1.jpg'] },
      { locationId: 'alexandria', year: '2021', photos: ['/travels/ali-m-alexandria-1.jpg'] }
    ],
    achievements: ['Coding Competition Winner', 'Science Fair Robotics Award'],
    expanded: false
  },
  {
    id: 'omar-mohamed-elmowafy',
    name: 'Omar Mohamed Elmowafy',
    arabicName: 'عمر محمد الموافي',
    profileImage: '/family/omar-mohamed-elmowafy.jpg',
    birthYear: '2008',
    gender: 'male',
    parentIds: ['mohamed-elmowafy', 'hala-el-shorbini'],
    bio: 'Young athlete who loves water sports and beach destinations.',
    arabicBio: 'رياضي صغير يحب الرياضات المائية والوجهات الشاطئية.',
    currentLocation: 'Mansoura, Egypt',
    favoriteDestinations: ['Sharm El-Sheikh', 'Istanbul', 'Hurghada'],
    travelHistory: [
      { locationId: 'sharm', year: '2019', photos: ['/travels/omar-sharm-1.jpg'] },
      { locationId: 'hurghada', year: '2021', photos: ['/travels/omar-hurghada-1.jpg'] }
    ],
    achievements: ['Junior Swimming Champion', 'School Sports MVP'],
    expanded: false
  },

  // Third branch - Khaled Ali and family
  {
    id: 'khaled-ali',
    name: 'Khaled Ali Elmowafy',
    arabicName: 'خالد علي الموافي',
    profileImage: '/family/khaled-ali-elmowafy.jpg',
    birthYear: '1973',
    gender: 'male',
    spouseId: 'shaymaa',
    childrenIds: ['seif', 'selsabila', 'saga', 'sanad'],
    bio: 'Business entrepreneur who combines work with pleasure during his international travels.',
    arabicBio: 'رجل أعمال يجمع بين العمل والمتعة خلال رحلاته الدولية.',
    currentLocation: 'Cairo, Egypt',
    favoriteDestinations: ['Dubai', 'London', 'Aswan'],
    travelHistory: [
      { locationId: 'dubai', year: '2018', photos: ['/travels/khaled-dubai-1.jpg'] },
      { locationId: 'london', year: '2020', photos: ['/travels/khaled-london-1.jpg'] },
      { locationId: 'new-york', year: '2022', photos: ['/travels/khaled-newyork-1.jpg'] }
    ],
    achievements: ['Business Leadership Award', 'Corporate Excellence Recognition'],
    expanded: true
  },
  {
    id: 'shaymaa',
    name: 'Shaymaa',
    arabicName: 'شيماء',
    profileImage: '/family/shaymaa.jpg',
    birthYear: '1978',
    gender: 'female',
    spouseId: 'khaled-ali',
    bio: 'Fashion designer with an eye for diverse cultural influences in clothing and accessories.',
    arabicBio: 'مصممة أزياء لديها عين للتأثيرات الثقافية المتنوعة في الملابس والإكسسوارات.',
    currentLocation: 'Cairo, Egypt',
    favoriteDestinations: ['Paris', 'Istanbul', 'Marrakech'],
    travelHistory: [
      { locationId: 'paris', year: '2018', photos: ['/travels/shaymaa-paris-1.jpg'] },
      { locationId: 'istanbul', year: '2019', photos: ['/travels/shaymaa-istanbul-1.jpg'] },
      { locationId: 'marrakech', year: '2021', photos: ['/travels/shaymaa-marrakech-1.jpg'] }
    ],
    achievements: ['Fashion Design Award', 'International Exhibition Participant'],
    expanded: true
  },
  
  // Khaled's children
  {
    id: 'seif',
    name: 'Seif',
    arabicName: 'سيف',
    profileImage: '/family/seif.jpg',
    birthYear: '2005',
    gender: 'male',
    parentIds: ['khaled-ali', 'shaymaa'],
    bio: 'Aspiring filmmaker documenting the family\'s travels through his creative lens.',
    arabicBio: 'مخرج طموح يوثق رحلات العائلة من خلال عدسته الإبداعية.',
    currentLocation: 'Cairo, Egypt',
    favoriteDestinations: ['Los Angeles', 'Tokyo', 'London'],
    travelHistory: [
      { locationId: 'london', year: '2020', photos: ['/travels/seif-london-1.jpg'] },
      { locationId: 'los-angeles', year: '2022', photos: ['/travels/seif-la-1.jpg'] }
    ],
    achievements: ['Youth Film Festival Winner', 'Digital Content Creator Award'],
    expanded: false
  },
  {
    id: 'selsabila',
    name: 'Selsabila',
    arabicName: 'سلسبيلة',
    profileImage: '/family/selsabila.jpg',
    birthYear: '2007',
    gender: 'female',
    parentIds: ['khaled-ali', 'shaymaa'],
    bio: 'Young fashion enthusiast following in her mother\'s creative footsteps.',
    arabicBio: 'مهتمة بالموضة الشابة تتبع خطوات والدتها الإبداعية.',
    currentLocation: 'Cairo, Egypt',
    favoriteDestinations: ['Milan', 'Paris', 'Dubai'],
    travelHistory: [
      { locationId: 'paris', year: '2019', photos: ['/travels/selsabila-paris-1.jpg'] },
      { locationId: 'milan', year: '2021', photos: ['/travels/selsabila-milan-1.jpg'] }
    ],
    achievements: ['Junior Fashion Design Award', 'School Art Exhibition'],
    expanded: false
  },
  {
    id: 'saga',
    name: 'Saga',
    arabicName: 'سجى',
    profileImage: '/family/saga.jpg',
    birthYear: '2010',
    gender: 'female',
    parentIds: ['khaled-ali', 'shaymaa'],
    bio: 'Talented young artist who loves to capture travel memories through paintings.',
    arabicBio: 'فنانة شابة موهوبة تحب التقاط ذكريات السفر من خلال اللوحات.',
    currentLocation: 'Cairo, Egypt',
    favoriteDestinations: ['Barcelona', 'Rome', 'Alexandria'],
    travelHistory: [
      { locationId: 'rome', year: '2019', photos: ['/travels/saga-rome-1.jpg'] },
      { locationId: 'barcelona', year: '2021', photos: ['/travels/saga-barcelona-1.jpg'] }
    ],
    achievements: ['Children\'s Art Competition', 'School Exhibition Featured Artist'],
    expanded: false
  },
  {
    id: 'sanad',
    name: 'Sanad',
    arabicName: 'سند',
    profileImage: '/family/sanad.jpg',
    birthYear: '2012',
    gender: 'male',
    parentIds: ['khaled-ali', 'shaymaa'],
    bio: 'Energetic youngster with a passion for exploring nature and wildlife during travels.',
    arabicBio: 'شاب نشيط لديه شغف باستكشاف الطبيعة والحياة البرية أثناء السفر.',
    currentLocation: 'Cairo, Egypt',
    favoriteDestinations: ['Safari Parks', 'Hurghada', 'Luxor'],
    travelHistory: [
      { locationId: 'hurghada', year: '2020', photos: ['/travels/sanad-hurghada-1.jpg'] },
      { locationId: 'luxor', year: '2022', photos: ['/travels/sanad-luxor-1.jpg'] }
    ],
    achievements: ['Junior Nature Photography Award', 'Science Fair Winner'],
    expanded: false
  }
];

// Generate family connections automatically from the family members data
export const generateFamilyConnections = (): FamilyConnection[] => {
  const connections: FamilyConnection[] = [];
  
  // Process each family member to create connections
  familyMembers.forEach(member => {
    // Create spouse connections
    if (member.spouseId) {
      connections.push({
        id: `spouse-${member.id}-${member.spouseId}`,
        type: 'spouse',
        sourceId: member.id,
        targetId: member.spouseId,
        isExpanded: member.expanded
      });
    }
    
    // Create parent-child connections
    if (member.childrenIds && member.childrenIds.length > 0) {
      member.childrenIds.forEach(childId => {
        connections.push({
          id: `parent-child-${member.id}-${childId}`,
          type: 'parent-child',
          sourceId: member.id,
          targetId: childId,
          isExpanded: member.expanded
        });
      });
    }
    
    // Create sibling connections (optional, can make the visualization cluttered)
    if (member.parentIds && member.parentIds.length > 0) {
      const siblings = familyMembers.filter(
        m => m.id !== member.id && 
        m.parentIds && 
        m.parentIds.some(pid => member.parentIds!.includes(pid))
      );
      
      siblings.forEach(sibling => {
        // Only create connection in one direction to avoid duplicates
        if (member.id < sibling.id) {
          connections.push({
            id: `sibling-${member.id}-${sibling.id}`,
            type: 'sibling',
            sourceId: member.id,
            targetId: sibling.id,
            isExpanded: member.expanded && sibling.expanded
          });
        }
      });
    }
  });
  
  return connections;
};

export const familyConnections = generateFamilyConnections();
