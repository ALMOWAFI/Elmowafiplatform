import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { aiService } from '@/services/aiService';
import { fetchFamilyData } from '@/features/family/familyService';
import { TravelPreferencesForm } from '@/components/travel/TravelPreferencesForm';
import { TravelRecommendations } from '@/components/travel/TravelRecommendations';
import { TravelRecommendation } from '@/services/aiService';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export function TravelPlannerPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [recommendations, setRecommendations] = useState<TravelRecommendation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [familyMembers, setFamilyMembers] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoadingFamily, setIsLoadingFamily] = useState(true);
  const [familyError, setFamilyError] = useState<string | null>(null);

  // Fetch family members from the family service
  useEffect(() => {
    const loadFamilyMembers = async () => {
      try {
        setIsLoadingFamily(true);
        const familyData = await fetchFamilyData();
        
        // Transform family members to the format expected by the form
        const members = familyData.members.map((member: any) => ({
          id: member.id || member._id,
          name: member.name || 'Unnamed Family Member',
        }));
        
        // Add current user if not already in the list
        if (user?.id && !members.some((m: { id: string }) => m.id === user.id)) {
          members.unshift({
            id: user.id,
            name: (user as any).name || 'You',
          });
        }
        
        setFamilyMembers(members);
      } catch (error) {
        console.error('Error loading family members:', error);
        setFamilyError('Failed to load family members. Please try again later.');
        
        // Fallback to just the current user
        if (user?.id) {
          setFamilyMembers([{
            id: user.id,
            name: (user as any).name || 'You',
          }]);
        }
      } finally {
        setIsLoadingFamily(false);
      }
    };

    loadFamilyMembers();
  }, [user]);

  const handleSubmit = async (data: any) => {
    if (isLoadingFamily) {
      toast({
        title: 'Loading',
        description: 'Please wait while we load your family information...',
      });
      return;
    }

    if (familyError) {
      toast({
        title: 'Error',
        description: 'There was an issue loading your family information. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Include the current user if not already selected
      const members = data.familyMembers.includes(user?.id)
        ? data.familyMembers
        : [...data.familyMembers, user?.id].filter(Boolean);

      const response = await aiService.getTravelRecommendations({
        ...data,
        familyMembers: members,
      });
      
      setRecommendations(response);
      
      // Switch to the recommendations tab programmatically
      const tab = document.querySelector('button[data-value="recommendations"]') as HTMLElement;
      if (tab) {
        const clickEvent = new MouseEvent('click', {
          view: window,
          bubbles: true,
          cancelable: true
        });
        tab.dispatchEvent(clickEvent);
      }
      
      toast({
        title: 'Success!',
        description: 'Your travel recommendations are ready!',
      });
    } catch (err) {
      console.error('Error getting travel recommendations:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to get travel recommendations';
      setError(errorMessage);
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Family Travel Planner</h1>
      
      <Tabs defaultValue="plan" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mb-8">
          <TabsTrigger value="plan" data-value="plan">Plan Your Trip</TabsTrigger>
          <TabsTrigger value="recommendations" data-value="recommendations" disabled={!recommendations}>
            Your Recommendations
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="plan">
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-6">Tell us about your trip</h2>
            {isLoadingFamily ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
                <span>Loading family information...</span>
              </div>
            ) : familyError ? (
              <div className="p-4 bg-red-50 rounded-md border border-red-200">
                <p className="text-red-700">{familyError}</p>
                <p className="text-sm text-red-600 mt-2">You can still proceed with just yourself as a traveler.</p>
                <TravelPreferencesForm 
                  onSubmit={handleSubmit} 
                  isLoading={isLoading} 
                  familyMembers={familyMembers} 
                />
              </div>
            ) : (
              <TravelPreferencesForm 
                onSubmit={handleSubmit} 
                isLoading={isLoading} 
                familyMembers={familyMembers} 
              />
            )}
          </Card>
        </TabsContent>
        
        <TabsContent value="recommendations">
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-6">Your Travel Recommendations</h2>
            <TravelRecommendations 
              recommendations={recommendations} 
              isLoading={isLoading} 
              error={error} 
            />
            
            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => document.querySelector('button[value="plan"]')?.click()}
                className="text-primary hover:underline"
              >
                ← Back to planner
              </button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default TravelPlannerPage;
