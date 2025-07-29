// Defines the structure for a single family member
export interface FamilyMember {
    _id: string;
    name: string;
    arabicName: string;
    dob?: Date;
    gender: 'Male' | 'Female';
    parents?: FamilyMember[];
    spouse?: FamilyMember;
    children?: FamilyMember[];
    profilePicture?: string;
    bio?: string;
    arabicBio?: string;
}
