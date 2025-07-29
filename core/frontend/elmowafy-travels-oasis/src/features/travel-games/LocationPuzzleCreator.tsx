import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Puzzle, Camera, Clock, Lightbulb, Plus, Trash2, Upload, Check } from 'lucide-react';

// Types for the location puzzle creator
interface PuzzleClue {
  id: string;
  text: string;
  hint?: string;
  location?: {
    name: string;
    coordinates?: { lat: number; lng: number };
  };
  imageUrl?: string;
}

interface LocationPuzzle {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: number; // in minutes
  clues: PuzzleClue[];
  finalLocation?: {
    name: string;
    coordinates?: { lat: number; lng: number };
  };
  reward?: string;
  createdBy: string;
}

/**
 * LocationPuzzleCreator component for creating location-based puzzles and
 * 'find the trigger' games for family trips
 */
export const LocationPuzzleCreator: React.FC = () => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  
  // State for the puzzle being created
  const [puzzle, setPuzzle] = useState<Partial<LocationPuzzle>>({
    title: '',
    description: '',
    difficulty: 'medium',
    estimatedTime: 30,
    clues: [],
    createdBy: 'You' // In a real app, this would be the current user
  });
  
  // State for the current clue being edited
  const [currentClue, setCurrentClue] = useState<Partial<PuzzleClue>>({
    text: '',
    hint: '',
    location: { name: '' }
  });
  
  // State for saved puzzles
  const [savedPuzzles, setSavedPuzzles] = useState<LocationPuzzle[]>([
    {
      id: '1',
      title: 'The Lost Artifact',
      description: 'Follow the clues to find the hidden family treasure in the city.',
      difficulty: 'medium',
      estimatedTime: 45,
      clues: [
        {
          id: '1',
          text: 'Start at the oldest fountain in the main square.',
          hint: 'Look for the stone lion heads.',
          location: { name: 'Central Square Fountain' }
        },
        {
          id: '2',
          text: 'Find the building where time never stops.',
          hint: 'It has a large clock on its facade.',
          location: { name: 'Old Clock Tower' }
        },
        {
          id: '3',
          text: 'The next clue is where books find their home.',
          hint: 'A place of knowledge and silence.',
          location: { name: 'City Library' }
        }
      ],
      finalLocation: {
        name: 'Historic Museum Garden'
      },
      reward: 'Family photo album and 100 team points',
      createdBy: 'Uncle Khaled'
    }
  ]);
  
  // State for active tab
  const [activeTab, setActiveTab] = useState('create');
  
  // Add a clue to the puzzle
  const handleAddClue = () => {
    if (!currentClue.text) return;
    
    const newClue: PuzzleClue = {
      id: Date.now().toString(),
      text: currentClue.text,
      hint: currentClue.hint,
      location: currentClue.location?.name ? { name: currentClue.location.name } : undefined
    };
    
    setPuzzle(prev => ({
      ...prev,
      clues: [...(prev.clues || []), newClue]
    }));
    
    // Reset current clue
    setCurrentClue({
      text: '',
      hint: '',
      location: { name: '' }
    });
  };
  
  // Remove a clue from the puzzle
  const handleRemoveClue = (id: string) => {
    setPuzzle(prev => ({
      ...prev,
      clues: (prev.clues || []).filter(clue => clue.id !== id)
    }));
  };
  
  // Save the puzzle
  const handleSavePuzzle = () => {
    if (!puzzle.title || !puzzle.description || !(puzzle.clues && puzzle.clues.length > 0)) {
      // In a real app, show an error message
      return;
    }
    
    const newPuzzle: LocationPuzzle = {
      id: Date.now().toString(),
      title: puzzle.title || '',
      description: puzzle.description || '',
      difficulty: puzzle.difficulty || 'medium',
      estimatedTime: puzzle.estimatedTime || 30,
      clues: puzzle.clues || [],
      finalLocation: puzzle.finalLocation,
      reward: puzzle.reward,
      createdBy: puzzle.createdBy || 'You'
    };
    
    setSavedPuzzles([...savedPuzzles, newPuzzle]);
    
    // Reset the form
    setPuzzle({
      title: '',
      description: '',
      difficulty: 'medium',
      estimatedTime: 30,
      clues: [],
      createdBy: 'You'
    });
    
    // Switch to the library tab
    setActiveTab('library');
  };
  
  // Get difficulty badge color
  const getDifficultyColor = (difficulty: 'easy' | 'medium' | 'hard') => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'hard':
        return 'bg-red-500';
      default:
        return 'bg-blue-500';
    }
  };
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.4
      }
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className={isArabic ? 'font-noto' : ''}>
          {isArabic ? 'منشئ الألغاز المكانية' : 'Location Puzzle Creator'}
        </CardTitle>
        <CardDescription className={isArabic ? 'font-noto' : ''}>
          {isArabic 
            ? 'أنشئ ألغازًا وتحديات مبنية على المواقع لرحلات العائلة'
            : 'Create location-based puzzles and challenges for family trips'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="create" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 mb-6">
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Puzzle className="h-4 w-4" />
              <span>{isArabic ? 'إنشاء لغز' : 'Create Puzzle'}</span>
            </TabsTrigger>
            <TabsTrigger value="library" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{isArabic ? 'مكتبة الألغاز' : 'Puzzle Library'}</span>
            </TabsTrigger>
          </TabsList>
          
          {/* Create Puzzle Tab */}
          <TabsContent value="create">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-6"
            >
              {/* Basic Puzzle Info */}
              <motion.div variants={itemVariants}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="puzzle-title">
                      {isArabic ? 'عنوان اللغز' : 'Puzzle Title'}
                    </Label>
                    <Input
                      id="puzzle-title"
                      value={puzzle.title}
                      onChange={(e) => setPuzzle({...puzzle, title: e.target.value})}
                      placeholder={isArabic ? 'أدخل عنوان اللغز' : 'Enter puzzle title'}
                      className="mb-4"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="puzzle-description">
                      {isArabic ? 'وصف اللغز' : 'Puzzle Description'}
                    </Label>
                    <Textarea
                      id="puzzle-description"
                      value={puzzle.description}
                      onChange={(e) => setPuzzle({...puzzle, description: e.target.value})}
                      placeholder={isArabic ? 'اشرح اللغز بالتفصيل...' : 'Explain the puzzle in detail...'}
                      rows={3}
                      className="mb-4"
                    />
                  </div>
                  <div>
                    <Label htmlFor="puzzle-difficulty" className="mb-2 block">
                      {isArabic ? 'مستوى الصعوبة' : 'Difficulty Level'}
                    </Label>
                    <div className="flex space-x-2">
                      {[
                        { value: 'easy', label: isArabic ? 'سهل' : 'Easy' },
                        { value: 'medium', label: isArabic ? 'متوسط' : 'Medium' },
                        { value: 'hard', label: isArabic ? 'صعب' : 'Hard' }
                      ].map(diff => (
                        <Button
                          key={diff.value}
                          variant={puzzle.difficulty === diff.value ? 'default' : 'outline'}
                          onClick={() => setPuzzle({...puzzle, difficulty: diff.value as any})}
                          className="flex-1"
                        >
                          {diff.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="puzzle-time" className="mb-2 block">
                      {isArabic ? 'الوقت المقدر (بالدقائق)' : 'Estimated Time (minutes)'}
                    </Label>
                    <div className="flex items-center space-x-4">
                      <Slider
                        id="puzzle-time"
                        value={[puzzle.estimatedTime || 30]}
                        min={10}
                        max={120}
                        step={5}
                        onValueChange={(value) => setPuzzle({...puzzle, estimatedTime: value[0]})}
                        className="flex-1"
                      />
                      <span className="w-12 text-center">{puzzle.estimatedTime}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
              
              {/* Clue Creator */}
              <motion.div variants={itemVariants} className="bg-muted p-4 rounded-lg">
                <h3 className="text-lg font-medium mb-3">
                  {isArabic ? 'إضافة دليل جديد' : 'Add New Clue'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="clue-text">
                      {isArabic ? 'نص الدليل' : 'Clue Text'}
                    </Label>
                    <Textarea
                      id="clue-text"
                      value={currentClue.text}
                      onChange={(e) => setCurrentClue({...currentClue, text: e.target.value})}
                      placeholder={isArabic ? 'اكتب الدليل الذي سيتبعه المشاركون...' : 'Write the clue for participants to follow...'}
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="clue-hint">
                        {isArabic ? 'تلميح (اختياري)' : 'Hint (Optional)'}
                      </Label>
                      <Input
                        id="clue-hint"
                        value={currentClue.hint}
                        onChange={(e) => setCurrentClue({...currentClue, hint: e.target.value})}
                        placeholder={isArabic ? 'تلميح لمساعدة المشاركين...' : 'A hint to help participants...'}
                      />
                    </div>
                    <div>
                      <Label htmlFor="clue-location">
                        {isArabic ? 'الموقع (اختياري)' : 'Location (Optional)'}
                      </Label>
                      <Input
                        id="clue-location"
                        value={currentClue.location?.name}
                        onChange={(e) => setCurrentClue({
                          ...currentClue, 
                          location: { name: e.target.value }
                        })}
                        placeholder={isArabic ? 'اسم الموقع...' : 'Location name...'}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handleAddClue}>
                      <Plus className="h-4 w-4 mr-2" />
                      {isArabic ? 'إضافة الدليل' : 'Add Clue'}
                    </Button>
                  </div>
                </div>
              </motion.div>
              
              {/* Clue List */}
              {puzzle.clues && puzzle.clues.length > 0 && (
                <motion.div variants={itemVariants}>
                  <h3 className="text-lg font-medium mb-3">
                    {isArabic ? 'الأدلة المضافة' : 'Added Clues'}
                  </h3>
                  <div className="space-y-3">
                    {puzzle.clues.map((clue, index) => (
                      <div key={clue.id} className="bg-muted p-3 rounded-lg flex items-start">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground mr-3 text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{clue.text}</p>
                          {clue.hint && (
                            <div className="flex items-center text-sm text-muted-foreground mt-1">
                              <Lightbulb className="h-3 w-3 mr-1" />
                              {isArabic ? 'تلميح: ' : 'Hint: '}{clue.hint}
                            </div>
                          )}
                          {clue.location?.name && (
                            <div className="flex items-center text-sm text-muted-foreground mt-1">
                              <MapPin className="h-3 w-3 mr-1" />
                              {clue.location.name}
                            </div>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveClue(clue.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
              
              {/* Final Location and Reward */}
              <motion.div variants={itemVariants}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="final-location">
                      {isArabic ? 'الموقع النهائي (اختياري)' : 'Final Location (Optional)'}
                    </Label>
                    <Input
                      id="final-location"
                      value={puzzle.finalLocation?.name || ''}
                      onChange={(e) => setPuzzle({
                        ...puzzle, 
                        finalLocation: { name: e.target.value }
                      })}
                      placeholder={isArabic ? 'الوجهة النهائية للغز...' : 'Final destination of the puzzle...'}
                    />
                  </div>
                  <div>
                    <Label htmlFor="puzzle-reward">
                      {isArabic ? 'المكافأة (اختياري)' : 'Reward (Optional)'}
                    </Label>
                    <Input
                      id="puzzle-reward"
                      value={puzzle.reward || ''}
                      onChange={(e) => setPuzzle({...puzzle, reward: e.target.value})}
                      placeholder={isArabic ? 'مكافأة للفائزين...' : 'Reward for winners...'}
                    />
                  </div>
                </div>
              </motion.div>
              
              {/* Save Button */}
              <motion.div variants={itemVariants} className="flex justify-end">
                <Button 
                  onClick={handleSavePuzzle}
                  disabled={!puzzle.title || !puzzle.description || !(puzzle.clues && puzzle.clues.length > 0)}
                  className="w-full md:w-auto"
                >
                  <Check className="h-4 w-4 mr-2" />
                  {isArabic ? 'حفظ اللغز' : 'Save Puzzle'}
                </Button>
              </motion.div>
            </motion.div>
          </TabsContent>
          
          {/* Puzzle Library Tab */}
          <TabsContent value="library">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-6"
            >
              {savedPuzzles.length === 0 ? (
                <motion.div variants={itemVariants} className="text-center py-12">
                  <Puzzle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {isArabic ? 'لا توجد ألغاز محفوظة' : 'No Saved Puzzles'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {isArabic 
                      ? 'ابدأ بإنشاء لغزك الأول لإضافته إلى المكتبة'
                      : 'Start creating your first puzzle to add it to the library'}
                  </p>
                  <Button onClick={() => setActiveTab('create')}>
                    <Plus className="h-4 w-4 mr-2" />
                    {isArabic ? 'إنشاء لغز جديد' : 'Create New Puzzle'}
                  </Button>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedPuzzles.map((savedPuzzle) => (
                    <motion.div key={savedPuzzle.id} variants={itemVariants}>
                      <Card>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <CardTitle>{savedPuzzle.title}</CardTitle>
                            <Badge 
                              className={`${getDifficultyColor(savedPuzzle.difficulty)} text-white`}
                            >
                              {savedPuzzle.difficulty === 'easy' ? (isArabic ? 'سهل' : 'Easy') :
                               savedPuzzle.difficulty === 'medium' ? (isArabic ? 'متوسط' : 'Medium') :
                               (isArabic ? 'صعب' : 'Hard')}
                            </Badge>
                          </div>
                          <CardDescription>{savedPuzzle.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center text-sm text-muted-foreground mb-3">
                            <Clock className="h-4 w-4 mr-2" />
                            {savedPuzzle.estimatedTime} {isArabic ? 'دقيقة' : 'minutes'}
                            <span className="mx-2">•</span>
                            <MapPin className="h-4 w-4 mr-2" />
                            {savedPuzzle.clues.length} {isArabic ? 'أدلة' : 'clues'}
                          </div>
                          
                          <div className="space-y-2">
                            {savedPuzzle.clues.slice(0, 2).map((clue, index) => (
                              <div key={clue.id} className="bg-muted p-2 rounded text-sm">
                                <span className="font-medium">{index + 1}.</span> {clue.text}
                              </div>
                            ))}
                            {savedPuzzle.clues.length > 2 && (
                              <div className="text-center text-sm text-muted-foreground">
                                + {savedPuzzle.clues.length - 2} {isArabic ? 'أدلة أخرى' : 'more clues'}
                              </div>
                            )}
                          </div>
                          
                          {savedPuzzle.finalLocation && (
                            <div className="mt-3 text-sm">
                              <span className="font-medium">
                                {isArabic ? 'الموقع النهائي: ' : 'Final Location: '}
                              </span>
                              {savedPuzzle.finalLocation.name}
                            </div>
                          )}
                          
                          {savedPuzzle.reward && (
                            <div className="mt-1 text-sm">
                              <span className="font-medium">
                                {isArabic ? 'المكافأة: ' : 'Reward: '}
                              </span>
                              {savedPuzzle.reward}
                            </div>
                          )}
                        </CardContent>
                        <CardFooter className="flex justify-between pt-0">
                          <div className="text-sm text-muted-foreground">
                            {isArabic ? 'بواسطة: ' : 'By: '}{savedPuzzle.createdBy}
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4 mr-2" />
                              {isArabic ? 'تعديل' : 'Edit'}
                            </Button>
                            <Button variant="default" size="sm">
                              <MapPin className="h-4 w-4 mr-2" />
                              {isArabic ? 'استخدام' : 'Use'}
                            </Button>
                          </div>
                        </CardFooter>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};