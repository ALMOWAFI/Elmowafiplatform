import { FamilyData, FamilyMember, RelationshipType } from '../types';
import { Button } from '@/components/ui/button';
import { Rotate3D, User, Plus, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useRef, useMemo } from 'react';
import '../../family-tree.css';

export interface FamilyTree3DProps {
  data: FamilyData;
  onMemberClick: (member: FamilyMember) => void;
  onAddMember?: (parentId?: string) => void;
  selectedMember?: FamilyMember | null;
}

// Extend the FamilyMember type with 3D position data
interface PositionedMember extends FamilyMember {
  position: { x: number; y: number; z: number };
  scale: number;
  opacity: number;
}

export function FamilyTree3D({ 
  data, 
  onMemberClick, 
  onAddMember,
  selectedMember 
}: FamilyTree3DProps) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const rotationRef = useRef(0);
  
  // Handle 3D rotation
  const rotateScene = (degrees: number) => {
    if (sceneRef.current) {
      rotationRef.current = (rotationRef.current + degrees) % 360;
      sceneRef.current.style.transform = `rotateY(${rotationRef.current}deg)`;
    }
  };
  
  // Initialize rotation
  useEffect(() => {
    rotateScene(0);
  }, []);
  // In a real implementation, this would use Three.js or similar for 3D visualization
  // This is a placeholder with a 3D-like appearance using CSS transforms
  
  // Group members by generation for the 3D effect
  const generations: { [key: number]: FamilyMember[] } = {};
  
  // First pass: Identify root members (those with no parents)
  const rootMembers = data.members.filter(member => {
    return !data.relationships.some(rel => 
      rel.to === member.id && rel.type === RelationshipType.CHILD
    );
  });
  
  // Assign generations (simple BFS approach)
  const queue: { member: FamilyMember; level: number }[] = 
    rootMembers.map(member => ({ member, level: 0 }));
  
  const visited = new Set<string>();
  
  while (queue.length > 0) {
    const { member, level } = queue.shift()!;
    
    if (visited.has(member.id)) continue;
    visited.add(member.id);
    
    if (!generations[level]) {
      generations[level] = [];
    }
    generations[level].push(member);
    
    // Find all children of this member
    const children = data.relationships
      .filter(rel => rel.from === member.id && rel.type === RelationshipType.PARENT)
      .map(rel => data.members.find(m => m.id === rel.to))
      .filter((m): m is FamilyMember => !!m);
    
    // Add children to the next generation
    queue.push(...children.map(child => ({
      member: child,
      level: level + 1
    })));
  }
  
  // Memoize the positioned members to prevent recalculations
  const positionedMembers: PositionedMember[] = useMemo(() => 
    Object.entries(generations).flatMap(([level, members]) => {
    const levelNum = parseInt(level);
    const z = levelNum * 100; // Depth in the 3D space
    const angleStep = (2 * Math.PI) / Math.max(1, members.length);
    const radius = 150 + (levelNum * 50);
    
    return members.map((member, index) => {
      const angle = index * angleStep;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius * 0.5; // Flatten the Y axis a bit
      
      return {
        ...member,
        position: { x, y, z },
        scale: 1 - (levelNum * 0.1), // Scale down with depth
        opacity: 1 - (levelNum * 0.1) // Fade with depth
      };
    });
  }), [generations, data.relationships]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-gradient-to-b from-background to-muted/30 family-tree-3d">
      {/* 3D Scene Container */}
      <div className="perspective-1000 w-full h-full">
        <div 
          ref={sceneRef}
          className="relative w-full h-full transition-transform duration-1000 origin-center"
          style={{
            transformStyle: 'preserve-3d',
            transform: 'rotateY(0deg)'
          }}
        >
          {/* 3D Elements */}
          {positionedMembers.map((member) => {
            const isSelected = selectedMember?.id === member.id;
            const hasChildren = data.relationships.some(
              rel => rel.from === member.id && rel.type === RelationshipType.PARENT
            );
            
            return (
              <div
                key={member.id}
                className={cn(
                  "absolute cursor-pointer transition-all duration-300 flex flex-col items-center",
                  isSelected ? "z-10" : "hover:z-5"
                )}
                style={{
                  transform: `translate3d(calc(50% + ${member.position.x}px), calc(50% + ${member.position.y}px), ${member.position.z}px) scale(${member.scale})`,
                  opacity: member.opacity,
                  transformStyle: 'preserve-3d',
                }}
                onClick={() => onMemberClick(member)}
              >
                <div 
                  className={cn(
                    "relative rounded-full bg-primary/10 p-3 mb-2 transition-all duration-300",
                    isSelected 
                      ? "ring-4 ring-primary ring-offset-2 scale-110" 
                      : "hover:ring-2 hover:ring-primary hover:ring-offset-2 hover:scale-105"
                  )}
                >
                  <User className="w-8 h-8 text-primary" />
                  {hasChildren && (
                    <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1">
                      <Users className="h-3 w-3" />
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded">
                    {member.name.split(' ')[0]}
                  </p>
                  {member.arabicName && (
                    <p className="text-xs text-muted-foreground font-arabic bg-background/50 backdrop-blur-sm px-1 rounded">
                      {member.arabicName.split(' ')[0]}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
          
          {/* Connection lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {data.relationships
              .filter(rel => rel.type === RelationshipType.PARENT)
              .map((rel, index) => {
                const parent = positionedMembers.find(m => m.id === rel.from);
                const child = positionedMembers.find(m => m.id === rel.to);
                
                if (!parent || !child) return null;
                
                return (
                  <line
                    key={index}
                    x1={parent.position.x}
                    y1={parent.position.y}
                    x2={child.position.x}
                    y2={child.position.y}
                    className="stroke-primary/30"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                  />
                );
              })}
          </svg>
        </div>
      </div>
      
      {/* Controls */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
        <Button 
          variant="outline" 
          size="sm"
          className="backdrop-blur-sm bg-background/50"
          onClick={() => rotateScene(45)}
        >
          <Rotate3D className="w-4 h-4 mr-2" />
          Rotate View
        </Button>
        
        {onAddMember && (
          <Button 
            size="sm"
            className="backdrop-blur-sm"
            onClick={() => onAddMember(selectedMember?.id)}
          >
            <Plus className="w-4 h-4 mr-2" />
            {selectedMember ? 'Add Family Member' : 'Add Family Member'}
          </Button>
        )}
      </div>
      
      {/* 3D View Notice */}
      <div className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-border/50">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Rotate3D className="w-4 h-4 text-primary" />
          <span>3D Family Tree View</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          This is a preview of the 3D family tree. The full version will include interactive 3D visualization.
        </p>
      </div>
    </div>
  );
}
