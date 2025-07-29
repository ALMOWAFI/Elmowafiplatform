import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Sparkles } from '@react-three/drei';
import { MarkerProps } from './types';
import { animated, useSpring } from '@react-spring/three';
import * as THREE from 'three';

// Function to convert longitude/latitude to 3D position
const coordsToPosition = (
  coords: [number, number], 
  radius: number = 1.01
): [number, number, number] => {
  const [longitude, latitude] = coords;
  const phi = (90 - latitude) * (Math.PI / 180);
  const theta = (longitude + 180) * (Math.PI / 180);
  
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  
  return [x, y, z];
};

/**
 * An enhanced glowing marker component for the 3D globe with spectacular visual effects
 */
export const GlowingMarker: React.FC<{
  position: [number, number]; // [longitude, latitude]
  color?: string;
  scale?: number;
  pulse?: boolean;
  onClick?: () => void;
  location?: any;
  onSelect?: (location: any) => void;
  isHomeLocation?: boolean;
}> = ({ 
  position, 
  color = '#F0C24C', 
  scale = 0.02, 
  pulse = false,
  onClick,
  location,
  onSelect,
  isHomeLocation = false,
}) => {
  const markerRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  // Convert longitude/latitude to 3D position
  const pos3D = useMemo(() => coordsToPosition(position), [position]);
  
  // Marker size based on type (home locations are larger)
  const markerScale = isHomeLocation ? scale * 1.4 : scale;
  
  // Colors for different effects
  const glowColor = useMemo(() => new THREE.Color(color).offsetHSL(0, 0, 0.2), [color]);
  const coreColor = useMemo(() => new THREE.Color(color).offsetHSL(0, 0.1, 0.1), [color]);
  
  // Animation for pulsing effect
  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    
    if (markerRef.current) {
      // Main marker pulsing
      if (pulse || hovered) {
        const pulseScale = 1 + Math.sin(time * (hovered ? 6 : 3)) * 0.15;
        markerRef.current.scale.set(
          markerScale * pulseScale,
          markerScale * pulseScale,
          markerScale * pulseScale
        );
      }
    }
    
    if (glowRef.current && glowRef.current.material instanceof THREE.Material) {
      // Animate the glow opacity and size
      const material = glowRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.6 + Math.sin(time * 2) * 0.2;
      
      const glowPulse = 1 + Math.sin(time * 1.5) * 0.2;
      glowRef.current.scale.set(
        markerScale * 2.5 * glowPulse, 
        markerScale * 2.5 * glowPulse, 
        markerScale * 2.5 * glowPulse
      );
    }
    
    // Animate the ring for home locations
    if (isHomeLocation && ringRef.current) {
      ringRef.current.rotation.z = time * 0.5;
      ringRef.current.rotation.y = time * 0.3;
    }
  });
  
  // Animation for hover state
  const { hoverScale, hoverOpacity } = useSpring({
    hoverScale: hovered ? 1.3 : 1,
    hoverOpacity: hovered ? 1 : 0,
    config: { mass: 1, tension: 280, friction: 40 }
  });
  
  // Handle hover state
  const handlePointerOver = () => {
    setHovered(true);
  };
  
  const handlePointerOut = () => {
    setHovered(false);
  };
  
  // Handle click
  const handleClick = () => {
    if (onClick) onClick();
    if (onSelect && location) onSelect(location);
  };
  
  return (
    <group
      position={pos3D}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* Main marker with metallic effect */}
      <animated.mesh 
        ref={markerRef}
        scale={markerScale}
      >
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial 
          color={color} 
          emissive={color} 
          emissiveIntensity={0.8} 
          roughness={0.2}
          metalness={0.9}
          envMapIntensity={1.2}
        />
      </animated.mesh>
      
      {/* Inner glow */}
      <mesh scale={markerScale * 1.1}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial 
          color={coreColor} 
          transparent={true} 
          opacity={0.7}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Outer glow effect */}
      <mesh 
        ref={glowRef} 
        scale={markerScale * 2.5}
      >
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial 
          color={glowColor} 
          transparent={true} 
          opacity={0.4}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Special ring for home locations */}
      {isHomeLocation && (
        <group>
          <mesh 
            ref={ringRef} 
            scale={markerScale * 3.5}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[0.9, 1, 32]} />
            <meshBasicMaterial 
              color={color} 
              transparent={true} 
              opacity={0.6}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          
          {/* Sparkles around home locations */}
          <Sparkles 
            count={20} 
            scale={markerScale * 8} 
            size={markerScale * 1.5} 
            speed={0.3} 
            opacity={0.7} 
            color={color} 
          />
        </group>
      )}
      
      {/* Hover effect ring */}
      <animated.mesh 
        scale={hoverScale.to(s => markerScale * 3 * s)}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.9, 1, 32]} />
        <meshBasicMaterial 
          color="white" 
          transparent={true} 
          opacity={hoverOpacity}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </animated.mesh>
      
      {/* Popup label on hover */}
      {hovered && (
        <Html
          position={[0, markerScale * 60, 0]}
          center
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            color: 'white',
            padding: '6px 10px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 'bold',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            boxShadow: '0 0 10px rgba(0,0,0,0.5)',
            transform: 'scale(0.5)',
            transformOrigin: 'center center',
          }}
        >
          <div style={{ fontWeight: 'bold', color: color }}>{location?.name || 'Location'}</div>
          {location?.date && <div style={{ fontSize: '11px', marginTop: '2px' }}>{location.date}</div>}
        </Html>
      )}
    </group>
  );
};
