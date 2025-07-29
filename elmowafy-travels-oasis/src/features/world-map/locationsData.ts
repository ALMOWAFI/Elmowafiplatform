export interface Location {
  name: string;
  lat: number;
  lng: number;
}

export const locations: Location[] = [
  {
    name: 'Cairo, Egypt',
    lat: 30.0444,
    lng: 31.2357,
  },
  {
    name: 'Mecca, Saudi Arabia',
    lat: 21.3891,
    lng: 39.8579,
  },
  {
    name: 'San Francisco, USA',
    lat: 37.7749,
    lng: -122.4194,
  },
  {
    name: 'Tokyo, Japan',
    lat: 35.6762,
    lng: 139.6503,
  },
];
