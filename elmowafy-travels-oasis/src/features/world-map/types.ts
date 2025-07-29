/**
 * Types for the 3D World Map feature
 */

export interface TravelLocation {
  id: string;
  name: string;
  nameAr?: string; // Alternative to arabicName
  arabicName?: string;
  coordinates: [number, number]; // [longitude, latitude]
  date: string;
  description: string;
  descriptionAr?: string; // Alternative to arabicDescription
  arabicDescription?: string;
  type?: 'visited' | 'home' | 'planned';
  photos?: string[];
  images?: string[];
  travelers?: string[]; // IDs of family members who traveled here
  familyMembers?: string[]; // Alternative to travelers
  highlights?: string[];
  rating?: number; // Family rating 1-5
  isHomeLocation?: boolean;
}

export interface TravelRoute {
  id: string;
  name: string;
  arabicName: string;
  startLocationId: string;
  endLocationId: string;
  date: string;
  transportMode: 'flight' | 'car' | 'train' | 'ship' | 'other';
  duration: string; // e.g. "3h 25m"
  travelersIds: string[];
}

export interface GlobeControlsProps {
  autoRotate: boolean;
  enableZoom: boolean;
  enablePan: boolean;
  rotationSpeed: number;
  maxDistance: number;
  minDistance: number;
  onGlobeClick?: (event: any) => void;
}

export interface MarkerProps {
  id: string;
  position: [number, number, number];
  scale: number;
  color: string;
  location: TravelLocation;
  onSelect: (location: TravelLocation) => void;
  pulse?: boolean;
}

export interface TimelineFilterProps {
  startYear: number;
  endYear: number;
  selectedYears: number[];
  onYearRangeChange: (start: number, end: number) => void;
  onYearSelect: (year: number) => void;
}

export interface LocationFilterProps {
  types: ('visited' | 'home' | 'planned')[];
  selectedTypes: ('visited' | 'home' | 'planned')[];
  onFilterChange: (types: ('visited' | 'home' | 'planned')[]) => void;
}

export interface TravelerFilterProps {
  travelers: string[]; // IDs of family members
  selectedTravelers: string[];
  onFilterChange: (travelers: string[]) => void;
}

export type ViewMode = 'globe' | 'map' | 'timeline';

/**
 * Interface for travel path visualization (arcs between locations)
 */
export interface TravelPath {
  id: string;
  from: [number, number]; // [longitude, latitude] of start location
  to: [number, number]; // [longitude, latitude] of end location
  color: string;
  animationDuration?: number;
  date?: string;
  travelers?: string[];
}
