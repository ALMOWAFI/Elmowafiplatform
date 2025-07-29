import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TravelLocation } from './types';
import { useLanguage } from '@/context/LanguageContext';
import { MapPin, Calendar, Users, Star, Image, ArrowRight } from 'lucide-react';

interface LocationPopupProps {
  location: TravelLocation;
  onClose?: () => void;
}

/**
 * A beautiful popup component that displays detailed information about a selected location
 */
export const LocationPopup: React.FC<LocationPopupProps> = ({ location, onClose }) => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  
  // Helper function to get location type badge color
  const getTypeColor = (type: 'visited' | 'home' | 'planned') => {
    switch (type) {
      case 'home': return 'bg-rose-500 hover:bg-rose-600';
      case 'planned': return 'bg-emerald-500 hover:bg-emerald-600';
      default: return 'bg-blue-500 hover:bg-blue-600';
    }
  };
  
  // Helper function to get location type label
  const getTypeLabel = (type: 'visited' | 'home' | 'planned') => {
    if (isArabic) {
      switch (type) {
        case 'home': return 'منزل';
        case 'planned': return 'مخطط له';
        default: return 'تمت زيارته';
      }
    } else {
      switch (type) {
        case 'home': return 'Home';
        case 'planned': return 'Planned';
        default: return 'Visited';
      }
    }
  };
  
  return (
    <AnimatePresence>
      <motion.div
        className="absolute bottom-4 left-4 right-4 md:left-auto md:w-96 md:bottom-6 md:right-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3 }}
      >
        <Card className={`w-full backdrop-blur-md bg-background/95 border shadow-lg ${isArabic ? 'font-noto text-right' : ''}`}>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <Badge className={`${getTypeColor(location.type)}`}>
                {getTypeLabel(location.type)}
              </Badge>
              {location.rating && (
                <div className="flex items-center">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className={i < location.rating! ? "text-amber-400 fill-amber-400" : "text-gray-300"}
                    />
                  ))}
                </div>
              )}
            </div>
            <CardTitle className="text-xl font-bold mt-2">
              {isArabic ? location.arabicName : location.name}
            </CardTitle>
            <CardDescription className="flex items-center gap-1 text-muted-foreground">
              <MapPin size={14} />
              <span>{location.name}</span>
            </CardDescription>
          </CardHeader>
          
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="details">{isArabic ? 'تفاصيل' : 'Details'}</TabsTrigger>
              <TabsTrigger value="photos">{isArabic ? 'صور' : 'Photos'}</TabsTrigger>
              <TabsTrigger value="travelers">{isArabic ? 'المسافرون' : 'Travelers'}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="p-0">
              <CardContent className="pt-4 pb-2">
                <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                  <Calendar size={16} />
                  <span>{location.date}</span>
                </div>
                <p className="text-sm">
                  {isArabic ? location.arabicDescription : location.description}
                </p>
                {location.highlights && location.highlights.length > 0 && (
                  <div className="mt-3">
                    <h4 className="text-sm font-medium mb-2">
                      {isArabic ? 'أبرز المعالم' : 'Highlights'}
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {location.highlights.map((highlight, index) => (
                        <Badge key={index} variant="outline" className="font-normal">
                          {highlight}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </TabsContent>
            
            <TabsContent value="photos" className="p-0">
              <CardContent className="pt-4 pb-2">
                {location.photos && location.photos.length > 0 ? (
                  <ScrollArea className="h-48">
                    <div className="grid grid-cols-2 gap-2">
                      {location.photos.map((photo, index) => (
                        <div 
                          key={index}
                          className="relative rounded-md overflow-hidden aspect-square"
                        >
                          <img 
                            src={photo} 
                            alt={`${location.name} photo ${index + 1}`} 
                            className="object-cover w-full h-full hover:scale-105 transition-transform"
                          />
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                    <Image size={32} />
                    <p className="mt-2 text-sm">
                      {isArabic ? 'لا توجد صور متاحة' : 'No photos available'}
                    </p>
                  </div>
                )}
              </CardContent>
            </TabsContent>
            
            <TabsContent value="travelers" className="p-0">
              <CardContent className="pt-4 pb-2">
                <div className="flex items-center gap-2 mb-3 text-sm">
                  <Users size={16} />
                  <span>
                    {isArabic 
                      ? `${location.travelers.length} مسافر` 
                      : `${location.travelers.length} travelers`}
                  </span>
                </div>
                
                {location.travelers && location.travelers.length > 0 ? (
                  <ScrollArea className="h-40">
                    <div className="space-y-2">
                      {location.travelers.map((traveler, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 rounded-md bg-secondary/20">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                            {traveler.substring(0, 1)}
                          </div>
                          <div className="font-medium text-sm">{traveler}</div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                    <Users size={32} />
                    <p className="mt-2 text-sm">
                      {isArabic ? 'لا يوجد مسافرون مسجلون' : 'No travelers recorded'}
                    </p>
                  </div>
                )}
              </CardContent>
            </TabsContent>
          </Tabs>
          
          <CardFooter className="flex justify-between pt-2">
            {onClose && (
              <Button variant="outline" size="sm" onClick={onClose}>
                {isArabic ? 'إغلاق' : 'Close'}
              </Button>
            )}
            <Button className="gap-1" size="sm">
              {isArabic ? 'عرض التفاصيل الكاملة' : 'View Full Details'}
              <ArrowRight size={14} />
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};
