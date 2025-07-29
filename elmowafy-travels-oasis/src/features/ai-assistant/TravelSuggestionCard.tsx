import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import { TravelSuggestion } from './types';
import { 
  Calendar, 
  MapPin, 
  DollarSign, 
  Users, 
  Landmark, 
  Mountain, 
  Palmtree, 
  Clock, 
  Activity, 
  Heart, 
  ArrowRight, 
  Star, 
  Share 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TravelSuggestionCardProps {
  suggestion: TravelSuggestion;
  onSelect?: (suggestion: TravelSuggestion) => void;
  featured?: boolean;
}

/**
 * Advanced 3D Travel Suggestion Card with parallax and interactive effects
 */
export const TravelSuggestionCard: React.FC<TravelSuggestionCardProps> = ({
  suggestion,
  onSelect,
  featured = false
}) => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  
  // Refs and state for interactive effects
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isExpanded, setIsExpanded] = useState(featured);
  const [isFavorited, setIsFavorited] = useState(false);
  
  // Motion values for parallax effect
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  // Transform values for parallax layers
  const rotateX = useTransform(y, [-100, 100], [10, -10]);
  const rotateY = useTransform(x, [-100, 100], [-10, 10]);
  
  // Background layer transform (stronger effect)
  const bgX = useTransform(x, [-100, 100], [10, -10]);
  const bgY = useTransform(y, [-100, 100], [10, -10]);
  
  // Mid layer transform (medium effect)
  const midX = useTransform(x, [-100, 100], [5, -5]);
  const midY = useTransform(y, [-100, 100], [5, -5]);
  
  // Handle mouse move for 3D effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || !isHovered) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    
    // Calculate mouse position relative to card center
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;
    
    setMousePosition({ x: mouseX, y: mouseY });
    x.set(mouseX);
    y.set(mouseY);
  };
  
  // Reset position when mouse leaves
  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };
  
  // Format rating as stars
  const renderRatingStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[...Array(5)].map((_, i) => (
          <Star 
            key={i} 
            size={12} 
            className={i < rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'} 
          />
        ))}
      </div>
    );
  };
  
  // Animation variants
  const cardVariants = {
    normal: { 
      height: featured ? 360 : 280,
      transition: { duration: 0.5, ease: [0.19, 1.0, 0.22, 1.0] }
    },
    expanded: { 
      height: 480,
      transition: { duration: 0.5, ease: [0.19, 1.0, 0.22, 1.0] }
    }
  };
  
  const imageVariants = {
    normal: { 
      height: featured ? '180px' : '140px',
      transition: { duration: 0.5, ease: [0.19, 1.0, 0.22, 1.0] }
    },
    expanded: { 
      height: '220px',
      transition: { duration: 0.5, ease: [0.19, 1.0, 0.22, 1.0] }
    }
  };
  
  const contentVariants = {
    normal: {
      opacity: 1,
      height: 'auto',
      transition: { duration: 0.3 }
    },
    expanded: {
      opacity: 1,
      height: 'auto',
      transition: { duration: 0.3, delay: 0.2 }
    },
    exit: {
      opacity: 0,
      height: 0,
      transition: { duration: 0.2 }
    }
  };
  
  return (
    <motion.div
      ref={cardRef}
      className={cn(
        "relative overflow-hidden rounded-xl shadow-lg",
        featured ? "w-full max-w-md mx-auto" : "w-full max-w-sm",
        isArabic ? "font-noto text-right" : ""
      )}
      style={{
        rotateX: isHovered ? rotateX : 0,
        rotateY: isHovered ? rotateY : 0,
        transformStyle: "preserve-3d",
        perspective: 1000
      }}
      initial="normal"
      animate={isExpanded ? "expanded" : "normal"}
      variants={cardVariants}
      whileHover={{ scale: 1.02 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Glowing highlight effect */}
      <motion.div 
        className="absolute -inset-1 rounded-xl bg-gradient-to-r from-primary/30 via-secondary/30 to-primary/30 blur-md opacity-0 z-0"
        animate={{ opacity: isHovered ? 0.7 : 0 }}
        transition={{ duration: 0.3 }}
      />
      
      {/* Background image with parallax effect */}
      <motion.div 
        className="absolute inset-0 z-10 overflow-hidden"
        style={{
          translateX: isHovered ? bgX : 0,
          translateY: isHovered ? bgY : 0
        }}
      >
        <motion.div 
          className="w-full"
          variants={imageVariants}
        >
          <div 
            className="w-full h-full bg-cover bg-center rounded-t-xl"
            style={{ 
              backgroundImage: `url(${suggestion.imageUrl || '/travel/default.jpg'})`,
              transformStyle: "preserve-3d",
              transform: "translateZ(-20px)"
            }}
          >
            {/* Overlay gradient */}
            <div className="w-full h-full bg-gradient-to-t from-black/70 to-black/10 rounded-t-xl" />
          </div>
        </motion.div>
      </motion.div>
      
      {/* Location badge with middle parallax effect */}
      <motion.div
        className="absolute left-4 top-4 z-30"
        style={{
          translateX: isHovered ? midX : 0,
          translateY: isHovered ? midY : 0,
          transformStyle: "preserve-3d",
          transform: "translateZ(20px)"
        }}
      >
        <Badge className="bg-white/90 text-black font-semibold shadow-md px-3 py-1.5 backdrop-blur-sm">
          <MapPin size={14} className="mr-1 text-primary" />
          {isArabic ? suggestion.arabicLocationName : suggestion.locationName}
        </Badge>
      </motion.div>
      
      {/* Favorite button */}
      <motion.button
        className="absolute right-4 top-4 z-30 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md"
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsFavorited(!isFavorited)}
        style={{
          transformStyle: "preserve-3d",
          transform: "translateZ(30px)"
        }}
      >
        <Heart 
          size={16} 
          className={cn(
            "transition-colors duration-300",
            isFavorited ? "fill-red-500 text-red-500" : "text-gray-600"
          )} 
        />
      </motion.button>
      
      {/* Card content */}
      <motion.div 
        className="relative z-20 p-4 bg-white dark:bg-black rounded-xl flex flex-col"
        style={{
          marginTop: featured ? 170 : 130,
          transformStyle: "preserve-3d",
          transform: "translateZ(10px)"
        }}
      >
        {/* Title and description */}
        <h3 className="text-lg font-bold mb-2">
          {isArabic ? suggestion.arabicLocationName : suggestion.locationName}
        </h3>
        
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {isArabic ? suggestion.arabicDescription : suggestion.description}
        </p>
        
        {/* Ratings */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground mb-1">
              {isArabic ? 'مناسب للعائلات' : 'Family Friendly'}
            </span>
            {renderRatingStars(suggestion.familyFriendlyRating || 0)}
          </div>
          
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground mb-1">
              {isArabic ? 'الثقافة' : 'Cultural'}
            </span>
            {renderRatingStars(suggestion.culturalRating || 0)}
          </div>
          
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground mb-1">
              {isArabic ? 'المغامرة' : 'Adventure'}
            </span>
            {renderRatingStars(suggestion.adventureRating || 0)}
          </div>
          
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground mb-1">
              {isArabic ? 'الاسترخاء' : 'Relaxation'}
            </span>
            {renderRatingStars(suggestion.relaxationRating || 0)}
          </div>
        </div>
        
        {/* Key information */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center">
            <Calendar size={12} className="mr-1.5 text-primary" />
            <span>
              {suggestion.bestTimeToVisit}
            </span>
          </div>
          
          <div className="flex items-center">
            <DollarSign size={12} className="mr-1.5 text-primary" />
            <span>
              {suggestion.estimatedBudget}
            </span>
          </div>
          
          <div className="flex items-center">
            <Clock size={12} className="mr-1.5 text-primary" />
            <span>
              {suggestion.recommendedDuration}
            </span>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-between text-xs"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <span>{isArabic ? 'رؤية المزيد' : 'See more'}</span>
            <ArrowRight size={12} className={`transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
          </Button>
        </div>
        
        {/* Expanded content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial="exit"
              animate="expanded"
              exit="exit"
              variants={contentVariants}
              className="mt-4"
            >
              <h4 className="text-sm font-medium mb-2">
                {isArabic ? 'الأنشطة المقترحة' : 'Suggested Activities'}
              </h4>
              
              <div className="flex flex-wrap gap-1.5 mb-4">
                {(isArabic ? suggestion.arabicSuggestedActivities : suggestion.suggestedActivities)?.map((activity, index) => (
                  <Badge key={index} variant="secondary" className="font-normal">
                    <Activity size={10} className="mr-1" />
                    {activity}
                  </Badge>
                ))}
              </div>
              
              <div className="flex justify-between mt-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  className="text-xs"
                  onClick={() => onSelect && onSelect(suggestion)}
                >
                  {isArabic ? 'أضف إلى الرحلة' : 'Add to Trip'}
                </Button>
                
                <Button size="icon" variant="ghost">
                  <Share size={14} />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      {/* Floating particles for visual effect */}
      {isHovered && (
        <>
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full bg-primary/60 z-30"
              initial={{ 
                x: Math.random() * 200 - 100, 
                y: Math.random() * 200 - 100,
                opacity: 0,
                scale: 0
              }}
              animate={{ 
                x: Math.random() * 200 - 100, 
                y: Math.random() * 200 - 100,
                opacity: 0.7,
                scale: 1
              }}
              transition={{
                duration: 1 + Math.random() * 2,
                repeat: Infinity,
                repeatType: "reverse"
              }}
              style={{
                left: `${50 + (Math.random() * 40 - 20)}%`,
                top: `${50 + (Math.random() * 40 - 20)}%`
              }}
            />
          ))}
        </>
      )}
      
      {/* Glow effect when hovered */}
      <motion.div 
        className="absolute inset-0 z-0 rounded-xl opacity-0 pointer-events-none"
        animate={{ 
          boxShadow: isHovered 
            ? "0 0 40px rgba(124, 58, 237, 0.3), 0 0 20px rgba(139, 92, 246, 0.3) inset" 
            : "0 0 0 rgba(0, 0, 0, 0)",
          opacity: isHovered ? 1 : 0
        }}
        transition={{ duration: 0.3 }}
      />
    </motion.div>
  );
};
