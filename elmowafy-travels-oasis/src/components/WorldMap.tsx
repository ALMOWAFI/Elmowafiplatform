
import React, { useRef, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Stars } from '@react-three/drei';
import { useLanguage } from '@/context/LanguageContext';
import { apiService, queryKeys } from '@/lib/api';
import * as THREE from 'three';

// Enhanced location coordinates database for family memories
const locationCoordinates: { [key: string]: [number, number] } = {
  // UAE & Dubai locations (our family's main area)
  'dubai': [55.2708, 25.2048],
  'burj khalifa': [55.2744, 25.1972],
  'dubai, uae': [55.2708, 25.2048],
  'burj khalifa, dubai, uae': [55.2744, 25.1972],
  'home, dubai, uae': [55.2708, 25.2048],
  'jumeirah beach residence': [55.1373, 25.0775],
  'jbr': [55.1373, 25.0775],
  'jumeirah beach residence, dubai, uae': [55.1373, 25.0775],
  'dubai international academy': [55.2553, 25.1126],
  'hatta mountains': [56.1267, 24.8158],
  'hatta mountains, dubai, uae': [56.1267, 24.8158],
  'uae': [53.8478, 23.4241],
  
  // Major world cities
  'istanbul': [28.9784, 41.0082],
  'turkey': [35.2433, 38.9637],
  'cairo': [31.2357, 30.0444],
  'egypt': [30.8025, 26.8206],
  'london': [-0.1278, 51.5074],
  'uk': [-3.4360, 55.3781],
  'paris': [2.3522, 48.8566],
  'france': [2.2137, 46.2276],
  'new york': [-74.0060, 40.7128],
  'usa': [-95.7129, 37.0902],
  'tokyo': [139.6503, 35.6762],
  'japan': [138.2529, 36.2048],
  'mecca': [39.8579, 21.3099],
  'medina': [39.5975, 24.5247],
  'saudi arabia': [45.0792, 23.8859],
  'riyadh': [46.6753, 24.7136],
  'doha': [51.5310, 25.2760],
  'qatar': [51.1839, 25.3548],
  'abu dhabi': [54.3773, 24.2992],
  'sharjah': [55.4033, 25.3573],
};

// Convert longitude and latitude to 3D position
const coordinatesToPosition = (lng: number, lat: number, radius: number = 1.01): [number, number, number] => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  
  return [x, y, z];
};

// Location data interface
interface TravelLocation {
  id: string;
  name: string;
  nameArabic?: string;
  coordinates: [number, number];
  country: string;
  visitDate?: string;
  description?: string;
  photos?: string[];
  familyMembers?: string[];
}

// Single travel marker component
interface MarkerProps {
  position: [number, number, number];
  color?: string;
  scale?: number;
  location: TravelLocation;
  onSelect: (location: TravelLocation) => void;
}

