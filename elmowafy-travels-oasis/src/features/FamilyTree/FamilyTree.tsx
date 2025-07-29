import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { 
  Users, Plus, User, UserPlus, Calendar, MapPin, Phone, Search,
  Mail, Cake, Minimize, RotateCcw, Loader2, AlertCircle, Edit, Crown
} from 'lucide-react';
import apiService from '@/services/api';

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
}

interface Connection {
  from: string;
  to: string;
  type: 'parent' | 'spouse' | 'child';
}

const GENERATION_HEIGHT = 200;
const MEMBER_WIDTH = 180;
const MEMBER_HEIGHT = 120;

export const FamilyTree: React.FC = () => {
  // State for family tree data and UI
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFamilyData();
  }, []);

  // Filter members based on search term with proper type safety and performance
  const filteredMembers = useMemo(() => {
    if (!searchTerm.trim()) return members;
    const term = searchTerm.toLowerCase().trim();
    return members.filter((member) => {
      const nameMatch = member.name?.toLowerCase().includes(term) ?? false;
      const bioMatch = member.bio?.toLowerCase().includes(term) ?? false;
      const locationMatch = member.location?.toLowerCase().includes(term) ?? false;
      return nameMatch || bioMatch || locationMatch;
    });
  }, [members, searchTerm]);

  useEffect(() => {
    if (members.length > 0) {
      calculatePositions();
    }
  }, [members]);

  const loadFamilyData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch family members from the backend
      const response = await apiService.family.getMembers();
      
      if (response && Array.isArray(response)) {
        // Transform the API response to match our FamilyMember interface
        const formattedMembers: FamilyMember[] = response.map((member: any) => ({
          id: member._id || member.id,
          name: member.name,
          birthDate: member.birthDate,
          deathDate: member.deathDate,
          gender: member.gender as 'male' | 'female' | 'other',
          relationship: member.relationship || 'Family Member',
          parentIds: member.parents ? member.parents.map((p: any) => p._id || p.id) : [],
          spouseId: member.spouse ? (member.spouse._id || member.spouse.id) : undefined,
          children: member.children ? member.children.map((c: any) => c._id || c.id) : [],
          generation: member.generation || 0,
          x: 0,
          y: 0,
          photo: member.profilePicture,
          email: member.email,
          phone: member.phone,
          location: member.location,
          bio: member.bio
        }));
        
        setMembers(formattedMembers);
        
        // Generate connections based on relationships
        const memberConnections: Connection[] = [];
        
        formattedMembers.forEach(member => {
          // Add parent-child relationships
          member.parentIds.forEach(parentId => {
            memberConnections.push({
              from: parentId,
              to: member.id,
              type: 'parent'
            });
          });
          
          // Add spouse relationships (only add one direction to avoid duplicates)
          if (member.spouseId && member.id < member.spouseId) {
            memberConnections.push({
              from: member.id,
              to: member.spouseId,
              type: 'spouse'
            });
          }
        });
        
        setConnections(memberConnections);
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (err) {
      console.error('Failed to load family data:', err);
      setError('Failed to load family data. Please try again later.');
      toast({
        title: 'Error',
        description: 'Failed to load family data',
        variant: 'destructive'
      });
      
      // Fallback to demo data if API fails
      loadDemoData();
    } finally {
      setLoading(false);
    }
  };
  
  // Fallback function to load demo data if API fails
  const loadDemoData = () => {
    const demoMembers: FamilyMember[] = [
      {
        id: '1',
        name: 'Ahmad Ali Elmowafy',
        birthDate: '1945-03-15',
        gender: 'male',
        relationship: 'Grandfather',
        parentIds: [],
        children: ['3'],
        generation: 0,
        x: 0,
        y: 0,
        location: 'Cairo, Egypt',
        bio: 'Family patriarch and businessman'
      },
      {
        id: '2',
        name: 'Fatma Ali',
        birthDate: '1950-07-22',
        gender: 'female',
        relationship: 'Grandmother',
        parentIds: [],
        spouseId: '1',
        children: ['3'],
        generation: 0,
        x: 0,
        y: 0,
        location: 'Cairo, Egypt',
        bio: 'Teacher and mother of the family'
      },
      {
        id: '3',
        name: 'Mohamed Elmowafy',
        birthDate: '1975-12-10',
        gender: 'male',
        relationship: 'Father',
        parentIds: ['1', '2'],
        spouseId: '4',
        children: ['5', '6', '7'],
        generation: 1,
        x: 0,
        y: 0,
        location: 'Cairo, Egypt',
        bio: 'Software engineer and entrepreneur'
      },
      {
        id: '4',
        name: 'Hala El-Sherbini',
        birthDate: '1980-05-18',
        gender: 'female',
        relationship: 'Mother',
        parentIds: [],
        spouseId: '3',
        children: ['5', '6', '7'],
        generation: 1,
        x: 0,
        y: 0,
        location: 'Cairo, Egypt',
        bio: 'Doctor and community leader'
      },
      {
        id: '5',
        name: 'Amr Elmowafy',
        birthDate: '2005-08-22',
        gender: 'male',
        relationship: 'Son',
        parentIds: ['3', '4'],
        children: [],
        generation: 2,
        x: 0,
        y: 0,
        location: 'Cairo, Egypt',
        bio: 'University student and tech enthusiast'
      },
      {
        id: '6',
        name: 'Ali Elmowafy',
        birthDate: '2007-03-10',
        gender: 'male',
        relationship: 'Son',
        parentIds: ['3', '4'],
        children: [],
        generation: 2,
        x: 0,
        y: 0,
        location: 'Cairo, Egypt',
        bio: 'High school student and athlete'
      },
      {
        id: '7',
        name: 'Marwa Elmowafy',
        birthDate: '2010-11-05',
        gender: 'female',
        relationship: 'Daughter',
        parentIds: ['3', '4'],
        children: [],
        generation: 2,
        x: 0,
        y: 0,
        location: 'Cairo, Egypt',
        bio: 'Middle school student and artist'
      }
    ];

    setMembers(demoMembers);
  };

  const calculatePositions = useCallback(() => {
    if (members.length === 0) return;

    // Group members by generation
    const generations = members.reduce((acc, member) => {
      if (!acc[member.generation]) acc[member.generation] = [];
      acc[member.generation].push(member);
      return acc;
    }, {} as Record<number, FamilyMember[]>);

    // Calculate positions for each generation
    Object.entries(generations).forEach(([gen, genMembers]) => {
      const generation = parseInt(gen);
      const y = generation * GENERATION_HEIGHT;
      
      genMembers.forEach((member, index) => {
        const x = (index - (genMembers.length - 1) / 2) * (MEMBER_WIDTH + 50);
        member.x = x;
        member.y = y;
      });
    });

    setMembers([...members]);
  }, [members]);

  const handleMemberClick = useCallback((member: FamilyMember) => {
    setSelectedMember(member);
    // Center the view on the selected member with proper null checks
    const memberX = member.x ?? 0;
    const memberY = member.y ?? 0;
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 768;
    
    setPanX(-memberX * zoomLevel + viewportWidth / 2 - 100);
    setPanY(-memberY * zoomLevel + viewportHeight / 2 - 100);
  }, [zoomLevel]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
  }, [panX, panY]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPanX(e.clientX - dragStart.x);
      setPanY(e.clientY - dragStart.y);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoom = (delta: number) => {
    const newZoom = Math.max(0.3, Math.min(2, zoomLevel + delta));
    setZoomLevel(newZoom);
  };

  const resetView = () => {
    setZoomLevel(1);
    setPanX(0);
    setPanY(0);
  };

  const getAgeFromBirthDate = (birthDate: string) => {
    const birth = new Date(birthDate);
    const now = new Date();
    return now.getFullYear() - birth.getFullYear();
  };

  const getGenderColor = (gender: string) => {
    switch (gender) {
      case 'male': return 'from-blue-400 to-blue-600';
      case 'female': return 'from-pink-400 to-pink-600';
      default: return 'from-purple-400 to-purple-600';
    }
  };

  const getGenerationLabel = (generation: number) => {
    switch (generation) {
      case 0: return 'Grandparents';
      case 1: return 'Parents';
      case 2: return 'Children';
      case 3: return 'Grandchildren';
      default: return `Generation ${generation}`;
    }
  };

  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.relationship.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p>Loading family tree...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md border border-red-200">
        <div className="flex items-center space-x-2 text-red-700">
          <AlertCircle className="h-5 w-5" />
          <p>{error}</p>
        </div>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={loadFamilyData}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="text-center p-8">
        <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">No family members found</h3>
        <p className="text-gray-500 mb-4">Start by adding family members to build your family tree</p>
        <Button onClick={() => setShowAddForm(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Family Member
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 overflow-hidden">
      {/* Controls */}
      <div className="absolute top-4 left-4 z-10 space-y-2">
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
        
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => handleZoom(0.1)}>
              <Plus className="h-4 w-4" />
          </Button>
            <Button variant="outline" size="sm" onClick={() => handleZoom(-0.1)}>
              <Minimize className="h-4 w-4" />
          </Button>
            <Button variant="outline" size="sm" onClick={resetView}>
              <RotateCcw className="h-4 w-4" />
          </Button>
            <Button variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
              <UserPlus className="h-4 w-4" />
          </Button>
        </div>
          
          <div className="mt-2 text-xs text-gray-600">
            Zoom: {Math.round(zoomLevel * 100)}%
          </div>
        </Card>
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-4 z-10">
        <Card className="p-4 bg-white/90 backdrop-blur-sm">
          <h3 className="font-semibold mb-2">Generations</h3>
          <div className="space-y-1 text-sm">
            {Array.from(new Set(members.map(m => m.generation))).sort().map(gen => (
              <div key={gen} className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded bg-gradient-to-r ${
                  gen === 0 ? 'from-green-400 to-green-600' :
                  gen === 1 ? 'from-blue-400 to-blue-600' :
                  gen === 2 ? 'from-purple-400 to-purple-600' :
                  'from-gray-400 to-gray-600'
                }`}></div>
                <span>{getGenerationLabel(gen)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Family Tree Canvas */}
      <div 
        className="w-full h-full cursor-move relative overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div 
          className="relative"
          style={{
            transform: `translate(${panX}px, ${panY}px) scale(${zoomLevel})`,
            transformOrigin: 'center center'
          }}
        >
          {/* SVG for connection lines */}
          <svg 
            className="absolute inset-0 pointer-events-none"
            style={{ width: '4000px', height: '3000px', left: '2000px', top: '1500px' }}
          >
            {members.map(member => {
              const lines = [];
              
              // Draw lines to children
              member.children.forEach(childId => {
                const child = members.find(m => m.id === childId);
                if (child) {
                  lines.push(
                    <line
                      key={`${member.id}-${childId}`}
                      x1={member.x + MEMBER_WIDTH / 2}
                      y1={member.y + MEMBER_HEIGHT}
                      x2={child.x + MEMBER_WIDTH / 2}
                      y2={child.y}
                      stroke="#8b5cf6"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                  />
                );
              }
              });
              
              // Draw line to spouse
              if (member.spouseId) {
                const spouse = members.find(m => m.id === member.spouseId);
                if (spouse && member.id < spouse.id) { // Draw only once
                  lines.push(
                <line
                      key={`spouse-${member.id}-${spouse.id}`}
                      x1={member.x + MEMBER_WIDTH / 2}
                      y1={member.y + MEMBER_HEIGHT / 2}
                      x2={spouse.x + MEMBER_WIDTH / 2}
                      y2={spouse.y + MEMBER_HEIGHT / 2}
                      stroke="#ef4444"
                      strokeWidth="3"
                    />
                  );
                }
              }
              
              return lines;
            })}
          </svg>

          {/* Family Members */}
          <div className="relative" style={{ width: '4000px', height: '3000px', left: '2000px', top: '1500px' }}>
            {(searchTerm ? filteredMembers : members).map(member => (
              <Card
                key={member.id}
                className={`absolute cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 ${
                  selectedMember?.id === member.id ? 'ring-2 ring-purple-500' : ''
                } ${searchTerm && !filteredMembers.includes(member) ? 'opacity-30' : ''}`}
                style={{
                  left: member.x,
                  top: member.y,
                  width: MEMBER_WIDTH,
                  height: MEMBER_HEIGHT
                }}
                onClick={() => setSelectedMember(member)}
              >
                <CardContent className="p-3 h-full">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${getGenderColor(member.gender)} flex items-center justify-center relative`}>
                      {member.photo ? (
                        <img src={member.photo} alt={member.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <User className="h-6 w-6 text-white" />
                      )}
                      {member.generation === 0 && (
                        <Crown className="absolute -top-1 -right-1 h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">{member.name}</h3>
                      <p className="text-xs text-gray-500">{member.relationship}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    {member.birthDate && (
                      <div className="flex items-center text-xs text-gray-600">
                        <Cake className="h-3 w-3 mr-1" />
                        Age {getAgeFromBirthDate(member.birthDate)}
                      </div>
                    )}
                    {member.location && (
                      <div className="flex items-center text-xs text-gray-600">
                        <MapPin className="h-3 w-3 mr-1" />
                        <span className="truncate">{member.location}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between mt-2">
                    <Badge variant="outline" className="text-xs">
                      {getGenerationLabel(member.generation)}
                    </Badge>
                    <div className="flex space-x-1">
                      {member.children.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {member.children.length} child{member.children.length !== 1 ? 'ren' : ''}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Member Details Panel */}
      {selectedMember && (
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={selectedMember.photo} />
                    <AvatarFallback className={`bg-gradient-to-r ${getGenderColor(selectedMember.gender)} text-white`}>
                      {selectedMember.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
            <div>
                    <h3 className="text-xl font-bold">{selectedMember.name}</h3>
                    <p className="text-gray-600">{selectedMember.relationship}</p>
                  </div>
                </CardTitle>
                
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingMember(selectedMember)}>
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedMember(null)}>
                    ×
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Personal Info</h4>
                  <div className="space-y-2 text-sm">
                    {selectedMember.birthDate && (
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                        Born {new Date(selectedMember.birthDate).toLocaleDateString()}
                      </div>
                    )}
                    {selectedMember.location && (
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                        {selectedMember.location}
                      </div>
                    )}
                    {selectedMember.email && (
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-2 text-gray-500" />
                        {selectedMember.email}
                      </div>
                    )}
                    {selectedMember.phone && (
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2 text-gray-500" />
                        {selectedMember.phone}
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Family Connections</h4>
                  <div className="space-y-1 text-sm">
                    {selectedMember.parentIds.length > 0 && (
                      <div>
                        <span className="text-gray-600">Parents: </span>
                        {selectedMember.parentIds.map(parentId => {
                          const parent = members.find(m => m.id === parentId);
                          return parent ? parent.name : 'Unknown';
                        }).join(', ')}
                      </div>
                    )}
                    {selectedMember.spouseId && (
                      <div>
                        <span className="text-gray-600">Spouse: </span>
                        {members.find(m => m.id === selectedMember.spouseId)?.name || 'Unknown'}
                      </div>
                    )}
                    {selectedMember.children.length > 0 && (
                      <div>
                        <span className="text-gray-600">Children: </span>
                        {selectedMember.children.map(childId => {
                          const child = members.find(m => m.id === childId);
                          return child ? child.name : 'Unknown';
                        }).join(', ')}
                      </div>
              )}
            </div>
          </div>
                
                <div>
                  <h4 className="font-semibold mb-2">About</h4>
                  <p className="text-sm text-gray-600">
                    {selectedMember.bio || 'No biography available.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Member Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Add Family Member</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" placeholder="Enter full name" />
          </div>
              
              <div>
                <Label htmlFor="relationship">Relationship</Label>
                <Input id="relationship" placeholder="e.g., Father, Mother, Son, Daughter" />
    </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="birthDate">Birth Date</Label>
                  <Input id="birthDate" type="date" />
                </div>
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <select id="gender" className="w-full p-2 border rounded">
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="location">Location</Label>
                <Input id="location" placeholder="City, Country" />
      </div>
              
              <div>
                <Label htmlFor="bio">Biography</Label>
                <textarea
                  id="bio"
                  className="w-full p-2 border rounded min-h-[80px]"
                  placeholder="Tell us about this person..."
                />
              </div>
              
              <div className="flex space-x-2">
                <Button className="flex-1">Add Member</Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
        </div>
      </CardContent>
    </Card>
        </div>
      )}

      {/* Stats */}
      <div className="absolute bottom-4 right-4 z-10">
        <Card className="p-3 bg-white/90 backdrop-blur-sm">
          <div className="text-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total Members:</span>
              <span className="font-bold">{members.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Generations:</span>
              <span className="font-bold">{new Set(members.map(m => m.generation)).size}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default FamilyTree;
