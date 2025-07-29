import React, { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Toggle } from '@/components/ui/toggle';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/context/LanguageContext';
import { Globe, Map, Calendar, Home, Plane, MapPin, Users, RotateCw, Route, Filter } from 'lucide-react';
import { TravelLocation, ViewMode, TimelineFilterProps, LocationFilterProps, TravelerFilterProps } from './types';
import { motion, AnimatePresence } from 'framer-motion';

interface WorldMapControlsProps {
  locations: TravelLocation[];
  onLocationSelect: (locationId: string | null) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onAutoRotateToggle: (autoRotate: boolean) => void;
  onYearRangeChange: (startYear: number, endYear: number) => void;
  onLocationTypeChange: (types: ('visited' | 'home' | 'planned')[]) => void;
  onTravelerFilterChange: (travelers: string[]) => void;
  onRoutesToggle: (showRoutes: boolean) => void;
  autoRotate?: boolean;
  selectedLocationId?: string | null;
  viewMode?: ViewMode;
  yearRange?: [number, number];
  selectedYears?: number[];
  selectedLocationTypes?: ('visited' | 'home' | 'planned')[];
  selectedTravelers?: string[];
  showRoutes?: boolean;
}

/**
 * Advanced control panel for the 3D World Map with timeline, filters, and view options
 */