const TravelMarker: React.FC<MarkerProps> = ({ position, color = '#F0C24C', scale = 0.02, location, onSelect }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  useFrame(({ clock }) => {
    if (meshRef.current) {
      // Gentle pulsing animation
      const pulseScale = 1 + Math.sin(clock.getElapsedTime() * 2) * 0.1;
      meshRef.current.scale.setScalar(hovered ? pulseScale * 1.2 : pulseScale);
    }
  });
  
  return (
    <mesh 
      ref={meshRef}
      position={position} 
      onClick={() => onSelect(location)}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <sphereGeometry args={[scale, 16, 16]} />
      <meshStandardMaterial 
        color={color} 
        emissive={color} 
        emissiveIntensity={hovered ? 0.8 : 0.5}
        transparent
        opacity={0.9}
      />
      {/* Glow ring for multiple memories */}
      {location.memoryCount > 1 && (
        <mesh>
          <ringGeometry args={[scale * 1.5, scale * 2, 16]} />
          <meshBasicMaterial 
            color={color} 
            transparent 
            opacity={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </mesh>
  );
};

// Earth component with real memory data
const Earth = ({ 
  setSelectedLocation, 
  travelLocations 
}: { 
  setSelectedLocation: (location: TravelLocation) => void;
  travelLocations: TravelLocation[];
}) => {
  const earthRef = useRef<THREE.Mesh>(null);
  
  useFrame(({ clock }) => {
    if (earthRef.current) {
      // Very slow automatic rotation when not interacting
      earthRef.current.rotation.y = clock.getElapsedTime() * 0.05;
    }
  });
  
  return (
    <>
      {/* Earth sphere */}
      <Sphere ref={earthRef} args={[1, 64, 64]}>
        <meshStandardMaterial 
          color="#4A90E2"
          transparent
          opacity={0.8}
        />
      </Sphere>
      
      {/* Travel location markers from real memory data */}
      {travelLocations.map((location, i) => (
        <TravelMarker 
          key={i}
          position={coordinatesToPosition(location.coordinates[0], location.coordinates[1])}
          location={location}
          onSelect={setSelectedLocation}
          color={location.memoryCount > 1 ? '#FF6B6B' : '#4ECDC4'}
          scale={0.015 + (location.memoryCount * 0.005)}
        />
      ))}
    </>
  );
};

// Enhanced helper function to get coordinates for a location
const getLocationCoordinates = (locationName: string): [number, number] | null => {
  const lowerName = locationName.toLowerCase().trim();
  
  // First try exact match
  if (locationCoordinates[lowerName]) {
    return locationCoordinates[lowerName];
  }
  
  // Then try partial matches (prioritize longer matches first)
  const matches = Object.keys(locationCoordinates)
    .filter(key => lowerName.includes(key) || key.includes(lowerName))
    .sort((a, b) => b.length - a.length); // Prioritize longer, more specific matches
  
  if (matches.length > 0) {
    return locationCoordinates[matches[0]];
  }
  
  // Special fallback for common patterns
  if (lowerName.includes('dubai') || lowerName.includes('uae')) {
    return locationCoordinates['dubai'];
  }
  
  return null;
};

// Main WorldMap component with real memory integration
const WorldMap: React.FC = () => {
  const { language } = useLanguage();
  const [selectedLocation, setSelectedLocation] = useState<TravelLocation | null>(null);
  
  // Fetch real memory data
  const { data: memories = [], isLoading } = useQuery({
    queryKey: queryKeys.memories(),
    queryFn: () => apiService.getMemories(),
  });

  // Process memories into travel locations
  const travelLocations = useMemo(() => {
    const locationMap = new Map();
    
    memories.forEach(memory => {
      if (memory.location) {
        const coords = getLocationCoordinates(memory.location);
        if (coords) {
          const key = memory.location.toLowerCase();
          if (locationMap.has(key)) {
            const existing = locationMap.get(key);
            existing.memories.push(memory);
            existing.memoryCount = existing.memories.length;
            // Update with most recent date and memory
            if (new Date(memory.date) > new Date(existing.date)) {
              existing.date = memory.date;
              existing.latestMemoryTitle = memory.title;
            }
          } else {
            locationMap.set(key, {
              name: memory.location,
              coordinates: coords,
              date: memory.date,
              description: memory.description || `Family memories from ${memory.location}`,
              memories: [memory],
              memoryCount: 1,
              latestMemoryTitle: memory.title
            });
          }
        }
      }
    });
    
    return Array.from(locationMap.values());
  }, [memories]);

  if (isLoading) {
    return (
      <div className="relative w-full h-[500px] flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">{language === 'en' ? 'Loading family travel map...' : 'تحميل خريطة سفر العائلة...'}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="relative w-full h-[500px]">
      <Canvas camera={{ position: [0, 0, 2.5], fov: 45 }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <Earth setSelectedLocation={setSelectedLocation} travelLocations={travelLocations} />
        <OrbitControls
          enableZoom={true}
          enablePan={true}
          enableRotate={true}
          zoomSpeed={0.6}
          panSpeed={0.6}
          rotateSpeed={0.6}
          minDistance={1.5}
          maxDistance={5}
        />
      </Canvas>
      
      {/* Memory count indicator */}
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
        <div className="text-sm font-medium text-gray-700">
          {language === 'en' ? 'Family Memories' : 'ذكريات العائلة'}
        </div>
        <div className="text-2xl font-bold text-blue-600">
          {memories.length}
        </div>
        <div className="text-sm text-muted-foreground">
          {language === 'en' ? `${travelLocations.length} locations` : `${travelLocations.length} موقع`}
        </div>
      </div>
      
      {/* Location information overlay */}
      {selectedLocation && (
        <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm text-gray-800 p-4 rounded-lg shadow-lg border animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-3 h-3 rounded-full ${selectedLocation.memoryCount > 1 ? 'bg-red-400' : 'bg-teal-400'}`}></div>
            <h3 className="text-xl font-bold text-blue-600">
              {selectedLocation.name}
            </h3>
          </div>
          <p className={`mb-2 ${language === 'ar' ? 'font-noto' : ''}`}>
            {new Date(selectedLocation.date).toLocaleDateString()} - {selectedLocation.description}
          </p>
          <div className="text-sm text-muted-foreground">
            {language === 'en' ? `${selectedLocation.memoryCount} ${selectedLocation.memoryCount === 1 ? 'memory' : 'memories'} from this location` : `${selectedLocation.memoryCount} ${selectedLocation.memoryCount === 1 ? 'ذكرى' : 'ذكريات'} من هذا المكان`}
          </div>
          {selectedLocation.memories && selectedLocation.memories.length > 0 && (
            <div className="mt-2 text-sm">
              <strong>{language === 'en' ? 'Latest:' : 'الأحدث:'}</strong> {selectedLocation.memories[selectedLocation.memories.length - 1].title}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WorldMap;
