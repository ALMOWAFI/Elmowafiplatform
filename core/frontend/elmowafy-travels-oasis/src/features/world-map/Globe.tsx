import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sphere, Stars, Html } from '@react-three/drei';
import { useLanguage } from '@/context/LanguageContext';
import * as THREE from 'three';
import { TravelLocation, GlobeControlsProps, MarkerProps } from './types';
import { animated, useSpring } from '@react-spring/three';
import { GlowingMarker } from './GlowingMarker';
import { TravelArc } from './TravelArc';
import { LocationPopup } from './LocationPopup';
import { cn } from '@/lib/utils';

// Convert longitude and latitude to 3D position on a sphere
export const coordinatesToPosition = (lng: number, lat: number, radius: number = 1.01): [number, number, number] => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  
  return [x, y, z];
};

// The main Earth component
const Earth = ({ 
  locations, 
  selectedLocationId, 
  onSelectLocation, 
  autoRotate,
  rotationSpeed,
  selectedRoutes,
  highlightedFamilyMembers,
}: { 
  locations: TravelLocation[]; 
  selectedLocationId: string | null;
  onSelectLocation: (location: TravelLocation) => void;
  autoRotate: boolean;
  rotationSpeed: number;
  selectedRoutes: string[];
  highlightedFamilyMembers: string[];
}) => {
  const earthRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [earthTexture, setEarthTexture] = useState<THREE.Texture | null>(null);
  const [bumpTexture, setBumpTexture] = useState<THREE.Texture | null>(null);
  const [specularTexture, setSpecularTexture] = useState<THREE.Texture | null>(null);
  const [cloudsTexture, setCloudsTexture] = useState<THREE.Texture | null>(null);
  const { language } = useLanguage();
  const { camera } = useThree();
  
  // Load textures
  useEffect(() => {
    const textureLoader = new THREE.TextureLoader();
    
    textureLoader.load('/earth-blue-marble.jpg', (texture) => {
      setEarthTexture(texture);
    });
    
    textureLoader.load('/earth-topology.jpg', (texture) => {
      setBumpTexture(texture);
    });
    
    textureLoader.load('/earth-specular.jpg', (texture) => {
      setSpecularTexture(texture);
    });
    
    textureLoader.load('/earth-clouds.png', (texture) => {
      setCloudsTexture(texture);
    });
  }, []);
  
  // Auto-rotation animation
  useFrame(({ clock }) => {
    if (earthRef.current && autoRotate) {
      earthRef.current.rotation.y = clock.getElapsedTime() * rotationSpeed * 0.05;
    }
    
    if (cloudsRef.current && autoRotate) {
      cloudsRef.current.rotation.y = clock.getElapsedTime() * rotationSpeed * 0.055; // Slightly faster than Earth
    }
  });
  
  // Animation for smooth camera movement to selected location
  useEffect(() => {
    if (selectedLocationId) {
      const location = locations.find(loc => loc.id === selectedLocationId);
      if (location) {
        const position = coordinatesToPosition(location.coordinates[0], location.coordinates[1], 2.5);
        
        // Calculate target position slightly away from the globe's center
        const targetPosition = new THREE.Vector3(position[0], position[1], position[2]);
        targetPosition.normalize().multiplyScalar(2.5);
        
        // Smoothly move camera to the position
        new THREE.TWEEN.Tween(camera.position)
          .to({ x: targetPosition.x, y: targetPosition.y, z: targetPosition.z }, 1000)
          .easing(THREE.TWEEN.Easing.Cubic.InOut)
          .start();
          
        // Point camera toward the globe center
        new THREE.TWEEN.Tween(camera.position)
          .to({ x: 0, y: 0, z: 0 }, 1000)
          .easing(THREE.TWEEN.Easing.Cubic.InOut)
          .onUpdate(() => camera.lookAt(0, 0, 0))
          .start();
      }
    }
  }, [selectedLocationId, locations, camera]);
  
  // Render markers with visual customizations based on type
  const renderMarkers = useMemo(() => {
    return locations.map((location) => {
      const position = coordinatesToPosition(location.coordinates[0], location.coordinates[1]);
      const isSelected = location.id === selectedLocationId;
      const isHovered = location.id === hovered;
      
      // Set marker size and color based on location type
      let color = '#3B82F6'; // Default blue
      let scale = 0.02;
      
      if (location.type === 'home') {
        color = '#F43F5E'; // Red for homes
        scale = 0.025;
      } else if (location.type === 'planned') {
        color = '#10B981'; // Green for planned destinations
        scale = 0.018;
      }
      
      // Filter out locations not traveled by highlighted family members
      if (highlightedFamilyMembers.length > 0 && 
          !location.travelers.some(id => highlightedFamilyMembers.includes(id))) {
        color = '#6B7280'; // Gray out non-matching locations
        scale = 0.015;
      }
      
      // Increase size for selected/hovered
      if (isSelected || isHovered) {
        scale *= 1.5;
      }
      
      return (
        <GlowingMarker
          key={location.id}
          id={location.id}
          position={position}
          scale={scale}
          color={color}
          location={location}
          onSelect={() => onSelectLocation(location)}
          onHover={() => setHovered(location.id)}
          onUnhover={() => setHovered(null)}
          pulse={isSelected}
        />
      );
    });
  }, [locations, selectedLocationId, hovered, onSelectLocation, highlightedFamilyMembers]);
  
  // Render travel route arcs between locations
  const renderRoutes = useMemo(() => {
    const routes = [];
    
    // Add route arcs for selected routes or connected to selected location
    for (let i = 0; i < locations.length; i++) {
      for (let j = i + 1; j < locations.length; j++) {
        const startLoc = locations[i];
        const endLoc = locations[j];
        
        // Skip if neither location is selected (when a location is selected)
        if (selectedLocationId && 
            startLoc.id !== selectedLocationId && 
            endLoc.id !== selectedLocationId) {
          continue;
        }
        
        const startPos = coordinatesToPosition(startLoc.coordinates[0], startLoc.coordinates[1]);
        const endPos = coordinatesToPosition(endLoc.coordinates[0], endLoc.coordinates[1]);
        
        const routeId = `${startLoc.id}-${endLoc.id}`;
        
        // Only show routes if they are in selectedRoutes
        if (selectedRoutes.includes(routeId)) {
          routes.push(
            <TravelArc
              key={routeId}
              start={startPos}
              end={endPos}
              color="#F59E0B" // Amber color for routes
              thickness={0.005}
              animated={true}
            />
          );
        }
      }
    }
    
    return routes;
  }, [locations, selectedLocationId, selectedRoutes]);
  
  return (
    <>
      {/* Earth sphere */}
      {earthTexture && (
        <Sphere ref={earthRef} args={[1, 64, 64]}>
          <meshPhongMaterial 
            map={earthTexture}
            bumpMap={bumpTexture}
            bumpScale={0.05}
            specularMap={specularTexture}
            specular={new THREE.Color('#666666')}
            shininess={5}
          />
        </Sphere>
      )}
      
      {/* Cloud layer */}
      {cloudsTexture && (
        <Sphere ref={cloudsRef} args={[1.01, 64, 64]}>
          <meshPhongMaterial 
            map={cloudsTexture}
            transparent={true}
            opacity={0.4}
            depthWrite={false}
          />
        </Sphere>
      )}
      
      {/* Travel location markers */}
      {renderMarkers}
      
      {/* Travel route arcs */}
      {renderRoutes}
    </>
  );
};

