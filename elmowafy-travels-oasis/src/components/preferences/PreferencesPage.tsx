import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { usePreferences, useTravelPreferences, useAIPreferences, useFamilyPreferences } from '@/contexts/PreferencesContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Loader2, Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

export default function PreferencesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { tab = 'general' } = router.query;
  
  // Get preference hooks
  const { preferences, isLoading, error, resetPreferences } = usePreferences();
  const { travelPreferences, updateTravelPreferences } = useTravelPreferences();
  const { aiPreferences, updateAIPreferences } = useAIPreferences();
  const { familyPreferences, updateFamilyPreferences } = useFamilyPreferences();
  
  // Local state for form
  const [localTravelPrefs, setLocalTravelPrefs] = useState<any>({});
  const [localAIPrefs, setLocalAIPrefs] = useState<any>({});
  const [localFamilyPrefs, setLocalFamilyPrefs] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  
  // Initialize form with current preferences when they load
  useEffect(() => {
    if (travelPreferences) {
      setLocalTravelPrefs(travelPreferences);
    }
  }, [travelPreferences]);
  
  useEffect(() => {
    if (aiPreferences) {
      setLocalAIPrefs(aiPreferences);
    }
  }, [aiPreferences]);
  
  useEffect(() => {
    if (familyPreferences) {
      setLocalFamilyPrefs(familyPreferences);
    }
  }, [familyPreferences]);
  
  // Handle tab change
  const handleTabChange = (value: string) => {
    router.push(`/preferences?tab=${value}`, undefined, { shallow: true });
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      // Update all preferences
      await Promise.all([
        updateTravelPreferences(localTravelPrefs),
        updateAIPreferences(localAIPrefs),
        updateFamilyPreferences(localFamilyPrefs),
      ]);
      
      toast.success('Preferences saved successfully!');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handle reset to defaults
  const handleReset = async () => {
    if (confirm('Are you sure you want to reset all preferences to default?')) {
      try {
        await resetPreferences();
        toast.success('Preferences reset to default values');
      } catch (error) {
        console.error('Error resetting preferences:', error);
        toast.error('Failed to reset preferences');
      }
    }
  };
  
  // Render loading state
  if (isLoading && !preferences) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Preferences</h2>
        <p className="text-muted-foreground">{error.message}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Preferences</h1>
        <p className="text-muted-foreground">
          Customize your Elmowafy Travel Platform experience
        </p>
      </div>
      
      <form onSubmit={handleSubmit}>
        <Tabs 
          defaultValue={tab as string || 'general'} 
          className="w-full"
          onValueChange={handleTabChange}
        >
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="travel">Travel</TabsTrigger>
            <TabsTrigger value="family">Family</TabsTrigger>
            <TabsTrigger value="ai">AI Assistant</TabsTrigger>
          </TabsList>
          
          {/* General Preferences */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>General Preferences</CardTitle>
                <CardDescription>
                  Customize your general platform settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select 
                    value={preferences?.language || 'en'}
                    onValueChange={(value) => 
                      updatePreferences({ language: value as 'en' | 'ar' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ar">العربية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="theme">Theme</Label>
                  <Select 
                    value={preferences?.theme || 'system'}
                    onValueChange={(value) => 
                      updatePreferences({ theme: value as 'light' | 'dark' | 'system' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Travel Preferences */}
          <TabsContent value="travel">
            <Card>
              <CardHeader>
                <CardTitle>Travel Preferences</CardTitle>
                <CardDescription>
                  Customize your travel preferences and interests
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Travel Style</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {['adventure', 'relaxation', 'cultural', 'family', 'luxury', 'budget', 'mixed'].map((style) => (
                      <Button
                        key={style}
                        type="button"
                        variant={localTravelPrefs.travelStyle === style ? 'default' : 'outline'}
                        onClick={() => setLocalTravelPrefs({
                          ...localTravelPrefs,
                          travelStyle: style
                        })}
                        className="capitalize"
                      >
                        {style}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Budget Range (per day)</Label>
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <Input 
                        type="number"
                        value={localTravelPrefs.budget?.dailySpending?.min || 0}
                        onChange={(e) => setLocalTravelPrefs({
                          ...localTravelPrefs,
                          budget: {
                            ...localTravelPrefs.budget,
                            dailySpending: {
                              ...localTravelPrefs.budget?.dailySpending,
                              min: Number(e.target.value)
                            }
                          }
                        })}
                        placeholder="Min"
                      />
                    </div>
                    <span>to</span>
                    <div className="flex-1">
                      <Input 
                        type="number"
                        value={localTravelPrefs.budget?.dailySpending?.max || 0}
                        onChange={(e) => setLocalTravelPrefs({
                          ...localTravelPrefs,
                          budget: {
                            ...localTravelPrefs.budget,
                            dailySpending: {
                              ...localTravelPrefs.budget?.dailySpending,
                              max: Number(e.target.value)
                            }
                          }
                        })}
                        placeholder="Max"
                      />
                    </div>
                    <Select 
                      value={localTravelPrefs.budget?.currency || 'USD'}
                      onValueChange={(value) => setLocalTravelPrefs({
                        ...localTravelPrefs,
                        budget: {
                          ...localTravelPrefs.budget,
                          currency: value
                        }
                      })}
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="EGP">EGP</SelectItem>
                        <SelectItem value="SAR">SAR</SelectItem>
                        <SelectItem value="AED">AED</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Activity Level</Label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Relaxed</span>
                      <span className="text-sm text-muted-foreground">Active</span>
                    </div>
                    <Slider
                      value={[localTravelPrefs.activities?.adventureLevel || 3]}
                      onValueChange={([value]) => setLocalTravelPrefs({
                        ...localTravelPrefs,
                        activities: {
                          ...localTravelPrefs.activities,
                          adventureLevel: value
                        }
                      })}
                      min={1}
                      max={5}
                      step={1}
                      className="py-4"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground px-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <span key={i} className="w-6 text-center">{i}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Family Preferences */}
          <TabsContent value="family">
            <Card>
              <CardHeader>
                <CardTitle>Family Preferences</CardTitle>
                <CardDescription>
                  Customize your family settings and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Family Composition</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="adults" className="block text-sm font-medium mb-1">Adults</Label>
                      <Input 
                        id="adults"
                        type="number"
                        min="0"
                        value={localFamilyPrefs.familyMembers?.adults || 0}
                        onChange={(e) => setLocalFamilyPrefs({
                          ...localFamilyPrefs,
                          familyMembers: {
                            ...localFamilyPrefs.familyMembers,
                            adults: Number(e.target.value)
                          }
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="children" className="block text-sm font-medium mb-1">Children</Label>
                      <Input 
                        id="children"
                        type="number"
                        min="0"
                        value={localFamilyPrefs.familyMembers?.children || 0}
                        onChange={(e) => setLocalFamilyPrefs({
                          ...localFamilyPrefs,
                          familyMembers: {
                            ...localFamilyPrefs.familyMembers,
                            children: Number(e.target.value)
                          }
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="seniors" className="block text-sm font-medium mb-1">Seniors (65+)</Label>
                      <Input 
                        id="seniors"
                        type="number"
                        min="0"
                        value={localFamilyPrefs.familyMembers?.seniors || 0}
                        onChange={(e) => setLocalFamilyPrefs({
                          ...localFamilyPrefs,
                          familyMembers: {
                            ...localFamilyPrefs.familyMembers,
                            seniors: Number(e.target.value)
                          }
                        })}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Special Requirements</Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="mobility" 
                        checked={localFamilyPrefs.specialNeeds?.mobility || false}
                        onCheckedChange={(checked) => setLocalFamilyPrefs({
                          ...localFamilyPrefs,
                          specialNeeds: {
                            ...localFamilyPrefs.specialNeeds,
                            mobility: checked
                          }
                        })}
                      />
                      <Label htmlFor="mobility" className="!m-0">
                        Mobility assistance required
                      </Label>
                    </div>
                    
                    <div className="space-y-2 mt-4">
                      <Label htmlFor="medical-conditions" className="block">Medical Conditions</Label>
                      <Input 
                        id="medical-conditions"
                        placeholder="List any medical conditions (comma separated)"
                        value={Array.isArray(localFamilyPrefs.specialNeeds?.medicalConditions) 
                          ? localFamilyPrefs.specialNeeds.medicalConditions.join(', ')
                          : ''}
                        onChange={(e) => {
                          const conditions = e.target.value
                            .split(',')
                            .map(s => s.trim())
                            .filter(Boolean);
                            
                          setLocalFamilyPrefs({
                            ...localFamilyPrefs,
                            specialNeeds: {
                              ...localFamilyPrefs.specialNeeds,
                              medicalConditions: conditions
                            }
                          });
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* AI Assistant Preferences */}
          <TabsContent value="ai">
            <Card>
              <CardHeader>
                <CardTitle>AI Assistant Preferences</CardTitle>
                <CardDescription>
                  Customize how your AI assistant interacts with you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Assistant Personality</Label>
                  <Select 
                    value={localAIPrefs.assistantPersonality || 'friendly'}
                    onValueChange={(value) => setLocalAIPrefs({
                      ...localAIPrefs,
                      assistantPersonality: value
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select personality" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="humorous">Humorous</SelectItem>
                      <SelectItem value="concise">Concise</SelectItem>
                      <SelectItem value="detailed">Detailed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-4">
                  <Label>Notification Preferences</Label>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="email-notifications" className="font-normal">
                        Email Notifications
                      </Label>
                      <Switch 
                        id="email-notifications"
                        checked={localAIPrefs.notifications?.email || false}
                        onCheckedChange={(checked) => setLocalAIPrefs({
                          ...localAIPrefs,
                          notifications: {
                            ...localAIPrefs.notifications,
                            email: checked
                          }
                        })}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="push-notifications" className="font-normal">
                        Push Notifications
                      </Label>
                      <Switch 
                        id="push-notifications"
                        checked={localAIPrefs.notifications?.push || false}
                        onCheckedChange={(checked) => setLocalAIPrefs({
                          ...localAIPrefs,
                          notifications: {
                            ...localAIPrefs.notifications,
                            push: checked
                          }
                        })}
                      />
                    </div>
                    
                    <div className="pt-2">
                      <Label htmlFor="notification-frequency" className="block mb-2">
                        Notification Frequency
                      </Label>
                      <Select 
                        value={localAIPrefs.notifications?.frequency || 'daily'}
                        onValueChange={(value) => setLocalAIPrefs({
                          ...localAIPrefs,
                          notifications: {
                            ...localAIPrefs.notifications,
                            frequency: value
                          }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="immediate">Immediate</SelectItem>
                          <SelectItem value="hourly">Hourly Digest</SelectItem>
                          <SelectItem value="daily">Daily Digest</SelectItem>
                          <SelectItem value="weekly">Weekly Digest</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4 pt-2">
                  <Label>Privacy Settings</Label>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="share-travel" className="font-normal">
                          Share travel history with AI
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Allows the AI to make personalized recommendations
                        </p>
                      </div>
                      <Switch 
                        id="share-travel"
                        checked={localAIPrefs.privacy?.shareTravelHistory || false}
                        onCheckedChange={(checked) => setLocalAIPrefs({
                          ...localAIPrefs,
                          privacy: {
                            ...localAIPrefs.privacy,
                            shareTravelHistory: checked
                          }
                        })}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between pt-2">
                      <div>
                        <Label htmlFor="data-collection" className="font-normal">
                          Data Collection
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Controls how much data we collect to improve your experience
                        </p>
                      </div>
                      <Select 
                        value={localAIPrefs.privacy?.dataCollection || 'standard'}
                        onValueChange={(value) => setLocalAIPrefs({
                          ...localAIPrefs,
                          privacy: {
                            ...localAIPrefs.privacy,
                            dataCollection: value
                          }
                        })}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minimal">Minimal</SelectItem>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="enhanced">Enhanced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="flex justify-between border-t pt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleReset}
                  disabled={isSaving}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset to Defaults
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </form>
    </div>
  );
}
