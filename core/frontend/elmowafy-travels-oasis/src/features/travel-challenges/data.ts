import { Challenge, Badge, Achievement, PlayerProfile, Team } from './types';

/**
 * Sample challenges for the Elmowafy family travel platform
 * These serve as examples and can be extended with real data
 */

export const sampleChallenges: Challenge[] = [
  {
    id: 'istanbul-treasure-hunt-2025',
    title: 'Istanbul Treasure Hunt',
    arabicTitle: 'البحث عن الكنز في اسطنبول',
    description: 'Follow the clues to discover hidden gems in Istanbul\'s historic districts.',
    arabicDescription: 'اتبع الأدلة لاكتشاف الكنوز المخفية في أحياء اسطنبول التاريخية.',
    type: 'treasure-hunt',
    createdBy: 'ahmed-ali',
    tripId: 'istanbul-summer-2025',
    status: 'upcoming',
    startDate: '2025-07-15',
    endDate: '2025-07-17',
    points: 1000,
    teams: [
      {
        id: 'team-explorers',
        name: 'The Explorers',
        arabicName: 'المستكشفون',
        members: ['amr-elmowafy', 'remas', 'nada-elmowafy'],
        color: '#FF5733',
        score: 0,
        completedTasks: [],
        avatarUrl: '/teams/explorers.png'
      },
      {
        id: 'team-adventurers',
        name: 'The Adventurers',
        arabicName: 'المغامرون',
        members: ['ali-elmowafy', 'basmala', 'youssef-elmowafy'],
        color: '#33A1FF',
        score: 0,
        completedTasks: [],
        avatarUrl: '/teams/adventurers.png'
      }
    ],
    locations: [
      {
        id: 'hagia-sophia',
        name: 'Hagia Sophia',
        arabicName: 'آيا صوفيا',
        latitude: 41.008587,
        longitude: 28.980176,
        hint: 'Once a church, once a mosque, now a museum. Find the ancient graffiti.',
        arabicHint: 'كانت كنيسة ذات مرة، ثم أصبحت مسجدًا، والآن متحف. ابحث عن الكتابات القديمة على الجدران.',
        imageUrl: '/locations/hagia-sophia.jpg'
      },
      {
        id: 'spice-bazaar',
        name: 'Spice Bazaar',
        arabicName: 'سوق التوابل',
        latitude: 41.016680,
        longitude: 28.970697,
        hint: 'Colors and aromas fill the air. Find the merchant with the rarest saffron.',
        arabicHint: 'الألوان والروائح تملأ الهواء. ابحث عن التاجر الذي يملك أندر أنواع الزعفران.',
        imageUrl: '/locations/spice-bazaar.jpg'
      },
      {
        id: 'galata-tower',
        name: 'Galata Tower',
        arabicName: 'برج غالاتا',
        latitude: 41.025652,
        longitude: 28.974158,
        hint: 'Climb to where Hezarfen Ahmed Çelebi began his legendary flight.',
        arabicHint: 'اصعد إلى حيث بدأ هزارفن أحمد جلبي رحلته الأسطورية.',
        imageUrl: '/locations/galata-tower.jpg'
      }
    ],
    clues: [
      {
        id: 'clue-1',
        text: 'Start your journey where east meets west, and wisdom stands tall.',
        arabicText: 'ابدأ رحلتك حيث يلتقي الشرق بالغرب، وتقف الحكمة شامخة.',
        isRevealed: true,
        order: 1
      },
      {
        id: 'clue-2',
        text: 'Follow the scent of exotic spices to find the second clue.',
        arabicText: 'اتبع رائحة التوابل الغريبة للعثور على الدليل الثاني.',
        isRevealed: false,
        requiresPassword: true,
        password: 'sophia',
        order: 2
      },
      {
        id: 'clue-3',
        text: 'The final treasure awaits at the tower where a man once dreamed of flying.',
        arabicText: 'الكنز النهائي ينتظر عند البرج حيث حلم رجل ذات مرة بالطيران.',
        isRevealed: false,
        requiresPassword: true,
        password: 'saffron',
        order: 3
      }
    ],
    judgeId: 'ahmed-ali',
    rules: 'Teams must take photos at each location as proof. All team members must be present in the photo. The first team to collect all clues and reach the final location wins.',
    arabicRules: 'يجب على الفرق التقاط صور في كل موقع كدليل. يجب أن يكون جميع أعضاء الفريق موجودين في الصورة. الفريق الأول الذي يجمع كل الأدلة ويصل إلى الموقع النهائي يفوز.'
  },
  {
    id: 'cairo-mafia-night-2025',
    title: 'Cairo Mafia Night',
    arabicTitle: 'ليلة المافيا في القاهرة',
    description: 'An evening of deception and strategy. Can you identify the Mafia members?',
    arabicDescription: 'أمسية من الخداع والاستراتيجية. هل يمكنك التعرف على أعضاء المافيا؟',
    type: 'mafia',
    createdBy: 'marwa-hani',
    tripId: 'cairo-winter-2025',
    status: 'upcoming',
    startDate: '2025-12-25',
    endDate: '2025-12-25',
    points: 500,
    teams: [],
    judgeId: 'marwa-hani',
    rules: 'Standard Mafia game rules apply. The game will be hosted at the family house after dinner.',
    arabicRules: 'تطبق قواعد لعبة المافيا القياسية. ستُقام اللعبة في منزل العائلة بعد العشاء.'
  },
  {
    id: 'alexandria-photo-challenge-2024',
    title: 'Alexandria Photo Challenge',
    arabicTitle: 'تحدي الصور في الإسكندرية',
    description: 'Capture the beauty of Alexandria through your camera lens.',
    arabicDescription: 'التقط جمال الإسكندرية من خلال عدسة الكاميرا.',
    type: 'photo-challenge',
    createdBy: 'ali-elmowafy',
    tripId: 'alexandria-spring-2024',
    status: 'completed',
    startDate: '2024-04-10',
    endDate: '2024-04-12',
    points: 750,
    teams: [
      {
        id: 'team-shutterbugs',
        name: 'The Shutterbugs',
        arabicName: 'مصورو اللحظة',
        members: ['ali-elmowafy', 'remas', 'sanad'],
        color: '#4CAF50',
        score: 620,
        completedTasks: ['montazah-palace', 'bibliotheca-alexandria', 'qaitbay-citadel'],
        avatarUrl: '/teams/shutterbugs.png'
      },
      {
        id: 'team-lens-masters',
        name: 'Lens Masters',
        arabicName: 'أساتذة العدسة',
        members: ['shahd-elmowafy', 'youssef-elmowafy', 'saga'],
        color: '#9C27B0',
        score: 580,
        completedTasks: ['montazah-palace', 'bibliotheca-alexandria', 'qaitbay-citadel'],
        avatarUrl: '/teams/lens-masters.png'
      }
    ],
    locations: [
      {
        id: 'bibliotheca-alexandria',
        name: 'Bibliotheca Alexandrina',
        arabicName: 'مكتبة الإسكندرية',
        latitude: 31.208956,
        longitude: 29.909580,
        hint: 'Capture the modern architecture that houses ancient knowledge.',
        arabicHint: 'التقط الهندسة المعمارية الحديثة التي تحتضن المعرفة القديمة.',
        imageUrl: '/locations/bibliotheca-alexandria.jpg'
      },
      {
        id: 'qaitbay-citadel',
        name: 'Qaitbay Citadel',
        arabicName: 'قلعة قايتباي',
        latitude: 31.214290,
        longitude: 29.885352,
        hint: 'Find the perfect angle to capture this fortress by the sea.',
        arabicHint: 'ابحث عن الزاوية المثالية لالتقاط هذه القلعة بجانب البحر.',
        imageUrl: '/locations/qaitbay-citadel.jpg'
      },
      {
        id: 'montazah-palace',
        name: 'Montazah Palace',
        arabicName: 'قصر المنتزه',
        latitude: 31.288721,
        longitude: 30.011461,
        hint: 'Blend the royal architecture with the Mediterranean blue.',
        arabicHint: 'امزج العمارة الملكية مع زرقة البحر المتوسط.',
        imageUrl: '/locations/montazah-palace.jpg'
      }
    ],
    judgeId: 'mohamed-elmowafy'
  }
];

