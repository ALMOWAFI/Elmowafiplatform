import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FamilyMember, FamilyTreeLayoutOptions } from './types';
import { ChevronDown, ChevronRight, MapPin, Calendar, Image, Award, Plane, Home, HeartPulse, Sparkles, Star } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';

interface FamilyMemberNodeProps {
  member: FamilyMember;
  x: number;
  y: number;
  isExpanded: boolean;
  isHighlighted: boolean;
  isSearchResult: boolean;
  isRoot: boolean;
  onExpand: () => void;
  onSelect: () => void;
  layoutOptions: FamilyTreeLayoutOptions;
}

/**
 * Renders a family member node in the family tree with rich animations and visual effects
 * Includes enhanced travel history visualization and interactive elements
 */
export const FamilyMemberNode: React.FC<FamilyMemberNodeProps> = ({
  member,
  x,
  y,
  isExpanded,
  isHighlighted,
  isSearchResult,
  isRoot,
  onExpand,
  onSelect,
  layoutOptions
}) => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  const [hovered, setHovered] = useState(false);
  const [pulseEffect, setPulseEffect] = useState(false);
  
  // Trigger pulse effect when highlighted changes
  useEffect(() => {
    if (isHighlighted) {
      setPulseEffect(true);
      const timer = setTimeout(() => setPulseEffect(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isHighlighted]);
  
  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };
  
  // Enhanced styling based on gender and node type
  const getNodeStyle = () => {
    let baseStyle = member.gender === 'female' 
      ? 'bg-gradient-to-br from-rose-50 to-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200' 
      : 'bg-gradient-to-br from-sky-50 to-sky-100 text-sky-700 border-sky-200 hover:bg-sky-200';
      
    // Add special styling for different types of family members
    if (isRoot) {
      baseStyle += ' shadow-md shadow-primary/20';
    }
    
    if (member.achievements && member.achievements.length > 0) {
      baseStyle += ' ring-1 ring-amber-200 ring-offset-1';
    }
    
    return baseStyle;
  };
  
  // Get travel icon based on travel history
  const getTravelIcon = () => {
    if (!member.travelHistory || member.travelHistory.length === 0) {
      return null;
    }
    
    return member.travelHistory.length > 5 
      ? <Plane className="text-indigo-500" size={12} /> 
      : <Plane size={12} />;
  };
  
  // Get node dimensions based on layout options
  const getNodeSize = () => {
    const baseSize = layoutOptions.nodeSize;
    const multiplier = layoutOptions.compactMode ? 0.8 : 1;
    return baseSize * multiplier;
  };
  
  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ 
        opacity: 1, 
        scale: isHighlighted ? 1.1 : hovered ? 1.05 : 1,
        x: x,
        y: y,
        rotate: isSearchResult ? [0, 2, 0, -2, 0] : 0
      }}
      transition={{ 
        duration: 0.3,
        rotate: { repeat: isSearchResult ? Infinity : 0, duration: 0.5 }
      }}
      className={cn(
        "cursor-pointer transition-all",
        isHighlighted && "z-10"
      )}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Decorative elements */}
      <AnimatePresence>
        {(isHighlighted || hovered) && (
          <motion.circle
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.15, scale: 1.2 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.4 }}
            cx={0}
            cy={0}
            r={getNodeSize() * 0.7}
            className={member.gender === 'female' ? 'fill-rose-200' : 'fill-sky-200'}
          />
        )}
      </AnimatePresence>
      
      {/* Pulse effect when highlighted */}
      <AnimatePresence>
        {pulseEffect && (
          <motion.circle
            initial={{ opacity: 0.7, scale: 1 }}
            animate={{ opacity: 0, scale: 2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            cx={0}
            cy={0}
            r={getNodeSize() * 0.6}
            className={member.gender === 'female' ? 'fill-rose-400' : 'fill-sky-400'}
          />
        )}
      </AnimatePresence>
      {/* Node background with enhanced styling */}
      <motion.rect
        x={-getNodeSize() / 2}
        y={-getNodeSize() / 2}
        width={getNodeSize()}
        height={getNodeSize()}
        rx={12}
        className={cn(
          "fill-background stroke-[1.5px]",
          isHighlighted ? "stroke-primary shadow-lg" : "stroke-border",
          isRoot && "stroke-primary stroke-[2px]",
          hovered && !isHighlighted && "stroke-primary/50"
        )}
        animate={{
          boxShadow: isHighlighted 
            ? "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)" 
            : "0 0 0 0 rgba(0, 0, 0, 0)"
        }}
      />
      
      {/* Travel history indicators - small dots around the node */}
      {member.travelHistory && member.travelHistory.length > 0 && !layoutOptions.compactMode && (
        <g>
          {member.travelHistory.slice(0, 5).map((travel, index) => {
            const angle = (index * (360 / Math.min(member.travelHistory!.length, 5))) * (Math.PI / 180);
            const radius = getNodeSize() / 2 + 5;
            const dotX = Math.cos(angle) * radius;
            const dotY = Math.sin(angle) * radius;
            
            return (
              <motion.circle
                key={`travel-${index}`}
                cx={dotX}
                cy={dotY}
                r={3}
                className="fill-indigo-400"
                initial={{ opacity: 0 }}
                animate={{ opacity: hovered || isHighlighted ? 1 : 0.6 }}
                transition={{ delay: index * 0.05 }}
              />
            );
          })}
        </g>
      )}
      
      {/* Toggle expand button */}
      {(member.childrenIds && member.childrenIds.length > 0) && (
        <motion.g
          className="cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onExpand();
          }}
          whileHover={{ scale: 1.2 }}
        >
          <circle
            cx={getNodeSize() / 2 - 8}
            cy={getNodeSize() / 2 - 8}
            r={10}
            className="fill-muted-foreground/20"
          />
          {isExpanded ? (
            <ChevronDown 
              size={14} 
              className="text-muted-foreground"
              style={{
                transform: `translate(${getNodeSize() / 2 - 15}px, ${getNodeSize() / 2 - 15}px)`
              }}
            />
          ) : (
            <ChevronRight 
              size={14} 
              className="text-muted-foreground"
              style={{
                transform: `translate(${getNodeSize() / 2 - 15}px, ${getNodeSize() / 2 - 15}px)`
              }}
            />
          )}
        </motion.g>
      )}
      
      {/* Member content */}
      <foreignObject
        x={-getNodeSize() / 2 + 5}
        y={-getNodeSize() / 2 + 5}
        width={getNodeSize() - 10}
        height={getNodeSize() - 10}
        className="overflow-visible pointer-events-none"
      >
        <TooltipProvider>
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <div className={cn(
                "flex flex-col items-center justify-center w-full h-full rounded-md p-1",
                "pointer-events-auto",
                isArabic ? "font-noto text-right" : ""
              )}>
                {/* Avatar with enhanced styling */}
                {layoutOptions.showProfileImages && (
                  <motion.div
                    animate={{ y: hovered ? -2 : 0 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Avatar 
                      className={cn(
                        "h-10 w-10 border-2 shadow-sm", 
                        isHighlighted ? "border-primary shadow-primary/25" : hovered ? "border-primary/50" : "border-transparent",
                        isRoot && "ring-2 ring-offset-2 ring-primary/30"
                      )}
                    >
                      {member.profileImage ? (
                        <AvatarImage 
                          src={member.profileImage} 
                          alt={member.name} 
                          className="object-cover"
                        />
                      ) : (
                        <AvatarFallback className={getNodeStyle()}>
                          {getInitials(member.name)}
                        </AvatarFallback>
                      )}
                      
                      {/* Special indicators for home and frequent travelers */}
                      {!layoutOptions.compactMode && member.currentLocation?.toLowerCase().includes('home') && (
                        <div className="absolute -top-1 -right-1 bg-green-100 rounded-full p-0.5 border border-green-200">
                          <Home size={8} className="text-green-600" />
                        </div>
                      )}
                      
                      {!layoutOptions.compactMode && member.travelHistory && member.travelHistory.length > 5 && (
                        <div className="absolute -bottom-1 -right-1 bg-blue-100 rounded-full p-0.5 border border-blue-200">
                          <Plane size={8} className="text-blue-600" />
                        </div>
                      )}
                    </Avatar>
                  </motion.div>
                )}
                
                {/* Name with enhanced styling */}
                <motion.div 
                  className={cn(
                    "mt-1 text-xs font-medium text-center line-clamp-2 text-foreground",
                    isHighlighted && "text-primary font-semibold",
                    hovered && !isHighlighted && "text-primary/70"
                  )}
                  animate={{ scale: isHighlighted ? 1.05 : 1 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  {isArabic ? member.arabicName : member.name}
                  {isRoot && (
                    <span className="ml-1 inline-flex">
                      <Star size={8} className="text-amber-400 fill-amber-400" />
                    </span>
                  )}
                </motion.div>
                
                {/* Optional: Birth year */}
                {member.birthYear && !layoutOptions.compactMode && (
                  <div className="text-[0.65rem] text-muted-foreground flex items-center justify-center mt-0.5">
                    <Calendar size={8} className="mr-0.5" />
                    <span>{member.birthYear}</span>
                  </div>
                )}
                
                {/* Enhanced indicators for travel history, location, achievements */}
                {!layoutOptions.compactMode && (
                  <motion.div 
                    className="flex space-x-1 mt-1"
                    initial={{ opacity: 0.8 }}
                    animate={{ opacity: hovered || isHighlighted ? 1 : 0.8 }}
                  >
                    {member.travelHistory && member.travelHistory.length > 0 && (
                      <Badge variant="outline" className={cn(
                        "h-4 px-1 text-[0.6rem]",
                        member.travelHistory.length > 5 ? "bg-blue-50 border-blue-200 text-blue-700" : ""
                      )}>
                        <Plane size={8} className="mr-0.5" />
                        {member.travelHistory.length}
                      </Badge>
                    )}
                    
                    {member.currentLocation && (
                      <Badge variant="outline" className={cn(
                        "h-4 px-1 text-[0.6rem]",
                        member.currentLocation.toLowerCase().includes('home') ? "bg-green-50 border-green-200 text-green-700" : ""
                      )}>
                        {member.currentLocation.toLowerCase().includes('home') 
                          ? <Home size={8} className="mr-0.5" />
                          : <MapPin size={8} className="mr-0.5" />
                        }
                      </Badge>
                    )}
                    
                    {member.achievements && member.achievements.length > 0 && (
                      <Badge variant="outline" className="h-4 px-1 text-[0.6rem] bg-amber-50 border-amber-200 text-amber-700">
                        <Award size={8} className="mr-0.5" />
                        {member.achievements.length}
                      </Badge>
                    )}
                    
                    {/* New: Show if they have favorite destinations */}
                    {member.favoriteDestinations && member.favoriteDestinations.length > 0 && (
                      <Badge variant="outline" className="h-4 px-1 text-[0.6rem] bg-rose-50 border-rose-200 text-rose-700">
                        <HeartPulse size={8} className="mr-0.5" />
                      </Badge>
                    )}
                  </motion.div>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-sm p-0 overflow-hidden border-0">
              <div className="p-3 space-y-3 backdrop-blur-md bg-card/90 rounded-lg shadow-xl border">
                {/* Header with photo and basic info */}
                <div className="flex items-center space-x-3">
                  <Avatar className={cn(
                    "h-14 w-14 border-2", 
                    member.gender === 'female' ? "border-rose-200" : "border-sky-200",
                    isRoot && "ring-2 ring-offset-1 ring-primary/30"
                  )}>
                    {member.profileImage ? (
                      <AvatarImage src={member.profileImage} alt={member.name} />
                    ) : (
                      <AvatarFallback className={getNodeStyle()}>
                        {getInitials(member.name)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  
                  <div>
                    <h4 className={cn(
                      "text-sm font-semibold flex items-center gap-1", 
                      isRoot && "text-primary"
                    )}>
                      {isArabic ? member.arabicName : member.name}
                      {isRoot && <Star size={12} className="text-amber-400 fill-amber-400" />}
                    </h4>
                    
                    <div className="flex flex-wrap gap-2 mt-1">
                      {member.birthYear && (
                        <p className="text-xs text-muted-foreground flex items-center bg-muted/50 px-1.5 py-0.5 rounded">
                          <Calendar size={10} className="mr-1" />
                          {member.birthYear}
                        </p>
                      )}
                      
                      {member.gender && (
                        <p className={cn(
                          "text-xs flex items-center px-1.5 py-0.5 rounded",
                          member.gender === 'female' ? "bg-rose-50 text-rose-600" : "bg-sky-50 text-sky-600"
                        )}>
                          {member.gender === 'female' ? 'Female' : 'Male'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Bio section */}
                {member.bio && (
                  <div className="px-3 py-2 bg-muted/30 rounded-md">
                    <p className="text-xs">
                      {isArabic ? member.arabicBio || member.bio : member.bio}
                    </p>
                  </div>
                )}
                
                {/* Current location */}
                {member.currentLocation && (
                  <div className="flex items-center text-xs border-l-2 border-green-300 pl-2">
                    <div className="mr-2 p-1 bg-green-50 rounded-full">
                      {member.currentLocation.toLowerCase().includes('home') 
                        ? <Home size={12} className="text-green-600" />
                        : <MapPin size={12} className="text-green-600" />
                      }
                    </div>
                    <span>{member.currentLocation}</span>
                  </div>
                )}
                
                {/* Travel history summary */}
                {member.travelHistory && member.travelHistory.length > 0 && (
                  <div className="border-l-2 border-blue-300 pl-2">
                    <div className="flex items-center text-xs font-medium mb-1">
                      <div className="mr-2 p-1 bg-blue-50 rounded-full">
                        <Plane size={12} className="text-blue-600" />
                      </div>
                      <span>
                        {isArabic ? 'رحلات:' : 'Travel History'} ({member.travelHistory.length})
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mt-1">
                      {member.travelHistory.slice(0, 3).map((travel, idx) => (
                        <Badge key={idx} variant="outline" className="text-[0.6rem] bg-blue-50/50">
                          {travel.year}
                        </Badge>
                      ))}
                      {member.travelHistory.length > 3 && (
                        <Badge variant="outline" className="text-[0.6rem]">
                          +{member.travelHistory.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Favorite destinations */}
                {member.favoriteDestinations && member.favoriteDestinations.length > 0 && (
                  <div className="border-l-2 border-rose-300 pl-2">
                    <div className="flex items-center text-xs font-medium mb-1">
                      <div className="mr-2 p-1 bg-rose-50 rounded-full">
                        <HeartPulse size={12} className="text-rose-600" />
                      </div>
                      <span>
                        {isArabic ? 'الوجهات المفضلة:' : 'Favorite Destinations'}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mt-1">
                      {member.favoriteDestinations.slice(0, 3).map((dest, idx) => (
                        <Badge key={idx} variant="outline" className="text-[0.6rem] bg-rose-50/50">
                          {dest}
                        </Badge>
                      ))}
                      {member.favoriteDestinations.length > 3 && (
                        <Badge variant="outline" className="text-[0.6rem]">
                          +{member.favoriteDestinations.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Achievements */}
                {member.achievements && member.achievements.length > 0 && (
                  <div className="border-l-2 border-amber-300 pl-2">
                    <div className="flex items-center text-xs font-medium mb-1">
                      <div className="mr-2 p-1 bg-amber-50 rounded-full">
                        <Award size={12} className="text-amber-600" />
                      </div>
                      <span>
                        {isArabic ? 'الإنجازات:' : 'Achievements'}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mt-1">
                      {member.achievements.slice(0, 2).map((achievement, idx) => (
                        <Badge key={idx} variant="outline" className="text-[0.6rem] bg-amber-50/50">
                          {achievement}
                        </Badge>
                      ))}
                      {member.achievements.length > 2 && (
                        <Badge variant="outline" className="text-[0.6rem]">
                          +{member.achievements.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </foreignObject>
    </motion.g>
  );
};
