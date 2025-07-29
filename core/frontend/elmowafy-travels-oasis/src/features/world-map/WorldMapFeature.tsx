import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Container } from '@/components/ui/container';

import { WorldGlobe } from './Globe';
import { WorldMapControls } from './WorldMapControls';
import { LocationPopup } from './LocationPopup';
import { TravelLocation, ViewMode } from './types';
import { motion } from 'framer-motion';
import { ElmowafyLogo } from '@/components/ElmowafyLogo';

// Sample travel data - to be replaced with real data from API/database
const travelLocations: TravelLocation[] = [
  {
    id: 'loc1',
    name: 'Cairo, Egypt',
    arabicName: 'القاهرة، مصر',
    coordinates: [31.2357, 30.0444],
    date: '2022-07-15',
    description: 'Annual family gathering in Cairo with cultural visits to museums and historical sites.',
    arabicDescription: 'التجمع العائلي السنوي في القاهرة مع زيارات ثقافية للمتاحف والمواقع التاريخية.',
    type: 'visited',
    photos: [
      '/memories/cairo-1.jpg',
      '/memories/cairo-2.jpg',
      '/memories/cairo-3.jpg',
    ],
    travelers: ['Ahmed Ali Elmowafy', 'Marwa Hani', 'Amr Elmowafy', 'Ali Elmowafy'],
    highlights: ['Egyptian Museum', 'Khan el-Khalili', 'Nile Dinner Cruise'],
    rating: 5,
  },
  {
    id: 'loc2',
    name: 'Alexandria, Egypt',
    arabicName: 'الإسكندرية، مصر',
    coordinates: [29.9187, 31.2001],
    date: '2023-08-05',
    description: 'Summer holiday at Alexandria beaches and exploring the beautiful Mediterranean coast.',
    arabicDescription: 'عطلة صيفية على شواطئ الإسكندرية واستكشاف ساحل البحر المتوسط الجميل.',
    type: 'home',
    photos: [
      '/memories/alexandria-1.jpg',
      '/memories/alexandria-2.jpg',
    ],
    travelers: ['Ali Elmowafy', 'Remas', 'Basmala'],
    highlights: ['Bibliotheca Alexandrina', 'Montazah Palace', 'Corniche'],
    rating: 4,
  },
  {
    id: 'loc3',
    name: 'Dubai, UAE',
    arabicName: 'دبي، الإمارات العربية المتحدة',
    coordinates: [55.2708, 25.2048],
    date: '2021-12-20',
    description: 'Winter holiday exploring the modern architecture and desert landscapes of Dubai.',
    arabicDescription: 'عطلة شتوية لاستكشاف العمارة الحديثة والمناظر الصحراوية في دبي.',
    type: 'visited',
    photos: [],
    travelers: ['ahmed', 'fatima'],
    highlights: ['Burj Khalifa', 'Palm Jumeirah', 'Dubai Mall'],
    rating: 5,
  },
];

// Travel paths between locations
const travelPaths = [
  {
    id: 'path1',
    from: [29.9187, 31.2001], // Alexandria
    to: [31.2357, 30.0444], // Cairo
    color: '#8BC34A',
    animationDuration: 4,
    date: '2023-05'
  },
  {
    id: 'path2',
    from: [31.2357, 30.0444], // Cairo
    to: [55.2708, 25.2048], // Dubai
    color: '#FF9800',
    animationDuration: 4.5,
    date: '2022-11'
  },
  {
    id: 'path3',
    from: [55.2708, 25.2048], // Dubai
    to: [28.9784, 41.0082], // Istanbul
    color: '#03A9F4',
    animationDuration: 5,
    date: '2021-08'
  },
  {
    id: 'path4',
    from: [28.9784, 41.0082], // Istanbul
    to: [-0.1278, 51.5074], // London
    color: '#9C27B0',
    animationDuration: 5.5,
    date: '2021-06'
  },
  {
    id: 'path5',
    from: [-0.1278, 51.5074], // London
    to: [-74.0060, 40.7128], // New York
    color: '#E91E63',
    animationDuration: 6,
    date: '2020-01'
  },
  {
    id: 'path6',
    from: [-74.0060, 40.7128], // New York
    to: [139.6503, 35.6762], // Tokyo
    color: '#4CAF50',
    animationDuration: 7,
    date: '2019-04'
  },
  {
    id: 'path7',
    from: [139.6503, 35.6762], // Tokyo
    to: [151.2093, -33.8688], // Sydney
    color: '#FF5722',
    animationDuration: 6.5,
    date: '2018-12'
  }
];

/**
 * WorldMapFeature - Main component that integrates the 3D globe with controls and information display
 */
