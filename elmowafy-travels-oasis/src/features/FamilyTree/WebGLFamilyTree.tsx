import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  OrbitControls, 
  Text, 
  Sphere, 
  Box, 
  Line, 
  Html,
  Environment,
  PerspectiveCamera,
  useTexture,
  Plane
} from '@react-three/drei';
import * as THREE from 'three';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, Search, RotateCcw, Play, Pause, 
  User, Crown, Heart, MapPin, Calendar,
  Maximize, Minimize, Settings, Info
} from 'lucide-react';

interface FamilyMember {
  id: string;
  name: string;
  birthDate?: string;
  deathDate?: string;
  gender: 'male' | 'female' | 'other';
  relationship: string;
  parentIds: string[];
  spouseId?: string;
  children: string[];
  photo?: string;
  email?: string;
  phone?: string;
  location?: string;
  bio?: string;
  generation: number;
  x: number;
  y: number;
  z: number;
  color?: string;
}

interface FamilyConnection {
  from: string;
  to: string;
  type: 'parent' | 'spouse' | 'child';
  points: THREE.Vector3[];
}

// 3D Node Component
const FamilyNode: React.FC<{
  member: FamilyMember;
  isSelected: boolean;
  onSelect: (member: FamilyMember) => void;
  position: [number, number, number];
  isHighlighted: boolean;
}> = ({ member, isSelected, onSelect, position, isHighlighted }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  useFrame((state) => {
    if (meshRef.current) {
      // Gentle floating animation
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime + position[0]) * 0.1;
      
      // Pulsing effect for selected node
      if (isSelected) {
        const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
        meshRef.current.scale.set(scale, scale, scale);
      } else {
        meshRef.current.scale.set(1, 1, 1);
      }
      
      // Highlight glow
      if (isHighlighted || hovered) {
        meshRef.current.material.emissive.setHex(0x444444);
      } else {
        meshRef.current.material.emissive.setHex(0x000000);
      }
    }
  });

  const getNodeColor = () => {
    if (member.color) return member.color;
    switch (member.gender) {
      case 'male': return '#3B82F6';
      case 'female': return '#EC4899';
      default: return '#8B5CF6';
    }
  };

  const getNodeGeometry = () => {
    switch (member.generation) {
      case 0: return <Sphere args={[0.8, 32, 32]} />; // Grandparents - sphere
      case 1: return <Box args={[1.2, 1.2, 1.2]} />; // Parents - cube
      case 2: return <Sphere args={[0.6, 16, 16]} />; // Children - smaller sphere
      default: return <Box args={[0.8, 0.8, 0.8]} />; // Others - small cube
    }
  };

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={() => onSelect(member)}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        {getNodeGeometry()}
        <meshStandardMaterial
          color={getNodeColor()}
          roughness={0.3}
          metalness={0.7}
          transparent
          opacity={0.9}
        />
      </mesh>
      
      {/* Crown for generation 0 */}
      {member.generation === 0 && (
        <mesh position={[0, 1.2, 0]}>
          <Sphere args={[0.2, 8, 8]} />
          <meshStandardMaterial color="#FFD700" roughness={0.1} metalness={0.9} />
        </mesh>
      )}
      
      {/* Name label */}
      <Html
        position={[0, -1.5, 0]}
        center
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <div className={`bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 text-sm font-medium shadow-lg transition-all duration-200 ${
          isSelected ? 'ring-2 ring-purple-500 scale-110' : ''
        } ${hovered ? 'scale-105' : ''}`}>
          <div className="text-gray-800">{member.name}</div>
          <div className="text-xs text-gray-500">{member.relationship}</div>
        </div>
      </Html>
      
      {/* Relationship indicators */}
      {member.spouseId && (
        <mesh position={[1.5, 0, 0]}>
          <Sphere args={[0.1, 8, 8]} />
          <meshStandardMaterial color="#EF4444" />
        </mesh>
      )}
    </group>
  );
};

