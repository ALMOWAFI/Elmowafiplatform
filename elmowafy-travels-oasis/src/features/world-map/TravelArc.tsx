import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface TravelArcProps {
  startPosition: [number, number]; // [longitude, latitude]
  endPosition: [number, number]; // [longitude, latitude]
  color?: string;
  thickness?: number;
  animated?: boolean;
  animationDuration?: number;
  dashSize?: number;
  dashGap?: number;
  progress?: number; // 0 to 1 for animation progress
  glowIntensity?: number;
  particleCount?: number;
}

// Helper function to convert longitude/latitude to 3D position
const geoToVector3 = (longitude: number, latitude: number, radius: number = 1.01): THREE.Vector3 => {
  // Convert to radians
  const phi = (90 - latitude) * (Math.PI / 180);
  const theta = (longitude + 180) * (Math.PI / 180);
  
  // Calculate position
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  
  return new THREE.Vector3(x, y, z);
};

/**
 * A stunning curved arc component connecting two points on the globe
 * with flowing particles and glow effects
 */
export const TravelArc: React.FC<TravelArcProps> = ({
  startPosition,
  endPosition,
  color = '#F59E0B',
  thickness = 0.003,
  animated = true,
  animationDuration = 5,
  dashSize = 0.03,
  dashGap = 0.03,
  progress = 1,
  glowIntensity = 0.8,
  particleCount = 15,
}) => {
  const arcRef = useRef<THREE.Line>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.LineDashedMaterial>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [completedPath, setCompletedPath] = useState<THREE.Vector3[]>([]);
  
  // Convert geographic coordinates to 3D vectors
  const start3D = useMemo(() => geoToVector3(startPosition[0], startPosition[1]), [startPosition]);
  const end3D = useMemo(() => geoToVector3(endPosition[0], endPosition[1]), [endPosition]);
  
  // Create a beautiful curved path between two points on the globe
  const { points, curve } = useMemo(() => {
    // Calculate the midpoint
    const midVec = new THREE.Vector3().addVectors(start3D, end3D).multiplyScalar(0.5);
    
    // Extend the midpoint away from the center to create an arc
    const distance = start3D.distanceTo(end3D);
    const midElevation = 1 + distance * 0.5; // Higher arc for longer distances
    midVec.normalize().multiplyScalar(midElevation);
    
    // Create quadratic bezier curve
    const curve = new THREE.QuadraticBezierCurve3(start3D, midVec, end3D);
    
    // Generate points along the curve
    const points = curve.getPoints(100); // More points for smoother curves
    
    return { points, curve };
  }, [start3D, end3D]);
  
  // Create the tube geometry
  const geometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [points]);
  
  // Create particle system for the flowing effect
  const particleSystem = useMemo(() => {
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSizes = new Float32Array(particleCount);
    
    // Initialize with random positions along the curve
    for (let i = 0; i < particleCount; i++) {
      const t = Math.random();
      const pos = curve.getPoint(t);
      particlePositions[i * 3] = pos.x;
      particlePositions[i * 3 + 1] = pos.y;
      particlePositions[i * 3 + 2] = pos.z;
      particleSizes[i] = Math.random() * 0.01 + 0.005;
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));
    
    return particleGeometry;
  }, [curve, particleCount]);
  
  // Animation logic
  useFrame(({ clock }) => {
    if (!animated || !particlesRef.current || !materialRef.current) return;
    
    const time = clock.getElapsedTime();
    const animationSpeed = 1 / animationDuration;
    
    // Update the line dash offset for flowing effect
    materialRef.current.dashOffset = -time * animationSpeed;
    
    // Update particle positions
    const positions = particlesRef.current.geometry.attributes.position;
    const sizes = particlesRef.current.geometry.attributes.size;
    
    for (let i = 0; i < particleCount; i++) {
      // Calculate position along the curve based on time
      let t = (time * 0.1 + i / particleCount) % 1;
      
      // Only show particles up to the current progress
      if (t <= progress) {
        const pos = curve.getPoint(t);
        positions.setXYZ(i, pos.x, pos.y, pos.z);
        
        // Pulse size effect
        const pulse = Math.sin(time * 2 + i) * 0.5 + 1;
        sizes.setX(i, (Math.random() * 0.005 + 0.005) * pulse);
      } else {
        // Hide particles beyond current progress
        positions.setXYZ(i, 0, 0, 0);
        sizes.setX(i, 0);
      }
    }
    
    positions.needsUpdate = true;
    sizes.needsUpdate = true;
    
    // Glow effect pulse
    if (glowRef.current) {
      glowRef.current.material.opacity = (Math.sin(time * 2) * 0.2 + 0.8) * glowIntensity;
    }
  });
  
  return (
    <group>
      {/* Main path line */}
      <line ref={arcRef} geometry={geometry}>
        <lineDashedMaterial
          ref={materialRef}
          color={color}
          linewidth={thickness}
          dashSize={dashSize}
          gapSize={dashGap}
          transparent={true}
          opacity={0.75}
          toneMapped={false}
          depthWrite={false}
        />
      </line>
      
      {/* Flowing particles along the path */}
      <points ref={particlesRef} geometry={particleSystem}>
        <pointsMaterial
          size={0.02}
          color={color}
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          vertexColors={false}
          sizeAttenuation={true}
        />
      </points>
      
      {/* Glow effect tube */}
      <mesh ref={glowRef}>
        <tubeGeometry args={[curve, 64, thickness * 4, 8, false]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.2 * glowIntensity}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};
