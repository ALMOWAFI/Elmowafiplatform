export interface FamilyMember {
  id: string;
  name: string;
  arabicName: string;
  birthDate: string;
  gender?: 'male' | 'female' | 'other';
  email?: string;
  phone?: string;
  address?: string;
  bio?: string;
  profileImage?: string;
  isAlive?: boolean;
  deathDate?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: {
    [key: string]: any;
  };
}

export enum RelationshipType {
  CHILD = 'child',
  PARENT = 'parent',
  SPOUSE = 'spouse',
  SIBLING = 'sibling'
}

export interface FamilyRelationship {
  from: string; // ID of the first family member
  to: string;    // ID of the second family member
  type: RelationshipType;
}

export interface FamilyData {
  members: FamilyMember[];
  relationships: FamilyRelationship[];
}

export type FamilyTreeViewType = '2d' | '3d';

export interface FamilyTreeViewProps {
  data: FamilyData;
  defaultView?: FamilyTreeViewType;
  onViewChange?: (view: FamilyTreeViewType) => void;
  onMemberClick?: (member: FamilyMember) => void;
  onAddMember?: (parentId?: string) => void;
  onEditMember?: (member: FamilyMember) => void;
  onDeleteMember?: (memberId: string) => void;
  onAddRelationship?: (fromId: string, toId: string, type: RelationshipType) => void;
  loading?: boolean;
  error?: Error | null;
}
