// src/features/travel-memories/mockMemories.ts
import { TravelMemory } from './memoryTypes';

/**
 * A collection of mock travel memories for development and testing.
 */
export const mockMemories: TravelMemory[] = [
  {
    id: 'mem-001',
    title: 'Family Ski Trip to the Alps',
    date: '2024-02-20',
    location: {
      name: 'Chamonix, France',
      lat: 45.9237,
      lng: 6.8694,
    },
    story: 'Our first time seeing such majestic, snow-covered mountains! The kids learned to ski, and we had the most amazing hot chocolate every evening. Amr was a natural on the slopes, while Rimas preferred building snowmen. A trip we will never forget.',
    photoGallery: [
      'https://images.unsplash.com/photo-1549738318-244159451935?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1517948430062-04c73b354656?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1580436437329-f1b2a2238138?q=80&w=1939&auto=format&fit=crop',
    ],
    taggedFamilyMemberIds: ['1', '2', '3', '4', '5'], // Corresponds to IDs in familyData.ts
  },
  {
    id: 'mem-002',
    title: 'Exploring the Wonders of Ancient Egypt',
    date: '2023-11-10',
    location: {
      name: 'Luxor, Egypt',
      lat: 25.6872,
      lng: 32.6396,
    },
    story: 'A journey back in time! We explored the Valley of the Kings and were mesmerized by the hieroglyphs in Karnak Temple. Mohamed gave us a history lesson at every site. It was incredible to connect with our heritage in such a profound way.',
    photoGallery: [
      'https://images.unsplash.com/photo-1569949381669-ecf31ae8e613?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1593083739828-534061934963?q=80&w=2070&auto=format&fit=crop',
    ],
    taggedFamilyMemberIds: ['1', '6', '7'],
  },
  {
    id: 'mem-003',
    title: 'Summer Vacation in Coastal Alexandria',
    date: '2024-07-25',
    location: {
      name: 'Alexandria, Egypt',
      lat: 31.2001,
      lng: 29.9187,
    },
    story: 'Relaxing by the Mediterranean sea. We spent our days swimming, building sandcastles, and enjoying the fresh seafood. The evenings were spent walking along the corniche. A perfect summer getaway for the whole family.',
    photoGallery: [
      'https://images.unsplash.com/photo-1623351659509-36acef0b1e49?q=80&w=1935&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1577915149380-84f7a521d5a3?q=80&w=1974&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1622403970394-3d5a8f117208?q=80&w=2070&auto=format&fit=crop',
    ],
    taggedFamilyMemberIds: ['1', '2', '3', '4', '5', '6', '7'],
  },
];
