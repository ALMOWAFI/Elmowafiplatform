import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Container } from '@/components/ui/container';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/context/LanguageContext';
import { FamilyTreeGraph } from './FamilyTreeGraph';
import { FamilyMemberProfile } from './FamilyMemberProfile';
import { familyMembers, familyConnections } from './data';
import { FamilyMember, FamilyTreeLayoutOptions, FamilyTreeFilterOptions } from './types';
import { Search, Filter, Users, RefreshCw, ChevronRight, Settings, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ElmowafyLogo } from '@/components/ElmowafyLogo';

/**
 * Main Family Tree feature component that brings together the visualization,
 * controls, and detailed member information
 */
export const FamilyTreeFeature: React.FC = () => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  
  // Family data state
  const [members, setMembers] = useState(familyMembers);
  const [connections, setConnections] = useState(familyConnections);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Layout options
  const [layoutOptions, setLayoutOptions] = useState<FamilyTreeLayoutOptions>({
    orientation: 'horizontal',
    nodeSize: 80,
    nodePadding: 40,
    showProfileImages: true,
    showTravelHistory: true,
    compactMode: false,
    expandedNodeIds: members.filter(m => m.expanded).map(m => m.id),
  });
  
  // Filter options
  const [filterOptions, setFilterOptions] = useState<FamilyTreeFilterOptions>({
    generation: undefined,
    branch: 'all',
    minYear: undefined,
    maxYear: undefined,
    includeSpouses: true,
    onlyShowWithPhotos: false,
    locationFilter: [],
  });
  
  // Get the selected member
  const selectedMember = selectedMemberId 
    ? members.find(m => m.id === selectedMemberId) 
    : null;
  
  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    
    // Update layout options with search query
    setLayoutOptions(prev => ({
      ...prev,
      searchQuery: e.target.value,
    }));
    
    // If there's a single search result, select it
    if (e.target.value) {
      const results = members.filter(
        m => m.name.toLowerCase().includes(e.target.value.toLowerCase()) ||
             m.arabicName.toLowerCase().includes(e.target.value.toLowerCase())
      );
      
      if (results.length === 1) {
        setSelectedMemberId(results[0].id);
      }
    }
  };
  
  // Handle member expansion
  const handleMemberExpand = (id: string) => {
    // Toggle expansion state
    setMembers(prev => prev.map(m => 
      m.id === id ? { ...m, expanded: !m.expanded } : m
    ));
    
    // Update expanded node IDs
    setLayoutOptions(prev => {
      const member = members.find(m => m.id === id);
      const isExpanded = member?.expanded || false;
      
      if (isExpanded) {
        return {
          ...prev,
          expandedNodeIds: prev.expandedNodeIds.filter(nId => nId !== id),
        };
      } else {
        return {
          ...prev,
          expandedNodeIds: [...prev.expandedNodeIds, id],
        };
      }
    });
    
    // Update connections
    setConnections(prev => prev.map(conn => {
      if (conn.sourceId === id || conn.targetId === id) {
        const member = members.find(m => m.id === id);
        const isExpanded = member?.expanded || false;
        return {
          ...conn,
          isExpanded: !isExpanded,
        };
      }
      return conn;
    }));
  };
  
  // Reset all filters and layout options
  const handleResetAll = () => {
    setFilterOptions({
      generation: undefined,
      branch: 'all',
      minYear: undefined,
      maxYear: undefined,
      includeSpouses: true,
      onlyShowWithPhotos: false,
      locationFilter: [],
    });
    
    setLayoutOptions({
      orientation: 'horizontal',
      nodeSize: 80,
      nodePadding: 40,
      showProfileImages: true,
      showTravelHistory: true,
      compactMode: false,
      searchQuery: '',
      expandedNodeIds: members.filter(m => m.expanded).map(m => m.id),
    });
    
    setSearchQuery('');
  };
  
  // Set initial expanded state for root members
  useEffect(() => {
    // Expand root nodes initially
    const rootMembers = members.filter(m => !m.parentIds || m.parentIds.length === 0);
    
    setMembers(prev => prev.map(m => {
      if (!m.parentIds || m.parentIds.length === 0) {
        return { ...m, expanded: true };
      }
      return m;
    }));
    
    // Select the first root member if none selected
    if (!selectedMemberId && rootMembers.length > 0) {
      setSelectedMemberId(rootMembers[0].id);
    }
  }, []);
  
  return (
    <Container>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-none shadow-lg bg-gradient-to-b from-background/80 to-background">
          <CardHeader className="pb-4">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div>
                <CardTitle className={`text-3xl font-bold ${isArabic ? 'font-noto' : ''}`}>
                  {isArabic ? 'شجرة عائلة الموافي' : 'Elmowafy Family Tree'}
                </CardTitle>
                <CardDescription className={isArabic ? 'font-noto' : ''}>
                  {isArabic 
                    ? 'استكشف تاريخ العائلة وروابطها وذكريات السفر المشتركة' 
                    : 'Explore family history, connections and shared travel memories'}
                </CardDescription>
              </div>
              
              {/* Search bar */}
              <div className="relative min-w-[200px]">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={isArabic ? 'ابحث عن أفراد العائلة...' : 'Search family members...'}
                  className={`pl-8 ${isArabic ? 'font-noto' : ''}`}
                  value={searchQuery}
                  onChange={handleSearch}
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-7 w-7"
                    onClick={() => {
                      setSearchQuery('');
                      setLayoutOptions(prev => ({
                        ...prev,
                        searchQuery: '',
                      }));
                    }}
                  >
                    <span className="sr-only">Clear</span>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              <ElmowafyLogo className="h-14 w-14 hidden md:block" />
            </div>
            
            {/* Filter and view controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
              <Tabs 
                defaultValue="tree" 
                className="w-auto"
              >
                <TabsList>
                  <TabsTrigger value="tree" className="flex items-center gap-1">
                    <Users size={16} />
                    <span>{isArabic ? 'شجرة' : 'Tree'}</span>
                  </TabsTrigger>
                  <TabsTrigger value="gallery" className="flex items-center gap-1">
                    <Grid2X2 size={16} />
                    <span>{isArabic ? 'معرض' : 'Gallery'}</span>
                  </TabsTrigger>
                  <TabsTrigger value="map" className="flex items-center gap-1">
                    <Globe size={16} />
                    <span>{isArabic ? 'خريطة' : 'Map'}</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter size={16} />
                  <span className="hidden sm:inline">
                    {isArabic ? 'فلاتر' : 'Filters'}
                  </span>
                </Button>
                
                <Select 
                  defaultValue="horizontal"
                  onValueChange={(value) => {
                    setLayoutOptions(prev => ({
                      ...prev,
                      orientation: value as 'horizontal' | 'vertical',
                    }));
                  }}
                >
                  <SelectTrigger className="w-auto">
                    <SelectValue placeholder={isArabic ? 'الاتجاه' : 'Orientation'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="horizontal">
                      {isArabic ? 'أفقي' : 'Horizontal'}
                    </SelectItem>
                    <SelectItem value="vertical">
                      {isArabic ? 'عمودي' : 'Vertical'}
                    </SelectItem>
                  </SelectContent>
                </Select>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleResetAll}
                  title={isArabic ? 'إعادة ضبط' : 'Reset'}
                >
                  <RefreshCw size={16} />
                </Button>
              </div>
            </div>
            
            {/* Expandable filter panel */}
            <motion.div
              initial={false}
              animate={{ height: showFilters ? 'auto' : 0, opacity: showFilters ? 1 : 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden mt-4"
            >
              {showFilters && (
                <Card className="bg-secondary/10 border-0">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Branch filter */}
                      <div>
                        <h3 className={`text-sm font-medium mb-3 ${isArabic ? 'font-noto' : ''}`}>
                          {isArabic ? 'فرع العائلة' : 'Family Branch'}
                        </h3>
                        
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant={filterOptions.branch === 'all' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilterOptions(prev => ({ ...prev, branch: 'all' }))}
                          >
                            {isArabic ? 'الكل' : 'All'}
                          </Button>
                          <Button
                            variant={filterOptions.branch === 'ahmed' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilterOptions(prev => ({ ...prev, branch: 'ahmed' }))}
                          >
                            {isArabic ? 'أحمد' : 'Ahmed'}
                          </Button>
                          <Button
                            variant={filterOptions.branch === 'mohamed' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilterOptions(prev => ({ ...prev, branch: 'mohamed' }))}
                          >
                            {isArabic ? 'محمد' : 'Mohamed'}
                          </Button>
                          <Button
                            variant={filterOptions.branch === 'khaled' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilterOptions(prev => ({ ...prev, branch: 'khaled' }))}
                          >
                            {isArabic ? 'خالد' : 'Khaled'}
                          </Button>
                        </div>
                      </div>
                      
                      {/* Birth year range */}
                      <div>
                        <h3 className={`text-sm font-medium mb-3 ${isArabic ? 'font-noto' : ''}`}>
                          {isArabic ? 'سنة الميلاد' : 'Birth Year'}
                        </h3>
                        
                        <Slider
                          defaultValue={[1960, 2025]}
                          min={1960}
                          max={2025}
                          step={1}
                          onValueChange={([min, max]) => {
                            setFilterOptions(prev => ({
                              ...prev,
                              minYear: min,
                              maxYear: max,
                            }));
                          }}
                        />
                        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                          <span>{filterOptions.minYear || 1960}</span>
                          <span>{filterOptions.maxYear || 2025}</span>
                        </div>
                      </div>
                      
                      {/* Display options */}
                      <div>
                        <h3 className={`text-sm font-medium mb-3 ${isArabic ? 'font-noto' : ''}`}>
                          {isArabic ? 'خيارات العرض' : 'Display Options'}
                        </h3>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="show-images" className={isArabic ? 'font-noto' : ''}>
                              {isArabic ? 'عرض الصور' : 'Show Images'}
                            </Label>
                            <Switch
                              id="show-images"
                              checked={layoutOptions.showProfileImages}
                              onCheckedChange={(checked) => {
                                setLayoutOptions(prev => ({
                                  ...prev,
                                  showProfileImages: checked,
                                }));
                              }}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <Label htmlFor="compact-mode" className={isArabic ? 'font-noto' : ''}>
                              {isArabic ? 'عرض مضغوط' : 'Compact Mode'}
                            </Label>
                            <Switch
                              id="compact-mode"
                              checked={layoutOptions.compactMode}
                              onCheckedChange={(checked) => {
                                setLayoutOptions(prev => ({
                                  ...prev,
                                  compactMode: checked,
                                  nodeSize: checked ? 60 : 80,
                                }));
                              }}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <Label htmlFor="include-spouses" className={isArabic ? 'font-noto' : ''}>
                              {isArabic ? 'تضمين الأزواج' : 'Include Spouses'}
                            </Label>
                            <Switch
                              id="include-spouses"
                              checked={filterOptions.includeSpouses}
                              onCheckedChange={(checked) => {
                                setFilterOptions(prev => ({
                                  ...prev,
                                  includeSpouses: checked,
                                }));
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResetAll}
                      >
                        {isArabic ? 'إعادة تعيين الكل' : 'Reset All'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </CardHeader>
          
          <CardContent className="p-0 pb-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Family tree visualization */}
              <div className="w-full lg:w-2/3 px-6">
                <TabsContent value="tree" className="mt-0">
                  <FamilyTreeGraph
                    members={members}
                    connections={connections}
                    layoutOptions={layoutOptions}
                    onMemberSelect={setSelectedMemberId}
                    onMemberExpand={handleMemberExpand}
                    selectedMemberId={selectedMemberId}
                  />
                </TabsContent>
                
                <TabsContent value="gallery" className="mt-0">
                  <div className="h-[600px] flex items-center justify-center bg-secondary/10 rounded-xl">
                    <p className="text-muted-foreground">
                      {isArabic ? 'معرض الصور قيد التطوير' : 'Gallery view coming soon'}
                    </p>
                  </div>
                </TabsContent>
                
                <TabsContent value="map" className="mt-0">
                  <div className="h-[600px] flex items-center justify-center bg-secondary/10 rounded-xl">
                    <p className="text-muted-foreground">
                      {isArabic ? 'عرض الخريطة قيد التطوير' : 'Map view coming soon'}
                    </p>
                  </div>
                </TabsContent>
              </div>
              
              {/* Selected member profile */}
              <div className="w-full lg:w-1/3 px-6">
                {selectedMember ? (
                  <FamilyMemberProfile
                    member={selectedMember}
                    allMembers={members}
                    onMemberSelect={setSelectedMemberId}
                  />
                ) : (
                  <Card className="border bg-card/50 h-[600px] flex items-center justify-center">
                    <CardContent className="text-center px-6 py-10">
                      <Users size={48} className="mx-auto text-muted-foreground/50" />
                      <h3 className="mt-4 text-lg font-medium">
                        {isArabic ? 'اختر فرداً من العائلة' : 'Select a Family Member'}
                      </h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {isArabic 
                          ? 'انقر على أحد أفراد العائلة في شجرة العائلة لعرض المزيد من المعلومات.' 
                          : 'Click on a family member in the tree to view more information.'}
                      </p>
                      <div className="mt-6">
                        <Button variant="outline" onClick={() => {
                          const rootMembers = members.filter(m => !m.parentIds || m.parentIds.length === 0);
                          if (rootMembers.length > 0) {
                            setSelectedMemberId(rootMembers[0].id);
                          }
                        }}>
                          {isArabic ? 'اختر الجد' : 'Select Patriarch'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Container>
  );
};

// Missing components that need to be imported
import { X, Grid2X2 } from 'lucide-react';