export const sampleBadges: Badge[] = [
  {
    id: 'treasure-hunter',
    name: 'Treasure Hunter',
    arabicName: 'صياد الكنوز',
    description: 'Awarded for completing 3 treasure hunt challenges',
    arabicDescription: 'تُمنح لإكمال 3 تحديات في البحث عن الكنوز',
    imageUrl: '/badges/treasure-hunter.png',
    dateEarned: '2024-04-12'
  },
  {
    id: 'team-captain',
    name: 'Team Captain',
    arabicName: 'كابتن الفريق',
    description: 'Led a team to victory in a family challenge',
    arabicDescription: 'قاد فريق للفوز في تحدي عائلي',
    imageUrl: '/badges/team-captain.png',
    dateEarned: '2024-01-15'
  },
  {
    id: 'puzzle-master',
    name: 'Puzzle Master',
    arabicName: 'سيد الألغاز',
    description: 'Solved 10 difficult clues across multiple challenges',
    arabicDescription: 'حل 10 أدلة صعبة عبر تحديات متعددة',
    imageUrl: '/badges/puzzle-master.png',
    dateEarned: '2023-12-20'
  },
  {
    id: 'photographer',
    name: 'Master Photographer',
    arabicName: 'المصور الماهر',
    description: 'Won a photo challenge with exceptional photography skills',
    arabicDescription: 'فاز بتحدي التصوير بمهارات تصوير استثنائية',
    imageUrl: '/badges/photographer.png',
    dateEarned: '2024-04-12'
  },
  {
    id: 'detective',
    name: 'Family Detective',
    arabicName: 'محقق العائلة',
    description: 'Successfully identified all mafia members in 3 games',
    arabicDescription: 'نجح في تحديد جميع أعضاء المافيا في 3 ألعاب',
    imageUrl: '/badges/detective.png',
    dateEarned: '2023-08-05'
  }
];

