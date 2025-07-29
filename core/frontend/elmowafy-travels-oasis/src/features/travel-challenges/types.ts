import { FamilyMember } from '../family-tree/types';

export type ChallengeType = 'treasure-hunt' | 'mafia' | 'among-us' | 'quiz' | 'photo-challenge' | 'custom';

export type ChallengeStatus = 'upcoming' | 'active' | 'completed';

export type ChallengeLocation = {
  id: string;
  name: string;
  arabicName: string;
  latitude: number;
  longitude: number;
  address?: string;
  hint?: string;
  arabicHint?: string;
  imageUrl?: string;
};

export type Challenge = {
  id: string;
  title: string;
  arabicTitle: string;
  description: string;
  arabicDescription: string;
  type: ChallengeType;
  createdBy: string;  // ID of the family member who created it
  tripId: string;     // Associated with a specific trip
  status: ChallengeStatus;
  startDate: string;
  endDate: string;
  points: number;     // Total points available for this challenge
  teams: Team[];      // Teams participating in this challenge
  locations?: ChallengeLocation[];  // For treasure hunts
  clues?: Clue[];     // For puzzle-based challenges
  judgeId?: string;   // ID of the family member who will judge the challenge
  rules?: string;     // Custom rules for the challenge
  arabicRules?: string;
};

export type Team = {
  id: string;
  name: string;
  arabicName: string;
  members: string[];  // Array of family member IDs
  color: string;      // Color representation for the team
  score: number;      // Team's current score in the challenge
  completedTasks: string[]; // IDs of completed tasks or checkpoints
  avatarUrl?: string; // Team avatar image
};

export type Clue = {
  id: string;
  text: string;
  arabicText: string;
  imageUrl?: string;
  locationId?: string; // If the clue is tied to a location
  isRevealed: boolean;
  requiresPassword?: boolean;
  password?: string;   // Password to unlock the next clue
  order: number;       // Sequence order of the clue
};

export type ChallengeActivity = {
  id: string;
  challengeId: string;
  teamId: string;
  activityType: 'clue-solved' | 'location-found' | 'task-completed' | 'bonus-earned';
  timestamp: string;
  points: number;
  details?: string;
  evidenceImageUrl?: string;
};

export type PlayerProfile = {
  familyMemberId: string;
  totalPoints: number;
  badges: Badge[];
  completedChallenges: string[];  // IDs of completed challenges
  achievements: Achievement[];    // Special achievements earned
  level: number;                  // Player level based on points
  rank: string;                   // Player rank (Novice, Explorer, Master, etc.)
};

export type Badge = {
  id: string;
  name: string;
  arabicName: string;
  description: string;
  arabicDescription: string;
  imageUrl: string;
  dateEarned: string;
};

export type Achievement = {
  id: string;
  name: string;
  arabicName: string;
  description: string;
  arabicDescription: string;
  points: number;
  dateEarned: string;
  imageUrl: string;
};