export const WorldMapControls: React.FC<WorldMapControlsProps> = ({
  locations,
  onLocationSelect,
  onViewModeChange,
  onAutoRotateToggle,
  onYearRangeChange,
  onLocationTypeChange,
  onTravelerFilterChange,
  onRoutesToggle,
  autoRotate = true,
  selectedLocationId = null,
  viewMode = 'globe',
  yearRange = [2000, 2025],
  selectedYears = [],
  selectedLocationTypes = ['visited', 'home', 'planned'],
  selectedTravelers = [],
  showRoutes = false,
}) => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  const [showFilters, setShowFilters] = useState(false);
  
  // Get unique years from locations
  const availableYears = React.useMemo(() => {
    const years = new Set<number>();
    locations.forEach(location => {
      const year = parseInt(location.date.split('-')[0]);
      if (!isNaN(year)) {
        years.add(year);
      }
    });
    return Array.from(years).sort();
  }, [locations]);
  
  // Get unique family members/travelers from locations
  const availableTravelers = React.useMemo(() => {
    const travelers = new Set<string>();
    locations.forEach(location => {
      location.travelers.forEach(traveler => {
        travelers.add(traveler);
      });
    });
    return Array.from(travelers).sort();
  }, [locations]);
  
  // Toggle year selection
  const handleYearToggle = (year: number) => {
    if (selectedYears.includes(year)) {
      onYearRangeChange(
        yearRange[0], 
        yearRange[1]
      );
    } else {
      onYearRangeChange(
        Math.min(yearRange[0], year),
        Math.max(yearRange[1], year)
      );
    }
  };
  
  // Toggle location type selection
  const handleLocationTypeToggle = (type: 'visited' | 'home' | 'planned') => {
    if (selectedLocationTypes.includes(type)) {
      if (selectedLocationTypes.length > 1) {
        onLocationTypeChange(selectedLocationTypes.filter(t => t !== type));
      }
    } else {
      onLocationTypeChange([...selectedLocationTypes, type]);
    }
  };
  
  // Toggle traveler selection
  const handleTravelerToggle = (traveler: string) => {
    if (selectedTravelers.includes(traveler)) {
      onTravelerFilterChange(selectedTravelers.filter(t => t !== traveler));
    } else {
      onTravelerFilterChange([...selectedTravelers, traveler]);
    }
  };
  
  // Reset all filters
  const handleResetFilters = () => {
    onYearRangeChange(
      Math.min(...availableYears),
      Math.max(...availableYears)
    );
    onLocationTypeChange(['visited', 'home', 'planned']);
    onTravelerFilterChange([]);
    onRoutesToggle(false);
  };
  
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
  
  const getTypeIcon = (type: 'visited' | 'home' | 'planned') => {
    switch (type) {
      case 'home': return <Home size={14} />;
      case 'planned': return <MapPin size={14} />;
      default: return <Plane size={14} />;
    }
  };
  
  return (
    <div className={`mt-6 ${isArabic ? 'font-noto text-right' : ''}`}>
      {/* Main controls bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        {/* View mode selector */}
        <Tabs
          value={viewMode}
          onValueChange={(value) => onViewModeChange(value as ViewMode)}
          className="w-auto"
        >
          <TabsList className="grid w-auto grid-cols-3">
            <TabsTrigger value="globe" className="flex items-center gap-1 px-3 py-1.5">
              <Globe size={14} />
              <span className="hidden sm:inline">{isArabic ? 'كرة أرضية' : 'Globe'}</span>
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center gap-1 px-3 py-1.5">
              <Map size={14} />
              <span className="hidden sm:inline">{isArabic ? 'خريطة' : 'Map'}</span>
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex items-center gap-1 px-3 py-1.5">
              <Calendar size={14} />
              <span className="hidden sm:inline">{isArabic ? 'جدول زمني' : 'Timeline'}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        {/* Control toggles */}
        <div className="flex items-center gap-2">
          <Toggle
            pressed={autoRotate}
            onPressedChange={onAutoRotateToggle}
            size="sm"
            variant="outline"
            aria-label={isArabic ? 'تدوير تلقائي' : 'Auto-rotate'}
            title={isArabic ? 'تدوير تلقائي' : 'Auto-rotate'}
          >
            <RotateCw size={14} />
          </Toggle>
          
          <Toggle
            pressed={showRoutes}
            onPressedChange={onRoutesToggle}
            size="sm"
            variant="outline"
            aria-label={isArabic ? 'عرض المسارات' : 'Show routes'}
            title={isArabic ? 'عرض المسارات' : 'Show routes'}
          >
            <Route size={14} />
          </Toggle>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1"
          >
            <Filter size={14} />
            <span className="hidden sm:inline">{isArabic ? 'فلاتر' : 'Filters'}</span>
          </Button>
        </div>
      </div>
      
      {/* Expandable filter panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <Card className="mb-4 border bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Timeline filter */}
                  <div>
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Calendar size={14} />
                      {isArabic ? 'فلتر الوقت' : 'Time Filter'}
                    </h3>
                    
                    <div className="mb-4">
                      <Slider
                        value={[yearRange[0], yearRange[1]]}
                        min={Math.min(...availableYears)}
                        max={Math.max(...availableYears)}
                        step={1}
                        onValueChange={([start, end]) => onYearRangeChange(start, end)}
                      />
                      <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                        <span>{yearRange[0]}</span>
                        <span>{yearRange[1]}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mt-2">
                      {availableYears.map(year => (
                        <Badge
                          key={year}
                          variant={year >= yearRange[0] && year <= yearRange[1] ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => handleYearToggle(year)}
                        >
                          {year}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  {/* Location type filter */}
                  <div>
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <MapPin size={14} />
                      {isArabic ? 'نوع الموقع' : 'Location Type'}
                    </h3>
                    
                    <div className="flex flex-wrap gap-2">
                      {(['visited', 'home', 'planned'] as const).map(type => (
                        <Button
                          key={type}
                          variant={selectedLocationTypes.includes(type) ? "default" : "outline"}
                          size="sm"
                          className="gap-1"
                          onClick={() => handleLocationTypeToggle(type)}
                        >
                          {getTypeIcon(type)}
                          {getTypeLabel(type)}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Travelers filter */}
                  <div>
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Users size={14} />
                      {isArabic ? 'المسافرون' : 'Travelers'}
                    </h3>
                    
                    <div className="flex flex-wrap gap-1">
                      {availableTravelers.map(traveler => (
                        <Badge
                          key={traveler}
                          variant={selectedTravelers.includes(traveler) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => handleTravelerToggle(traveler)}
                        >
                          {traveler}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Reset filters button */}
                <div className="mt-4 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetFilters}
                  >
                    {isArabic ? 'إعادة تعيين الفلاتر' : 'Reset Filters'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
