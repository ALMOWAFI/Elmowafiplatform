import React, { useState, useCallback } from 'react';
import { Upload, Camera, Loader2, Users, Tag, Calendar, MapPin } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { aiService, FamilyPhotoAnalysis } from '../services/aiService';
import { useFamilyData } from '../features/family/useFamilyData';

interface AIPhotoAnalyzerProps {
  onPhotoAnalyzed?: (analysis: FamilyPhotoAnalysis & { memoryId: string }) => void;
  className?: string;
}

export const AIPhotoAnalyzer: React.FC<AIPhotoAnalyzerProps> = ({
  onPhotoAnalyzed,
  className = ''
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<FamilyPhotoAnalysis | null>(null);
  const [context, setContext] = useState('');
  const [selectedFamilyMember, setSelectedFamilyMember] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { familyMembers, isLoading: familyLoading } = useFamilyData();

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      setFile(droppedFile);
      setError(null);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(droppedFile);
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const addTag = useCallback(() => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags(prev => [...prev, newTag.trim()]);
      setNewTag('');
    }
  }, [newTag, tags]);

  const removeTag = useCallback((tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
  }, []);

  const analyzePhoto = async () => {
    if (!file) return;

    setAnalyzing(true);
    setError(null);

    try {
      const analysisResult = await aiService.analyzePhoto(
        file,
        selectedFamilyMember || undefined,
        context
      );

      setAnalysis(analysisResult);

      // Create memory record
      const memoryData = {
        ...analysisResult,
        memoryId: `memory_${Date.now()}`,
        tags: [...tags, ...analysisResult.analysis.suggested_tags],
        familyMember: selectedFamilyMember,
        userContext: context
      };

      onPhotoAnalyzed?.(memoryData);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze photo');
    } finally {
      setAnalyzing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setAnalysis(null);
    setContext('');
    setSelectedFamilyMember('');
    setTags([]);
    setNewTag('');
    setError(null);
  };

  return (
    <Card className={`w-full max-w-2xl mx-auto ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          AI Photo Analyzer
        </CardTitle>
        <CardDescription>
          Upload family photos to analyze and automatically organize memories with AI
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* File Upload Area */}
        {!file && (
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => document.getElementById('photo-upload')?.click()}
          >
            <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-700 mb-2">
              Drop your photo here or click to browse
            </p>
            <p className="text-sm text-gray-500">
              Supports JPG, PNG files up to 10MB
            </p>
            <input
              id="photo-upload"
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {/* Photo Preview */}
        {preview && (
          <div className="space-y-4">
            <div className="relative">
              <img
                src={preview}
                alt="Preview"
                className="w-full max-h-64 object-contain rounded-lg border"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={reset}
                className="absolute top-2 right-2"
              >
                Change Photo
              </Button>
            </div>

            {/* Family Member Selection */}
            <div className="space-y-2">
              <Label htmlFor="family-member">Family Member (Optional)</Label>
              <Select value={selectedFamilyMember} onValueChange={setSelectedFamilyMember}>
                <SelectTrigger>
                  <SelectValue placeholder="Select family member in this photo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None selected</SelectItem>
                  {familyMembers?.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {member.name} {member.arabicName && `(${member.arabicName})`}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Context Input */}
            <div className="space-y-2">
              <Label htmlFor="context">Context & Description</Label>
              <Textarea
                id="context"
                placeholder="Describe what's happening in this photo, where it was taken, or any special memories..."
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={3}
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => removeTag(tag)}
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {tag} ×
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a tag..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                />
                <Button onClick={addTag} variant="outline" size="sm">
                  Add
                </Button>
              </div>
            </div>

            {/* Analyze Button */}
            <Button
              onClick={analyzePhoto}
              disabled={analyzing}
              className="w-full"
              size="lg"
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing Photo...
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4 mr-2" />
                  Analyze with AI
                </>
              )}
            </Button>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Analysis Results */}
        {analysis && (
          <Card className="bg-green-50 border-green-200">
            <CardHeader>
              <CardTitle className="text-green-800">AI Analysis Complete</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="font-medium">Image Dimensions</Label>
                  <p>{analysis.analysis.image_info.width} × {analysis.analysis.image_info.height}</p>
                </div>
                <div>
                  <Label className="font-medium">Scene Analysis</Label>
                  <p>{analysis.analysis.scene_analysis}</p>
                </div>
              </div>

              <div>
                <Label className="font-medium">AI Suggested Tags</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {analysis.analysis.suggested_tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {analysis.analysis.detected_faces.length > 0 && (
                <div>
                  <Label className="font-medium">Detected Faces</Label>
                  <p>{analysis.analysis.detected_faces.length} face(s) detected</p>
                </div>
              )}

              <Alert>
                <Calendar className="h-4 w-4" />
                <AlertDescription>
                  Photo has been processed and will be added to your family memories timeline.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};