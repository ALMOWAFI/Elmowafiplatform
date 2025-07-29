export interface FamilyMember {
  id: string;
  name: string;
  partner?: FamilyMember;
  children?: FamilyMember[];
  gender: 'male' | 'female';
  birthDate?: string;
  profilePicture?: string;
}

// New, unified data structure
export const familyData: FamilyMember = {
  id: '1',
  name: 'Ahmad Ali Elmowafy',
  gender: 'male',
  profilePicture: 'https://i.pravatar.cc/150?u=1',
  partner: {
    id: '2',
    name: 'Marwa Hani',
    gender: 'female',
    profilePicture: 'https://i.pravatar.cc/150?u=2',
  },
  children: [
    {
      id: '3',
      name: 'Amr Elmowafy',
      gender: 'male',
      profilePicture: 'https://i.pravatar.cc/150?u=3',
      children: [],
    },
    {
      id: '4',
      name: 'Ali Elmowafy',
      gender: 'male',
      profilePicture: 'https://i.pravatar.cc/150?u=4',
      children: [
        {
          id: '5',
          name: 'Rimas',
          gender: 'female',
          profilePicture: 'https://i.pravatar.cc/150?u=5',
        },
        {
          id: '6',
          name: 'Basmala',
          gender: 'female',
          profilePicture: 'https://i.pravatar.cc/150?u=6',
        },
      ],
    },
    {
      id: '7',
      name: 'Mohamed Elmowafy',
      gender: 'male',
      profilePicture: 'https://i.pravatar.cc/150?u=7',
      partner: {
        id: '8',
        name: 'Hala El-Sherbini',
        gender: 'female',
        profilePicture: 'https://i.pravatar.cc/150?u=8',
      },
      children: [],
    },
  ],
};
