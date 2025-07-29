import { FamilyData, FamilyMember, RelationshipType } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, User, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FamilyTree2DProps {
  data: FamilyData;
  onMemberClick: (member: FamilyMember) => void;
  onAddMember?: (parentId?: string) => void;
  selectedMember?: FamilyMember | null;
}

export function FamilyTree2D({ 
  data, 
  onMemberClick, 
  onAddMember, 
  selectedMember 
}: FamilyTree2DProps) {
  // Group members by generation
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

  return (
    <div className="flex flex-col items-center p-4 overflow-auto h-full">
      {Object.entries(generations).map(([generation, members]) => (
        <div key={generation} className="w-full mb-8">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-muted-foreground">
              {generation === '0' ? 'Founders' : `Generation ${generation}`}
            </h3>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            {members.map((member) => {
              const children = data.relationships
                .filter(rel => rel.from === member.id && rel.type === 'parent')
                .map(rel => data.members.find(m => m.id === rel.to))
                .filter((m): m is FamilyMember => !!m);
                
              const hasChildren = children.length > 0;
              
              return (
                <div key={member.id} className="flex flex-col items-center">
                  <div className="flex flex-col items-center">
                    <Card 
                      className={cn(
                        "w-56 cursor-pointer hover:shadow-lg transition-all duration-200 border-2",
                        selectedMember?.id === member.id 
                          ? "border-primary shadow-lg scale-105" 
                          : "border-transparent"
                      )}
                      onClick={() => onMemberClick(member)}
                    >
                      <CardContent className="p-4 flex flex-col items-center">
                        <div className="relative">
                          <div className="rounded-full bg-primary/10 p-3 mb-2">
                            <User className="w-8 h-8 text-primary" />
                          </div>
                          {hasChildren && (
                            <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground rounded-full p-1">
                              <Users className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                        <h4 className="font-medium text-center">{member.name}</h4>
                        {member.arabicName && (
                          <p className="text-sm text-muted-foreground text-center font-arabic">
                            {member.arabicName}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                    
                    {onAddMember && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="mt-2 h-8 px-3 text-xs gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddMember(member.id);
                        }}
                      >
                        <Plus className="h-3 w-3" />
                        Add Family Member
                      </Button>
                    )}
                  </div>
                  
                  {/* Show connections to children */}
                  {hasChildren && (
                    <div className="mt-6 relative">
                      <div className="absolute top-0 left-1/2 w-0.5 h-6 bg-border -translate-x-1/2"></div>
                      <div className="flex space-x-8 mt-6">
                        {children.map((child) => (
                          <div key={child.id} className="relative">
                            <div className="absolute -top-6 left-1/2 w-8 h-6 border-l-2 border-b-2 border-border -translate-x-1/2"></div>
                            <div className="w-40">
                              <Card 
                                className="cursor-pointer hover:shadow-md transition-shadow"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onMemberClick(child);
                                }}
                              >
                                <CardContent className="p-3">
                                  <div className="flex items-center space-x-2">
                                    <div className="rounded-full bg-primary/10 p-2">
                                      <User className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="truncate">
                                      <p className="text-sm font-medium truncate">{child.name}</p>
                                      {child.arabicName && (
                                        <p className="text-xs text-muted-foreground truncate font-arabic">
                                          {child.arabicName}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      
      {onAddMember && Object.keys(generations).length === 0 && (
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => onAddMember()}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add First Family Member
        </Button>
      )}
    </div>
  );
}