// 3D Connection Lines Component
const ConnectionLines: React.FC<{
  connections: FamilyConnection[];
  members: FamilyMember[];
}> = ({ connections, members }) => {
  const lines = useMemo(() => {
    return connections.map(connection => {
      const fromMember = members.find(m => m.id === connection.from);
      const toMember = members.find(m => m.id === connection.to);
      
      if (!fromMember || !toMember) return null;
      
      const points = [
        new THREE.Vector3(fromMember.x, fromMember.y, fromMember.z),
        new THREE.Vector3(toMember.x, toMember.y, toMember.z),
      ];
      
      const color = connection.type === 'spouse' ? '#EF4444' : 
                   connection.type === 'parent' ? '#8B5CF6' : '#10B981';
      
      return { points, color, type: connection.type };
    }).filter(Boolean);
  }, [connections, members]);

  return (
    <>
      {lines.map((line, index) => (
        <Line
          key={index}
          points={line!.points}
          color={line!.color}
          lineWidth={line!.type === 'spouse' ? 4 : 2}
          transparent
          opacity={0.7}
        />
      ))}
    </>
  );
};

// Particle System for Ambiance
const ParticleSystem: React.FC = () => {
  const pointsRef = useRef<THREE.Points>(null);
  const particleCount = 100;
  
  const particles = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }
    return positions;
  }, []);
  
  useFrame(() => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += 0.001;
    }
  });
  
  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={particles}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#8B5CF6" transparent opacity={0.3} />
    </points>
  );
};

// Timeline Controller
const TimelineController: React.FC<{
  onTimelineChange: (year: number) => void;
  currentYear: number;
  minYear: number;
  maxYear: number;
}> = ({ onTimelineChange, currentYear, minYear, maxYear }) => {
  return (
    <div className="absolute bottom-20 left-4 right-4 z-20">
      <Card className="p-4 bg-white/90 backdrop-blur-sm">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium">Timeline:</span>
          <input
            type="range"
            min={minYear}
            max={maxYear}
            value={currentYear}
            onChange={(e) => onTimelineChange(parseInt(e.target.value))}
            className="flex-1"
          />
          <span className="text-sm font-bold w-16">{currentYear}</span>
        </div>
      </Card>
    </div>
  );
};

