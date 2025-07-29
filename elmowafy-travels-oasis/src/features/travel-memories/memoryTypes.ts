// src/features/travel-memories/memoryTypes.ts

/**
 * Represents a single geographic location.
 */
export interface GeoLocation {
  name: string;      // e.g., "Tokyo, Japan"
  lat: number;       // Latitude
  lng: number;       // Longitude
}

/**
 * Represents a single travel memory.
 * This is the core data structure for the Travel Memory System.
 */
export interface TravelMemory {
  id: string;                          // Unique identifier for the memory (e.g., a UUID)
  title: string;                       // The title of the memory, e.g., "Our First Trip to the Mountains"
  date: string;                        // The date of the memory in ISO 8601 format (e.g., "2023-08-15")
  location: GeoLocation;               // The geographic location where the memory was made
  story: string;                       // The detailed story or description of the memory (can support markdown)
  photoGallery: string[];              // An array of URLs to the photos associated with the memory
  taggedFamilyMemberIds: string[];     // An array of family member IDs (linking to the family tree data)
}
