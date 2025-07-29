import { useState, useCallback, useMemo } from 'react';
import { useFamilyData } from './useFamilyData';
import { FamilyTree2D } from './components/FamilyTree2D';
import { FamilyTree3D } from './components/FamilyTree3D';
import { Button } from '@/components/ui/button';
import { RefreshCw, Users, UserPlus, LayoutGrid, ListTree, Settings } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { FamilyData, FamilyTreeViewType, FamilyMember } from './types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FamilyMemberForm } from './FamilyMemberForm';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Re-export all the necessary components and types
export * from './types';
export * from './useFamilyData';
export * from './familyService';

export interface FamilyTreeViewProps {
  defaultView?: FamilyTreeViewType;
  initialData?: FamilyData;
  onViewChange?: (view: FamilyTreeViewType) => void;
  onMemberClick?: (member: FamilyMember) => void;
}

export function FamilyTreeView({
  defaultView = '2d',
  initialData,
  onViewChange,
  onMemberClick
}: FamilyTreeViewProps) {
  const [view, setView] = useState<FamilyTreeViewType>(defaultView);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { toast } = useToast();
  
  const { 
    familyData, 
    loading, 
    error,
    refresh,
    addMember,
    updateMember,
    removeMember
  } = useFamilyData();

  // Use initialData if provided, otherwise use data from the hook
  const displayData = useMemo(() => 
    initialData || familyData || { members: [], relationships: [] },
    [initialData, familyData]
  );
  

  
  const handleMemberClick = useCallback((member: FamilyMember) => {
    setSelectedMember(member);
    if (onMemberClick) {
      onMemberClick(member);
    }
  }, [onMemberClick]);
  
  // Handle adding a new member with a relationship to the selected member
  const handleAddMemberWithRelationship = useCallback((parentId?: string) => {
    if (parentId) {
      const parent = displayData.members.find((m: FamilyMember) => m.id === parentId);
      if (parent) {
        setSelectedMember(parent);
      }
    }
    setIsAddMemberOpen(true);
  }, [displayData.members]);

  const handleViewChange = useCallback((newView: FamilyTreeViewType) => {
    setView(newView);
    onViewChange?.(newView);
  }, [onViewChange]);

  const handleAddMember = useCallback(async (memberData: Omit<FamilyMember, 'id'>) => {
    try {
      await addMember(memberData);
      toast({
        title: 'Success',
        description: 'Family member added successfully',
        variant: 'default',
      });
      setIsAddMemberOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add family member',
        variant: 'destructive',
      });
    }
  }, [addMember, toast]);
  
  const handleUpdateMember = useCallback(async (memberId: string, updates: Partial<FamilyMember>) => {
    try {
      await updateMember(memberId, updates);
      toast({
        title: 'Success',
        description: 'Family member updated successfully',
        variant: 'default',
      });
      return true;
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update family member',
        variant: 'destructive',
      });
      return false;
    }
  }, [updateMember, toast]);
  
  // Get member details for the selected member
  const memberDetails = useMemo(() => {
    if (!selectedMember) return null;
    return displayData.members.find((member: FamilyMember) => member.id === selectedMember.id) || null;
  }, [selectedMember, displayData.members]);
  
  const handleDeleteMember = useCallback(async (memberId: string) => {
    try {
      await removeMember(memberId);
      setSelectedMember(null);
      toast({
        title: 'Success',
        description: 'Family member removed successfully',
        variant: 'default',
      });
      return true;
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove family member',
        variant: 'destructive',
      });
      return false;
    }
  }, [removeMember, toast]);

  if (loading && !displayData?.members?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin mb-2" />
        <p className="text-muted-foreground">Loading family tree...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500 mb-4">Error loading family data: {error.message}</p>
        <Button 
          onClick={refresh}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header with view controls */}
      <div className="flex items-center justify-between p-3 border-b bg-card">
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Elmowafy Family Tree</h2>
        </div>
        
        <div className="flex items-center space-x-2">
          <Tabs 
            value={view} 
            onValueChange={(value) => handleViewChange(value as FamilyTreeViewType)}
            className="mr-2"
          >
            <TabsList className="h-9">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger value="2d" className="flex items-center gap-2">
                      <ListTree className="w-4 h-4" />
                      <span className="hidden sm:inline">2D View</span>
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Switch to 2D Tree View</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger value="3d" className="flex items-center gap-2">
                      <LayoutGrid className="w-4 h-4" />
                      <span className="hidden sm:inline">3D View</span>
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Switch to 3D Interactive View</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </TabsList>
          </Tabs>
          
          <div className="h-6 w-px bg-border mx-1" />
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-9 w-9"
                  onClick={refresh}
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh Family Data</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-9 w-9"
                  onClick={() => setIsSettingsOpen(true)}
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>View Settings</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="h-9">
                      <UserPlus className="w-4 h-4 mr-1.5" />
                      <span className="hidden sm:inline">Add Member</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add New Family Member</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                      <FamilyMemberForm 
                        onSubmit={handleAddMember} 
                        onCancel={() => setIsAddMemberOpen(false)}
                        initialData={{
                          gender: 'male',
                          isAlive: true,
                          ...(selectedMember ? { 
                            relationships: [{
                              type: 'child',
                              from: selectedMember.id,
                              to: ''
                            }]
                          } : {})
                        }}
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              </TooltipTrigger>
              <TooltipContent>Add New Family Member</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Family Tree View */}
        <div className={`flex-1 ${selectedMember ? 'md:w-2/3' : 'w-full'} overflow-auto`}>
          {view === '2d' ? (
            <FamilyTree2D 
              data={displayData} 
              selectedMember={selectedMember}
              onMemberClick={handleMemberClick}
              onAddMember={handleAddMemberWithRelationship}
            />
          ) : (
            <FamilyTree3D 
              data={displayData}
              selectedMember={selectedMember}
              onMemberClick={handleMemberClick}
              onAddMember={handleAddMemberWithRelationship}
            />
          )}
        </div>
        
        {/* Member Details Panel */}
        {selectedMember && memberDetails && (
          <div className="md:w-1/3 border-t md:border-t-0 md:border-l bg-card overflow-auto">
            <div className="p-4">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold">Member Details</h3>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => setSelectedMember(null)}
                >
                  &times;
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-lg font-medium">{memberDetails.name}</h4>
                    {memberDetails.arabicName && (
                      <p className="text-sm text-muted-foreground font-arabic">
                        {memberDetails.arabicName}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Gender</p>
                    <p className="capitalize">{memberDetails.gender || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <p>{memberDetails.isAlive ? 'Living' : 'Deceased'}</p>
                  </div>
                  {memberDetails.birthDate && (
                    <div>
                      <p className="text-muted-foreground">Birth Date</p>
                      <p>{new Date(memberDetails.birthDate).toLocaleDateString()}</p>
                    </div>
                  )}
                  {memberDetails.deathDate && !memberDetails.isAlive && (
                    <div>
                      <p className="text-muted-foreground">Death Date</p>
                      <p>{new Date(memberDetails.deathDate).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
                
                {memberDetails.bio && (
                  <div>
                    <p className="text-muted-foreground text-sm mb-1">Biography</p>
                    <p className="text-sm">{memberDetails.bio}</p>
                  </div>
                )}
                
                <div className="flex justify-end space-x-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      // Implement edit functionality
                      setIsAddMemberOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={async () => {
                      if (window.confirm('Are you sure you want to remove this family member?')) {
                        await handleDeleteMember(selectedMember.id);
                      }
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Family Tree Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <h4 className="font-medium mb-2">View Options</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="showPhotos" className="rounded" defaultChecked />
                  <label htmlFor="showPhotos" className="text-sm">Show profile photos</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="animateTransitions" className="rounded" defaultChecked />
                  <label htmlFor="animateTransitions" className="text-sm">Animate transitions</label>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Data Management</h4>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  Export Family Tree
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  Import Family Tree
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start text-destructive">
                  Reset to Default
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