export const WorldMapFeature: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.startsWith('ar');

  
  // State for the globe and controls
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('globe');
  const [autoRotate, setAutoRotate] = useState(true);
  const [yearRange, setYearRange] = useState<[number, number]>([2020, 2024]);
  const [selectedTypes, setSelectedTypes] = useState<('visited' | 'home' | 'planned')[]>(['visited', 'home', 'planned']);
  const [selectedTravelers, setSelectedTravelers] = useState<string[]>([]);
  const [showRoutes, setShowRoutes] = useState(false);
  
  // Filter locations based on current filters
  const filteredLocations = React.useMemo(() => {
    return travelLocations.filter(location => {
      // Filter by year range
      const locationYear = parseInt(location.date.split('-')[0]);
      const withinYearRange = locationYear >= yearRange[0] && locationYear <= yearRange[1];
      
      // Filter by location type
      const matchesType = selectedTypes.includes(location.type);
      
      // Filter by travelers
      const matchesTravelers = selectedTravelers.length === 0 || 
        location.travelers.some(traveler => selectedTravelers.includes(traveler));
        
      return withinYearRange && matchesType && matchesTravelers;
    });
  }, [yearRange, selectedTypes, selectedTravelers, travelLocations]);
  
  // Calculate routes to display
  const selectedRoutes = React.useMemo(() => {
    if (!showRoutes) return [];
    
    const routes: string[] = [];
    // If a location is selected, only show routes connected to it
    if (selectedLocationId) {
      filteredLocations.forEach(location => {
        if (location.id !== selectedLocationId) {
          routes.push(`${selectedLocationId}-${location.id}`);
          routes.push(`${location.id}-${selectedLocationId}`);
        }
      });
    } 
    // Otherwise show routes between all filtered locations
    else {
      for (let i = 0; i < filteredLocations.length; i++) {
        for (let j = i + 1; j < filteredLocations.length; j++) {
          routes.push(`${filteredLocations[i].id}-${filteredLocations[j].id}`);
        }
      }
    }
    return routes;
  }, [showRoutes, selectedLocationId, filteredLocations]);
  
  return (
    <Container>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-none shadow-lg bg-gradient-to-b from-background/80 to-background">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className={`text-3xl font-bold ${isArabic ? 'font-noto' : ''}`}>
                  {t('worldMap.title')}
                </CardTitle>
                <CardDescription className={isArabic ? 'font-noto' : ''}>
                  {t('worldMap.description')}
                </CardDescription>
              </div>
              <ElmowafyLogo className="h-14 w-14 hidden md:block" />
            </div>
          </CardHeader>
          
          <CardContent className="p-0 pb-6">
            {/* 3D Globe or alternative views based on viewMode */}
            <div className="px-6">
              {viewMode === 'globe' && (
                <WorldGlobe
                  locations={filteredLocations}
                  selectedLocationId={selectedLocationId}
                  onSelectLocation={(location) => setSelectedLocationId(location.id)}
                  autoRotate={autoRotate}
                  enableZoom={true}
                  enablePan={true}
                  rotationSpeed={0.8}
                  maxDistance={5}
                  minDistance={1.5}
                  selectedRoutes={selectedRoutes}
                  highlightedFamilyMembers={selectedTravelers}
                />
              )}
              
              {/* Alternative views would be implemented here */}
              {viewMode === 'map' && (
                <div className="h-[500px] flex items-center justify-center bg-secondary/10 rounded-xl">
                  <p className="text-muted-foreground">
                    {isArabic ? 'عرض الخريطة قيد التطوير' : 'Map view coming soon'}
                  </p>
                </div>
              )}
              
              {viewMode === 'timeline' && (
                <div className="h-[500px] flex items-center justify-center bg-secondary/10 rounded-xl">
                  <p className="text-muted-foreground">
                    {isArabic ? 'عرض الجدول الزمني قيد التطوير' : 'Timeline view coming soon'}
                  </p>
                </div>
              )}
            </div>
            
            {/* Controls for the globe/map */}
            <div className="px-6">
              <WorldMapControls
                locations={travelLocations}
                onLocationSelect={setSelectedLocationId}
                onViewModeChange={setViewMode}
                onAutoRotateToggle={setAutoRotate}
                onYearRangeChange={(start, end) => setYearRange([start, end])}
                onLocationTypeChange={setSelectedTypes}
                onTravelerFilterChange={setSelectedTravelers}
                onRoutesToggle={setShowRoutes}
                autoRotate={autoRotate}
                selectedLocationId={selectedLocationId}
                viewMode={viewMode}
                yearRange={yearRange}
                selectedLocationTypes={selectedTypes}
                selectedTravelers={selectedTravelers}
                showRoutes={showRoutes}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Container>
  );
};
