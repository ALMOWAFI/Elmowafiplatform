/**
 * Types for the Family Tree feature
 */

export interface FamilyMember {
  id: string;
  name: string;
  arabicName: string;
  profileImage?: string;
  birthYear?: string;
  gender: 'male' | 'female';
  spouseId?: string;
  parentIds?: string[];
  childrenIds?: string[];
  bio?: string;
  arabicBio?: string;
  currentLocation?: string;
  favoriteDestinations?: string[];
  travelHistory?: {
    locationId: string;
    year: string;
    photos?: string[];
  }[];
  achievements?: string[];
  expanded?: boolean;
}

export interface FamilyConnection {
  id: string;
  type: 'spouse' | 'parent-child' | 'sibling';
  sourceId: string;
  targetId: string;
  isExpanded?: boolean;
}

export interface FamilyTreeLayoutOptions {
  orientation: 'horizontal' | 'vertical';
  nodeSize: number;
  nodePadding: number;
  showProfileImages: boolean;
  showTravelHistory: boolean;
  compactMode: boolean;
  highlightedMemberId?: string;
  searchQuery?: string;
  expandedNodeIds: string[];
}

export interface FamilyTreeFilterOptions {
  generation?: number;
  branch?: 'all' | 'ahmed' | 'mohamed' | 'khaled';
  minYear?: number;
  maxYear?: number;
  includeSpouses: boolean;
  onlyShowWithPhotos: boolean;
  locationFilter?: string[];
}

export interface FamilyMemberNodeProps {
  member: FamilyMember;
  level: number;
  isExpanded: boolean;
  isHighlighted: boolean;
  isSearchResult: boolean;
  isRoot: boolean;
  onExpand: (id: string) => void;
  onSelect: (id: string) => void;
  layoutOptions: FamilyTreeLayoutOptions;
}