// Main WebGL Family Tree Component
export const WebGLFamilyTree: React.FC = () => {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [connections, setConnections] = useState<FamilyConnection[]>([]);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAnimating, setIsAnimating] = useState(true);
  const [currentYear, setCurrentYear] = useState(2024);
  const [highlightedMembers, setHighlightedMembers] = useState<string[]>([]);
  const [view3D, setView3D] = useState(true);

  useEffect(() => {
    loadFamilyData();
  }, []);

  useEffect(() => {
    calculatePositions();
    generateConnections();
  }, [members]);

  useEffect(() => {
    // Filter members based on search
    if (searchTerm) {
      const filtered = members.filter(member =>
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.relationship.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setHighlightedMembers(filtered.map(m => m.id));
    } else {
      setHighlightedMembers([]);
    }
  }, [searchTerm, members]);

  const loadFamilyData = () => {
    const demoMembers: FamilyMember[] = [
      {
        id: '1',
        name: 'Ahmed Al-Elmowafi',
        birthDate: '1945-03-15',
        gender: 'male',
        relationship: 'Grandfather',
        parentIds: [],
        children: ['3', '4'],
        generation: 0,
        x: 0, y: 0, z: 0,
        location: 'Cairo, Egypt',
        bio: 'Family patriarch and businessman',
        color: '#2563EB'
      },
      {
        id: '2',
        name: 'Fatima Al-Elmowafi',
        birthDate: '1950-07-22',
        gender: 'female',
        relationship: 'Grandmother',
        parentIds: [],
        spouseId: '1',
        children: ['3', '4'],
        generation: 0,
        x: 0, y: 0, z: 0,
        location: 'Cairo, Egypt',
        bio: 'Teacher and mother of the family',
        color: '#EC4899'
      },
      {
        id: '3',
        name: 'Mohamed Al-Elmowafi',
        birthDate: '1975-12-10',
        gender: 'male',
        relationship: 'Father',
        parentIds: ['1', '2'],
        spouseId: '5',
        children: ['6', '7'],
        generation: 1,
        x: 0, y: 0, z: 0,
        location: 'Dubai, UAE',
        bio: 'Engineer and family man',
        color: '#3B82F6'
      },
      {
        id: '4',
        name: 'Amira Al-Elmowafi',
        birthDate: '1978-04-05',
        gender: 'female',
        relationship: 'Aunt',
        parentIds: ['1', '2'],
        children: ['8'],
        generation: 1,
        x: 0, y: 0, z: 0,
        location: 'London, UK',
        bio: 'Doctor and researcher',
        color: '#EC4899'
      },
      {
        id: '5',
        name: 'Layla Al-Elmowafi',
        birthDate: '1980-09-18',
        gender: 'female',
        relationship: 'Mother',
        parentIds: [],
        spouseId: '3',
        children: ['6', '7'],
        generation: 1,
        x: 0, y: 0, z: 0,
        location: 'Dubai, UAE',
        bio: 'Artist and mother',
        color: '#F59E0B'
      },
      {
        id: '6',
        name: 'Sarah Al-Elmowafi',
        birthDate: '2005-06-12',
        gender: 'female',
        relationship: 'Daughter',
        parentIds: ['3', '5'],
        children: [],
        generation: 2,
        x: 0, y: 0, z: 0,
        location: 'Dubai, UAE',
        bio: 'Student and aspiring artist',
        color: '#EC4899'
      },
      {
        id: '7',
        name: 'Omar Al-Elmowafi',
        birthDate: '2008-11-30',
        gender: 'male',
        relationship: 'Son',
        parentIds: ['3', '5'],
        children: [],
        generation: 2,
        x: 0, y: 0, z: 0,
        location: 'Dubai, UAE',
        bio: 'Student and football enthusiast',
        color: '#3B82F6'
      },
      {
        id: '8',
        name: 'Yasmin Al-Elmowafi',
        birthDate: '2010-02-14',
        gender: 'female',
        relationship: 'Cousin',
        parentIds: ['4'],
        children: [],
        generation: 2,
        x: 0, y: 0, z: 0,
        location: 'London, UK',
        bio: 'Young student',
        color: '#EC4899'
      }
    ];

    setMembers(demoMembers);
  };

  const calculatePositions = useCallback(() => {
    if (members.length === 0) return;

    // Group by generation
    const generations = members.reduce((acc, member) => {
      if (!acc[member.generation]) acc[member.generation] = [];
      acc[member.generation].push(member);
      return acc;
    }, {} as Record<number, FamilyMember[]>);

    // Calculate 3D positions
    Object.entries(generations).forEach(([gen, genMembers]) => {
      const generation = parseInt(gen);
      const y = generation * -8; // Vertical spacing between generations
      
      genMembers.forEach((member, index) => {
        const angle = (index / genMembers.length) * Math.PI * 2;
        const radius = Math.max(genMembers.length * 2, 6);
        
        member.x = Math.cos(angle) * radius;
        member.y = y;
        member.z = Math.sin(angle) * radius;
      });
    });

    setMembers([...members]);
  }, [members]);

  const generateConnections = useCallback(() => {
    const newConnections: FamilyConnection[] = [];

    members.forEach(member => {
      // Parent-child connections
      member.children.forEach(childId => {
        const child = members.find(m => m.id === childId);
        if (child) {
          newConnections.push({
            from: member.id,
            to: childId,
            type: 'parent',
            points: [
              new THREE.Vector3(member.x, member.y, member.z),
              new THREE.Vector3(child.x, child.y, child.z)
            ]
          });
        }
      });

      // Spouse connections
      if (member.spouseId) {
        const spouse = members.find(m => m.id === member.spouseId);
        if (spouse && member.id < spouse.id) { // Avoid duplicate connections
          newConnections.push({
            from: member.id,
            to: member.spouseId,
            type: 'spouse',
            points: [
              new THREE.Vector3(member.x, member.y, member.z),
              new THREE.Vector3(spouse.x, spouse.y, spouse.z)
            ]
          });
        }
      }
    });

    setConnections(newConnections);
  }, [members]);

  const resetCamera = () => {
    // This will be handled by OrbitControls reset
    setSelectedMember(null);
  };

  const toggleAnimation = () => {
    setIsAnimating(!isAnimating);
  };

  const getYearRange = () => {
    const birthYears = members
      .filter(m => m.birthDate)
      .map(m => new Date(m.birthDate!).getFullYear());
    
    const minYear = Math.min(...birthYears, 1940);
    const maxYear = Math.max(...birthYears, new Date().getFullYear());
    
    return { minYear, maxYear };
  };

  const { minYear, maxYear } = getYearRange();

  return (
    <div className="w-full h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 overflow-hidden relative">
      {/* Controls */}
      <div className="absolute top-4 left-4 z-20 space-y-2">
        <Card className="p-4 bg-white/90 backdrop-blur-sm">
          <div className="flex items-center space-x-2 mb-3">
            <Search className="h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search family members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-48"
            />
          </div>
          
          <div className="flex items-center space-x-2 mb-2">
            <Button variant="outline" size="sm" onClick={resetCamera}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={toggleAnimation}>
              {isAnimating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setView3D(!view3D)}
            >
              {view3D ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
          </div>
          
          <div className="text-xs text-gray-600">
            Members: {members.length} | Generations: {new Set(members.map(m => m.generation)).size}
          </div>
        </Card>
      </div>

      {/* 3D Scene */}
      <Canvas
        camera={{ position: [0, 5, 15], fov: 60 }}
        style={{ background: 'transparent' }}
      >
        <Environment preset="sunset" />
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          autoRotate={isAnimating}
          autoRotateSpeed={0.5}
          maxDistance={50}
          minDistance={5}
        />
        
        {/* Particle System */}
        <ParticleSystem />
        
        {/* Family Nodes */}
        {members.map(member => (
          <FamilyNode
            key={member.id}
            member={member}
            isSelected={selectedMember?.id === member.id}
            onSelect={setSelectedMember}
            position={[member.x, member.y, member.z]}
            isHighlighted={highlightedMembers.includes(member.id)}
          />
        ))}
        
        {/* Connection Lines */}
        <ConnectionLines connections={connections} members={members} />
      </Canvas>

      {/* Timeline Controller */}
      <TimelineController
        onTimelineChange={setCurrentYear}
        currentYear={currentYear}
        minYear={minYear}
        maxYear={maxYear}
      />

      {/* Member Details Panel */}
      {selectedMember && (
        <div className="absolute bottom-4 left-4 right-4 z-20">
          <Card className="bg-white/95 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedMember.photo} />
                    <AvatarFallback 
                      className="text-white text-xl font-bold"
                      style={{ backgroundColor: selectedMember.color }}
                    >
                      {selectedMember.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-2xl font-bold">{selectedMember.name}</h3>
                    <p className="text-gray-600 text-lg">{selectedMember.relationship}</p>
                    {selectedMember.location && (
                      <div className="flex items-center text-gray-500 mt-1">
                        <MapPin className="h-4 w-4 mr-1" />
                        {selectedMember.location}
                      </div>
                    )}
                  </div>
                </div>
                
                <Button variant="ghost" onClick={() => setSelectedMember(null)}>
                  ×
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Family Connections</h4>
                  <div className="space-y-2">
                    {selectedMember.children.length > 0 && (
                      <Badge variant="outline" className="mr-2">
                        {selectedMember.children.length} Children
                      </Badge>
                    )}
                    {selectedMember.spouseId && (
                      <Badge variant="outline" className="mr-2">
                        Married
                      </Badge>
                    )}
                    <Badge variant="secondary">
                      Generation {selectedMember.generation}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">About</h4>
                  <p className="text-gray-600">
                    {selectedMember.bio || 'No biography available.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Legend */}
      <div className="absolute top-4 right-4 z-20">
        <Card className="p-4 bg-white/90 backdrop-blur-sm">
          <h3 className="font-semibold mb-2">3D Family Tree</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded bg-blue-500"></div>
              <span>Male</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded bg-pink-500"></div>
              <span>Female</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-1 bg-purple-500"></div>
              <span>Parent-Child</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-1 bg-red-500"></div>
              <span>Spouse</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default WebGLFamilyTree; 