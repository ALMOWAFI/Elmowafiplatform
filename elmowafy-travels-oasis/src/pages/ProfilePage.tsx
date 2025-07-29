
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  User, Mail, Phone, MapPin, Calendar, Camera, Settings, Shield, 
  Bell, Users, Heart, Edit, Save, X, Upload, Trash2, Lock,
  Globe, Moon, Sun, Volume2, VolumeX, Smartphone, Languages
} from 'lucide-react';
import { authService } from '@/services/api';

interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  dateOfBirth?: string;
  phone?: string;
  location?: string;
  bio?: string;
  avatar?: string;
  familyRole?: string;
  joinedDate: string;
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
      familyUpdates: boolean;
      memories: boolean;
      events: boolean;
    };
    privacy: {
      profileVisibility: 'public' | 'family' | 'private';
      shareLocation: boolean;
      shareActivities: boolean;
    };
  };
}

const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Demo profile data
  useEffect(() => {
    const loadProfile = () => {
      const demoProfile: UserProfile = {
        id: '1',
        email: 'ahmad@elmowafi.com',
        fullName: 'Ahmad El-Mowafi',
        dateOfBirth: '1990-05-15',
        phone: '+1 (555) 123-4567',
        location: 'Cairo, Egypt',
        bio: 'Family organizer and travel enthusiast. Love capturing memories and planning adventures.',
        avatar: '/api/placeholder/150/150',
        familyRole: 'Father',
        joinedDate: '2024-01-15',
        preferences: {
          theme: 'auto' as const,
          language: 'en',
          notifications: {
            email: true,
            push: true,
            sms: false,
            familyUpdates: true,
            memories: true,
            events: true
          },
          privacy: {
            profileVisibility: 'family' as const,
            shareLocation: true,
            shareActivities: true
          }
        }
      };
      setProfile(demoProfile);
      setEditedProfile(demoProfile);
      setLoading(false);
    };

    loadProfile();
  }, []);

  const handleEdit = () => {
    setIsEditing(true);
    setEditedProfile({ ...profile! });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedProfile({ ...profile! });
    setMessage('');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // In real implementation, this would call the API
      // await profileService.updateProfile(editedProfile);
      
      setProfile(editedProfile);
      setIsEditing(false);
      setMessage('Profile updated successfully!');
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setEditedProfile(prev => ({
      ...prev!,
      [field]: value
    }));
  };

  const handlePreferenceChange = (category: string, field: string, value: any) => {
    setEditedProfile(prev => ({
      ...prev!,
      preferences: {
        ...prev!.preferences,
        [category]: {
          ...(prev!.preferences as any)[category],
          [field]: value
        }
      }
    }));
  };

  const familyConnections = [
    { id: '2', name: 'Fatima El-Mowafi', role: 'Mother', avatar: '/api/placeholder/40/40', status: 'online' },
    { id: '3', name: 'Omar El-Mowafi', role: 'Son', avatar: '/api/placeholder/40/40', status: 'offline' },
    { id: '4', name: 'Layla El-Mowafi', role: 'Daughter', avatar: '/api/placeholder/40/40', status: 'online' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        {!isEditing ? (
          <Button onClick={handleEdit} className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={handleCancel} variant="outline" className="flex items-center gap-2">
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </div>

      {message && (
        <Alert className="mb-6">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="family">Family</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
                </CardTitle>
              <CardDescription>
                Manage your personal details and profile picture
              </CardDescription>
              </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-center gap-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={editedProfile?.avatar} />
                  <AvatarFallback className="text-lg">
                    {editedProfile?.fullName?.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                    </Avatar>
                {isEditing && (
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Upload Photo
                    </Button>
                    <Button variant="outline" size="sm" className="flex items-center gap-2 text-red-600">
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={editedProfile?.fullName || ''}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editedProfile?.email || ''}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={editedProfile?.phone || ''}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={editedProfile?.dateOfBirth || ''}
                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    disabled={!isEditing}
                  />
                  </div>
                  
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={editedProfile?.location || ''}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    disabled={!isEditing}
                    placeholder="City, Country"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="familyRole">Family Role</Label>
                  <Input
                    id="familyRole"
                    value={editedProfile?.familyRole || ''}
                    onChange={(e) => handleInputChange('familyRole', e.target.value)}
                    disabled={!isEditing}
                    placeholder="e.g., Father, Mother, Son, Daughter"
                  />
                      </div>
                      </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={editedProfile?.bio || ''}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  disabled={!isEditing}
                  placeholder="Tell us about yourself..."
                  rows={3}
                />
                      </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="family" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Family Connections
              </CardTitle>
              <CardDescription>
                Manage your family network and relationships
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {familyConnections.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-medium">{member.name}</h4>
                        <p className="text-sm text-muted-foreground">{member.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={member.status === 'online' ? 'default' : 'secondary'}>
                        {member.status}
                      </Badge>
                      <Button variant="outline" size="sm">Message</Button>
                    </div>
                  </div>
                ))}
                
                <Button className="w-full mt-4">
                  <Users className="h-4 w-4 mr-2" />
                  Invite Family Member
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                App Preferences
              </CardTitle>
              <CardDescription>
                Customize your app experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Theme Settings */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Theme</Label>
                <div className="flex gap-4">
                  {['light', 'dark', 'auto'].map((theme) => (
                    <Button
                      key={theme}
                      variant={editedProfile?.preferences.theme === theme ? 'default' : 'outline'}
                      onClick={() => handlePreferenceChange('theme', 'theme', theme)}
                      disabled={!isEditing}
                      className="flex items-center gap-2"
                    >
                      {theme === 'light' && <Sun className="h-4 w-4" />}
                      {theme === 'dark' && <Moon className="h-4 w-4" />}
                      {theme === 'auto' && <Smartphone className="h-4 w-4" />}
                      {theme.charAt(0).toUpperCase() + theme.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Language Settings */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Language</Label>
                <select 
                  className="w-full p-2 border rounded-md"
                  value={editedProfile?.preferences.language}
                  onChange={(e) => handlePreferenceChange('language', 'language', e.target.value)}
                  disabled={!isEditing}
                >
                  <option value="en">English</option>
                  <option value="ar">العربية (Arabic)</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                </select>
              </div>

              {/* Notification Settings */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Notifications</Label>
                <div className="space-y-3">
                  {Object.entries(editedProfile?.preferences.notifications || {}).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</Label>
                        <p className="text-sm text-muted-foreground">
                          {key === 'email' && 'Receive notifications via email'}
                          {key === 'push' && 'Browser push notifications'}
                          {key === 'sms' && 'SMS notifications for important updates'}
                          {key === 'familyUpdates' && 'New family member activities'}
                          {key === 'memories' && 'New photos and memories shared'}
                          {key === 'events' && 'Upcoming family events and reminders'}
                        </p>
                      </div>
                      <Switch
                        checked={value}
                        onCheckedChange={(checked) => 
                          handlePreferenceChange('notifications', key, checked)
                        }
                        disabled={!isEditing}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Privacy Settings
              </CardTitle>
              <CardDescription>
                Control your privacy and data sharing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label className="text-base font-medium">Profile Visibility</Label>
                <select 
                  className="w-full p-2 border rounded-md"
                  value={editedProfile?.preferences.privacy.profileVisibility}
                  onChange={(e) => handlePreferenceChange('privacy', 'profileVisibility', e.target.value)}
                  disabled={!isEditing}
                >
                  <option value="public">Public - Anyone can see your profile</option>
                  <option value="family">Family Only - Only family members can see</option>
                  <option value="private">Private - Only you can see your profile</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Share Location</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow family members to see your current location
                  </p>
                </div>
                <Switch
                  checked={editedProfile?.preferences.privacy.shareLocation}
                  onCheckedChange={(checked) => 
                    handlePreferenceChange('privacy', 'shareLocation', checked)
                  }
                  disabled={!isEditing}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Share Activities</Label>
                  <p className="text-sm text-muted-foreground">
                    Show your activities in family timeline
                  </p>
                </div>
                <Switch
                  checked={editedProfile?.preferences.privacy.shareActivities}
                  onCheckedChange={(checked) => 
                    handlePreferenceChange('privacy', 'shareActivities', checked)
                  }
                  disabled={!isEditing}
                />
                </div>
              </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Account Security
              </CardTitle>
              <CardDescription>
                Manage your account security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Password</h4>
                    <p className="text-sm text-muted-foreground">Last changed 30 days ago</p>
                  </div>
                  <Button variant="outline">Change Password</Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Two-Factor Authentication</h4>
                    <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                  </div>
                  <Button variant="outline">Setup 2FA</Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Active Sessions</h4>
                    <p className="text-sm text-muted-foreground">Manage your active login sessions</p>
                  </div>
                  <Button variant="outline">View Sessions</Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Download Your Data</h4>
                    <p className="text-sm text-muted-foreground">Export your personal data</p>
                  </div>
                  <Button variant="outline">Request Export</Button>
                </div>
              </div>

              <div className="pt-6 border-t">
                <h4 className="font-medium text-red-600 mb-2">Danger Zone</h4>
                <div className="space-y-3">
                  <Button variant="destructive" className="w-full">
                    Delete Account
                  </Button>
                  <p className="text-sm text-muted-foreground text-center">
                    This action cannot be undone. All your data will be permanently deleted.
                  </p>
          </div>
        </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfilePage;