export const sampleAchievements: Achievement[] = [
  {
    id: 'global-explorer',
    name: 'Global Explorer',
    arabicName: 'مستكشف عالمي',
    description: 'Participated in challenges on 3 different continents',
    arabicDescription: 'شارك في تحديات على 3 قارات مختلفة',
    points: 1000,
    dateEarned: '2024-05-01',
    imageUrl: '/achievements/global-explorer.png'
  },
  {
    id: 'challenge-creator',
    name: 'Challenge Creator',
    arabicName: 'مبتكر التحديات',
    description: 'Created 5 unique family challenges',
    arabicDescription: 'ابتكر 5 تحديات عائلية فريدة',
    points: 750,
    dateEarned: '2024-03-15',
    imageUrl: '/achievements/challenge-creator.png'
  },
  {
    id: 'quick-solver',
    name: 'Quick Solver',
    arabicName: 'الحلال السريع',
    description: 'Completed a treasure hunt in record time',
    arabicDescription: 'أكمل البحث عن الكنز في وقت قياسي',
    points: 500,
    dateEarned: '2023-11-20',
    imageUrl: '/achievements/quick-solver.png'
  }
];

export const samplePlayerProfiles: PlayerProfile[] = [
  {
    familyMemberId: 'ali-elmowafy',
    totalPoints: 3250,
    badges: [
      {
        id: 'team-captain',
        name: 'Team Captain',
        arabicName: 'كابتن الفريق',
        description: 'Led a team to victory in a family challenge',
        arabicDescription: 'قاد فريق للفوز في تحدي عائلي',
        imageUrl: '/badges/team-captain.png',
        dateEarned: '2023-07-15'
      },
      {
        id: 'photographer',
        name: 'Master Photographer',
        arabicName: 'المصور الماهر',
        description: 'Won a photo challenge with exceptional photography skills',
        arabicDescription: 'فاز بتحدي التصوير بمهارات تصوير استثنائية',
        imageUrl: '/badges/photographer.png',
        dateEarned: '2024-04-12'
      }
    ],
    completedChallenges: ['alexandria-photo-challenge-2024', 'dubai-puzzle-2023'],
    achievements: [
      {
        id: 'challenge-creator',
        name: 'Challenge Creator',
        arabicName: 'مبتكر التحديات',
        description: 'Created 5 unique family challenges',
        arabicDescription: 'ابتكر 5 تحديات عائلية فريدة',
        points: 750,
        dateEarned: '2024-03-15',
        imageUrl: '/achievements/challenge-creator.png'
      }
    ],
    level: 8,
    rank: 'Challenge Master'
  },
  {
    familyMemberId: 'remas',
    totalPoints: 1850,
    badges: [
      {
        id: 'treasure-hunter',
        name: 'Treasure Hunter',
        arabicName: 'صياد الكنوز',
        description: 'Awarded for completing 3 treasure hunt challenges',
        arabicDescription: 'تُمنح لإكمال 3 تحديات في البحث عن الكنوز',
        imageUrl: '/badges/treasure-hunter.png',
        dateEarned: '2024-02-12'
      }
    ],
    completedChallenges: ['alexandria-photo-challenge-2024', 'cairo-quiz-2023'],
    achievements: [
      {
        id: 'quick-solver',
        name: 'Quick Solver',
        arabicName: 'الحلال السريع',
        description: 'Completed a treasure hunt in record time',
        arabicDescription: 'أكمل البحث عن الكنز في وقت قياسي',
        points: 500,
        dateEarned: '2023-12-20',
        imageUrl: '/achievements/quick-solver.png'
      }
    ],
    level: 5,
    rank: 'Adventure Explorer'
  }
];
