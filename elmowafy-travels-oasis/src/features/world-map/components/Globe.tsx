import React, { useRef, Suspense, useState } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import { OrbitControls, useTexture, Html, shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { locations, Location } from '../locationsData';

// Vertex Shader for the atmosphere
const vertexShader = `
  varying vec3 vertexNormal;
  void main() {
    vertexNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Fragment Shader for the atmosphere
const fragmentShader = `
  varying vec3 vertexNormal;
  void main() {
    float intensity = pow(0.6 - dot(vertexNormal, vec3(0, 0, 1.0)), 2.0);
    gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
  }
`;

const AtmosphereMaterial = shaderMaterial(
  {},
  vertexShader,
  fragmentShader
);

extend({ AtmosphereMaterial });

const Atmosphere = () => (
  <mesh scale={1.1}>
    <sphereGeometry args={[1, 50, 50]} />
    <atmosphereMaterial
      blending={THREE.AdditiveBlending}
      side={THREE.BackSide}
    />
  </mesh>
);

// Helper function to convert lat/lng to 3D coordinates
const latLngToVector3 = (lat: number, lng: number, radius: number): [number, number, number] => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return [x, y, z];
};

const LocationMarker: React.FC<{ position: [number, number, number]; onHover: (isHovered: boolean) => void; }> = ({ position, onHover }) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [isHovered, setIsHovered] = useState(false);

  useFrame(() => {
    if (meshRef.current) {
      const scale = isHovered ? 1.5 : 1;
      meshRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <mesh
      position={position}
      ref={meshRef}
      onPointerOver={(e) => { e.stopPropagation(); setIsHovered(true); onHover(true); }}
      onPointerOut={() => { setIsHovered(false); onHover(false); }}
    >
      <sphereGeometry args={[0.015, 16, 16]} />
      <meshBasicMaterial color="#ff6347" toneMapped={false} />
    </mesh>
  );
};

const GlobeMesh: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [hoveredLocation, setHoveredLocation] = useState<Location | null>(null);
  const [dayMap, specularMap, cloudsMap] = useTexture([
    '/textures/earth_daymap.jpg',
    '/textures/earth_specular_map.jpg',
    '/textures/earth_clouds.jpg',
  ]);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.1;
    }
  });

  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight color="#f6f3ea" position={[2, 0, 5]} intensity={1.5} />

      <Atmosphere />

      {/* Clouds Layer */}
      <mesh>
        <sphereGeometry args={[1.005, 32, 32]} />
        <meshPhongMaterial map={cloudsMap} opacity={0.4} depthWrite={true} transparent={true} side={THREE.DoubleSide} />
      </mesh>

      {/* Earth Layer */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshPhongMaterial specularMap={specularMap} />
        <meshStandardMaterial map={dayMap} metalness={0.4} roughness={0.7} />
        <OrbitControls enableZoom={true} enablePan={true} enableRotate={true} zoomSpeed={0.6} panSpeed={0.5} rotateSpeed={0.4} />

        {/* Location Markers */}
        {locations.map((loc, index) => {
          const position = latLngToVector3(loc.lat, loc.lng, 1);
          return (
            <React.Fragment key={index}>
              <LocationMarker 
                position={position} 
                onHover={(isHovered) => setHoveredLocation(isHovered ? loc : null)} 
              />
              {hoveredLocation === loc && (
                <Html position={position}>
                  <div className="bg-slate-800/80 text-white text-xs p-2 rounded-md shadow-lg backdrop-blur-sm whitespace-nowrap">
                    {loc.name}
                  </div>
                </Html>
              )}
            </React.Fragment>
          );
        })}
      </mesh>
    </>
  );
};

const Globe: React.FC = () => {
  return (
    <Canvas camera={{ fov: 75, near: 0.1, far: 1000, position: [0, 0, 2.5] }}>
      <Suspense fallback={null}>
        <GlobeMesh />
      </Suspense>
    </Canvas>
  );
};

export default Globe;
