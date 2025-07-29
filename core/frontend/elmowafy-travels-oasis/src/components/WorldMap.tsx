
import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Stars } from '@react-three/drei';
import { useLanguage } from '@/context/LanguageContext';
import * as THREE from 'three';

// Sample travel data - replace with actual data later
const travelLocations = [
  { name: 'Cairo', coordinates: [31.2357, 30.0444], date: '2023', description: 'Family vacation' },
  { name: 'Dubai', coordinates: [55.2708, 25.2048], date: '2022', description: 'Business trip' },
  { name: 'London', coordinates: [-0.1278, 51.5074], date: '2021', description: 'Summer holiday' },
  { name: 'New York', coordinates: [-74.0060, 40.7128], date: '2020', description: 'Winter getaway' },
  { name: 'Tokyo', coordinates: [139.6503, 35.6762], date: '2019', description: 'Tech conference' },
];

// Convert longitude and latitude to 3D position
const coordinatesToPosition = (lng: number, lat: number, radius: number = 1.01): [number, number, number] => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  
  return [x, y, z];
};

// Single travel marker component
interface MarkerProps {
  position: [number, number, number];
  color?: string;
  scale?: number;
  location: any;
  onSelect: (location: any) => void;
}

const TravelMarker: React.FC<MarkerProps> = ({ position, color = '#F0C24C', scale = 0.02, location, onSelect }) => {
  return (
    <mesh position={position} onClick={() => onSelect(location)}>
      <sphereGeometry args={[scale, 16, 16]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
    </mesh>
  );
};

// Earth component
const Earth = ({ setSelectedLocation }: { setSelectedLocation: (location: any) => void }) => {
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
          map={new THREE.TextureLoader().load('/earth-day-map.jpg')} 
          bumpMap={new THREE.TextureLoader().load('/earth-topology.jpg')}
          bumpScale={0.05}
          normalMap={new THREE.TextureLoader().load('/earth-normal-map.jpg')}
        />
      </Sphere>
      
      {/* Travel location markers */}
      {travelLocations.map((location, i) => (
        <TravelMarker 
          key={i}
          position={coordinatesToPosition(location.coordinates[0], location.coordinates[1])}
          location={location}
          onSelect={setSelectedLocation}
        />
      ))}
    </>
  );
};

// Main WorldMap component
const WorldMap: React.FC = () => {
  const { language } = useLanguage();
  const [selectedLocation, setSelectedLocation] = useState<any | null>(null);
  
  return (
    <div className="relative w-full h-[500px]">
      <Canvas camera={{ position: [0, 0, 2.5], fov: 45 }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <Earth setSelectedLocation={setSelectedLocation} />
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
      
      {/* Location information overlay */}
      {selectedLocation && (
        <div className="absolute bottom-4 left-4 right-4 bg-black/70 text-white p-4 rounded-lg backdrop-blur-sm animate-fade-in">
          <h3 className="text-xl font-bold text-secondary">
            {selectedLocation.name}
          </h3>
          <p className={language === 'ar' ? 'font-noto' : ''}>
            {selectedLocation.date} - {selectedLocation.description}
          </p>
        </div>
      )}
    </div>
  );
};

export default WorldMap;