// The main GlobeControls component
const GlobeControls: React.FC<GlobeControlsProps> = ({
  autoRotate,
  enableZoom,
  enablePan,
  rotationSpeed,
  maxDistance,
  minDistance,
  onGlobeClick,
}) => {
  return (
    <OrbitControls 
      enableZoom={enableZoom}
      enablePan={enablePan}
      enableRotate={true}
      zoomSpeed={0.6}
      panSpeed={0.6}
      rotateSpeed={rotationSpeed}
      minDistance={minDistance}
      maxDistance={maxDistance}
      autoRotate={autoRotate}
      autoRotateSpeed={1}
      enableDamping={true}
      dampingFactor={0.1}
      onClick={onGlobeClick}
    />
  );
};

// The main WorldGlobe component that combines Earth and controls
export const WorldGlobe: React.FC<{
  locations: TravelLocation[];
  selectedLocationId: string | null;
  onSelectLocation: (location: TravelLocation) => void;
  autoRotate?: boolean;
  enableZoom?: boolean;
  enablePan?: boolean;
  rotationSpeed?: number;
  maxDistance?: number;
  minDistance?: number;
  selectedRoutes?: string[];
  highlightedFamilyMembers?: string[];
}> = ({
  locations,
  selectedLocationId,
  onSelectLocation,
  autoRotate = true,
  enableZoom = true,
  enablePan = true,
  rotationSpeed = 0.8,
  maxDistance = 5,
  minDistance = 1.5,
  selectedRoutes = [],
  highlightedFamilyMembers = [],
}) => {
  const { language } = useLanguage();
  const [selectedLocation, setSelectedLocation] = useState<TravelLocation | null>(null);
  
  // Update selected location when ID changes
  useEffect(() => {
    if (selectedLocationId) {
      const location = locations.find(loc => loc.id === selectedLocationId);
      setSelectedLocation(location || null);
    } else {
      setSelectedLocation(null);
    }
  }, [selectedLocationId, locations]);
  
  // Handle location selection
  const handleSelectLocation = (location: TravelLocation) => {
    setSelectedLocation(location);
    onSelectLocation(location);
  };
  
  return (
    <div className="relative w-full h-[500px] bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl overflow-hidden">
      <Canvas 
        camera={{ position: [0, 0, 2.5], fov: 45 }}
        shadows
        style={{ background: 'transparent' }}
        gl={{ antialias: true }}
        className={cn("rounded-xl", language === 'ar' ? 'rtl-canvas' : '')}
      >
        {/* Ambient and directional lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 3, 5]} intensity={0.8} castShadow />
        <pointLight position={[-5, -3, -5]} intensity={0.2} />
        
        {/* Star background */}
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        {/* Earth with locations */}
        <Earth 
          locations={locations} 
          selectedLocationId={selectedLocationId}
          onSelectLocation={handleSelectLocation}
          autoRotate={autoRotate}
          rotationSpeed={rotationSpeed}
          selectedRoutes={selectedRoutes}
          highlightedFamilyMembers={highlightedFamilyMembers}
        />
        
        {/* Camera controls */}
        <GlobeControls 
          autoRotate={autoRotate}
          enableZoom={enableZoom}
          enablePan={enablePan}
          rotationSpeed={rotationSpeed}
          maxDistance={maxDistance}
          minDistance={minDistance}
        />
      </Canvas>
      
      {/* Location information overlay */}
      {selectedLocation && (
        <LocationPopup location={selectedLocation} />
      )}
    </div>
  );
};
