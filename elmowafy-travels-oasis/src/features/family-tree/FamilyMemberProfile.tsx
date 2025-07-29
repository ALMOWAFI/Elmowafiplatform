import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { FamilyMember } from './types';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';
import { MapPin, Calendar, Heart, Globe, Award, User, Users, ChevronRight } from 'lucide-react';

interface FamilyMemberProfileProps {
  member: FamilyMember;
  allMembers: FamilyMember[];
  onMemberSelect: (id: string) => void;
}

/**
 * Displays detailed profile information for a selected family member
 */
export const FamilyMemberProfile: React.FC<FamilyMemberProfileProps> = ({
  member,
  allMembers,
  onMemberSelect
}) => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  
  // Get related family members
  const getRelatives = () => {
    const relatives: {
      type: string;
      arabicType: string;
      id: string;
      name: string;
      arabicName: string;
      profileImage?: string;
    }[] = [];
    
    // Add spouse if exists
    if (member.spouseId) {
      const spouse = allMembers.find(m => m.id === member.spouseId);
      if (spouse) {
        relatives.push({
          type: member.gender === 'male' ? 'Wife' : 'Husband',
          arabicType: member.gender === 'male' ? 'زوجة' : 'زوج',
          id: spouse.id,
          name: spouse.name,
          arabicName: spouse.arabicName,
          profileImage: spouse.profileImage
        });
      }
    }
    
    // Add parents if exist
    if (member.parentIds && member.parentIds.length > 0) {
      member.parentIds.forEach(parentId => {
        const parent = allMembers.find(m => m.id === parentId);
        if (parent) {
          relatives.push({
            type: parent.gender === 'male' ? 'Father' : 'Mother',
            arabicType: parent.gender === 'male' ? 'أب' : 'أم',
            id: parent.id,
            name: parent.name,
            arabicName: parent.arabicName,
            profileImage: parent.profileImage
          });
        }
      });
    }
    
    // Add children if exist
    if (member.childrenIds && member.childrenIds.length > 0) {
      member.childrenIds.forEach(childId => {
        const child = allMembers.find(m => m.id === childId);
        if (child) {
          relatives.push({
            type: child.gender === 'male' ? 'Son' : 'Daughter',
            arabicType: child.gender === 'male' ? 'ابن' : 'ابنة',
            id: child.id,
            name: child.name,
            arabicName: child.arabicName,
            profileImage: child.profileImage
          });
        }
      });
    }
    
    // Add siblings
    if (member.parentIds && member.parentIds.length > 0) {
      const siblings = allMembers.filter(
        m => m.id !== member.id && 
            m.parentIds && 
            m.parentIds.some(pid => member.parentIds!.includes(pid))
      );
      
      siblings.forEach(sibling => {
        relatives.push({
          type: sibling.gender === 'male' ? 'Brother' : 'Sister',
          arabicType: sibling.gender === 'male' ? 'أخ' : 'أخت',
          id: sibling.id,
          name: sibling.name,
          arabicName: sibling.arabicName,
          profileImage: sibling.profileImage
        });
      });
    }
    
    return relatives;
  };
  
  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };
  
  // Different styling based on gender
  const getGenderStyle = () => {
    return member.gender === 'female' 
      ? 'bg-rose-100 text-rose-700 border-rose-200' 
      : 'bg-sky-100 text-sky-700 border-sky-200';
  };
  
  const relatives = getRelatives();
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      key={member.id}
      className="h-[600px] flex flex-col"
    >
      <Card className="h-full flex flex-col border bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col items-center text-center">
            <Avatar className="h-20 w-20 mb-2">
              {member.profileImage ? (
                <AvatarImage 
                  src={member.profileImage}
                  alt={member.name}
                  className="object-cover"
                />
              ) : (
                <AvatarFallback className={cn("text-lg", getGenderStyle())}>
                  {getInitials(member.name)}
                </AvatarFallback>
              )}
            </Avatar>
            
            <CardTitle className={`text-xl font-bold ${isArabic ? 'font-noto' : ''}`}>
              {isArabic ? member.arabicName : member.name}
            </CardTitle>
            
            {member.birthYear && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <Calendar size={14} />
                <span>{member.birthYear}</span>
              </div>
            )}
            
            {member.currentLocation && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <MapPin size={14} />
                <span>{member.currentLocation}</span>
              </div>
            )}
          </div>
        </CardHeader>
        
        <Tabs defaultValue="bio" className="flex-1 flex flex-col">
          <TabsList className="mx-6 grid grid-cols-3">
            <TabsTrigger value="bio" className={isArabic ? 'font-noto' : ''}>
              {isArabic ? 'نبذة' : 'Bio'}
            </TabsTrigger>
            <TabsTrigger value="travel" className={isArabic ? 'font-noto' : ''}>
              {isArabic ? 'سفر' : 'Travel'}
            </TabsTrigger>
            <TabsTrigger value="family" className={isArabic ? 'font-noto' : ''}>
              {isArabic ? 'عائلة' : 'Family'}
            </TabsTrigger>
          </TabsList>
          
          <CardContent className="flex-1 pt-4 px-6 overflow-auto">
            <TabsContent value="bio" className="mt-0 h-full">
              <ScrollArea className="h-full pr-4">
                {/* Bio */}
                {(member.bio || member.arabicBio) && (
                  <div className="mb-4">
                    <h3 className={`text-sm font-medium mb-2 ${isArabic ? 'font-noto' : ''}`}>
                      {isArabic ? 'نبذة' : 'Biography'}
                    </h3>
                    <p className={`text-sm ${isArabic ? 'font-noto' : ''}`}>
                      {isArabic ? member.arabicBio : member.bio}
                    </p>
                  </div>
                )}
                
                {/* Achievements */}
                {member.achievements && member.achievements.length > 0 && (
                  <div className="mb-4">
                    <h3 className={`text-sm font-medium mb-2 ${isArabic ? 'font-noto' : ''}`}>
                      {isArabic ? 'الإنجازات' : 'Achievements'}
                    </h3>
                    <div className="space-y-2">
                      {member.achievements.map((achievement, index) => (
                        <div 
                          key={index}
                          className="flex items-center gap-2 p-2 rounded-md bg-secondary/20"
                        >
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <Award size={12} />
                          </div>
                          <span className={`text-sm ${isArabic ? 'font-noto' : ''}`}>
                            {achievement}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="travel" className="mt-0 h-full">
              <ScrollArea className="h-full pr-4">
                {/* Favorite destinations */}
                {member.favoriteDestinations && member.favoriteDestinations.length > 0 && (
                  <div className="mb-4">
                    <h3 className={`text-sm font-medium mb-2 ${isArabic ? 'font-noto' : ''}`}>
                      {isArabic ? 'الوجهات المفضلة' : 'Favorite Destinations'}
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {member.favoriteDestinations.map((destination, index) => (
                        <Badge 
                          key={index}
                          variant="secondary"
                          className={isArabic ? 'font-noto' : ''}
                        >
                          {destination}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Travel history */}
                {member.travelHistory && member.travelHistory.length > 0 && (
                  <div>
                    <h3 className={`text-sm font-medium mb-2 ${isArabic ? 'font-noto' : ''}`}>
                      {isArabic ? 'تاريخ السفر' : 'Travel History'}
                    </h3>
                    <div className="space-y-4">
                      {member.travelHistory.map((trip, index) => (
                        <div 
                          key={index}
                          className="border rounded-md p-3 bg-card"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="font-medium text-sm">
                              {trip.locationId}
                            </div>
                            <Badge variant="outline">{trip.year}</Badge>
                          </div>
                          
                          {trip.photos && trip.photos.length > 0 && (
                            <div className="grid grid-cols-2 gap-1 mt-2">
                              {trip.photos.map((photo, photoIndex) => (
                                <div 
                                  key={photoIndex}
                                  className="aspect-video bg-secondary rounded-md overflow-hidden"
                                >
                                  <img 
                                    src={photo} 
                                    alt={`${member.name} in ${trip.locationId}, ${trip.year}`}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {(!member.travelHistory || member.travelHistory.length === 0) && (
                  <div className="flex flex-col items-center justify-center h-[200px] text-center">
                    <Globe size={36} className="text-muted-foreground/30" />
                    <p className="mt-4 text-muted-foreground">
                      {isArabic ? 'لا يوجد تاريخ سفر مسجل بعد' : 'No travel history recorded yet'}
                    </p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="family" className="mt-0 h-full">
              <ScrollArea className="h-full pr-4">
                {relatives.length > 0 ? (
                  <div className="space-y-4">
                    {/* Group relatives by type */}
                    {['spouse', 'parent', 'child', 'sibling'].map((relationType) => {
                      const filteredRelatives = relatives.filter(r => 
                        (relationType === 'spouse' && (r.type === 'Wife' || r.type === 'Husband')) ||
                        (relationType === 'parent' && (r.type === 'Father' || r.type === 'Mother')) ||
                        (relationType === 'child' && (r.type === 'Son' || r.type === 'Daughter')) ||
                        (relationType === 'sibling' && (r.type === 'Brother' || r.type === 'Sister'))
                      );
                      
                      if (filteredRelatives.length === 0) return null;
                      
                      return (
                        <div key={relationType}>
                          <h3 className={`text-sm font-medium mb-2 ${isArabic ? 'font-noto' : ''}`}>
                            {isArabic ? (
                              relationType === 'spouse' ? 'الزوج/ة' :
                              relationType === 'parent' ? 'الوالدين' :
                              relationType === 'child' ? 'الأبناء' : 'الإخوة والأخوات'
                            ) : (
                              relationType === 'spouse' ? 'Spouse' :
                              relationType === 'parent' ? 'Parents' :
                              relationType === 'child' ? 'Children' : 'Siblings'
                            )}
                          </h3>
                          
                          <div className="space-y-2">
                            {filteredRelatives.map((relative) => (
                              <Button
                                key={relative.id}
                                variant="outline"
                                className="w-full justify-start h-auto py-2 px-3"
                                onClick={() => onMemberSelect(relative.id)}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-8 w-8">
                                      {relative.profileImage ? (
                                        <AvatarImage src={relative.profileImage} alt={relative.name} />
                                      ) : (
                                        <AvatarFallback className="text-xs">
                                          {getInitials(relative.name)}
                                        </AvatarFallback>
                                      )}
                                    </Avatar>
                                    
                                    <div className="text-left">
                                      <div className={`text-sm font-medium ${isArabic ? 'font-noto' : ''}`}>
                                        {isArabic ? relative.arabicName : relative.name}
                                      </div>
                                      <div className={`text-xs text-muted-foreground ${isArabic ? 'font-noto' : ''}`}>
                                        {isArabic ? relative.arabicType : relative.type}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <ChevronRight size={16} className="text-muted-foreground" />
                                </div>
                              </Button>
                            ))}
                          </div>
                          
                          <Separator className="my-4" />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[200px] text-center">
                    <Users size={36} className="text-muted-foreground/30" />
                    <p className="mt-4 text-muted-foreground">
                      {isArabic ? 'لا توجد علاقات عائلية مسجلة' : 'No family relationships recorded'}
                    </p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </CardContent>
        </Tabs>
        
        <CardFooter className="pt-2 pb-4 px-6">
          <Button className="w-full" variant="outline">
            {isArabic ? 'عرض على الخريطة' : 'View on Map'} <Globe size={16} className="ml-2" />
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};
