import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService, queryKeys } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  Upload, 
  Brain, 
  Users, 
  Eye, 
  MapPin, 
  Calendar, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

interface AIFamilyPhotoAnalyzerProps {
  onAnalysisComplete?: (analysis: any) => void;
}

export const AIFamilyPhotoAnalyzer: React.FC<AIFamilyPhotoAnalyzerProps> = ({ 
  onAnalysisComplete 
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const queryClient = useQueryClient();

  // Fetch family members for context
  const { data: familyMembers = [] } = useQuery({
    queryKey: queryKeys.familyMembers,
    queryFn: () => apiService.getFamilyMembers(),
  });

  // AI Analysis mutation
  const analysisMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('analysisType', 'memory');
      formData.append('familyContext', JSON.stringify(familyMembers));
      
      return apiService.analyzeImage({
        imageFile: file,
        analysisType: 'memory',
        familyContext: familyMembers
      });
    },
    onSuccess: (result) => {
      setAnalysisResult(result);
      if (result.success) {
        toast.success('AI analysis complete!', {
          description: 'Smart family insights generated from your photo.',
        });
        if (onAnalysisComplete) {
          onAnalysisComplete(result);
        }
      } else {
        toast.error('Analysis failed', {
          description: result.error || 'Unknown error occurred',
        });
      }
    },
    onError: (error) => {
      toast.error('Analysis failed', {
        description: error.message,
      });
    },
  });

  const handleFileChange = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setSelectedFile(file);
    setAnalysisResult(null);
    
    // Create preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleAnalyze = () => {
    if (!selectedFile) return;
    analysisMutation.mutate(selectedFile);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setAnalysisResult(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            AI Family Photo Analyzer
            <Sparkles className="h-4 w-4 text-yellow-500" />
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Upload a family photo to get AI-powered insights including face detection, 
            family member recognition, and smart tagging suggestions.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload Section */}
          {!selectedFile ? (
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Choose a Family Photo</h3>
              <p className="text-muted-foreground mb-4">
                Select an image to analyze with our AI family recognition system
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileChange(file);
                }}
                className="hidden"
                id="photo-upload"
              />
              <label
                htmlFor="photo-upload"
                className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-lg cursor-pointer hover:bg-primary/90 transition-colors"
              >
                Select Photo
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Photo Preview */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <img
                    src={previewUrl || ''}
                    alt="Preview"
                    className="w-48 h-32 object-cover rounded-lg border"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="font-medium">{selectedFile.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleAnalyze}
                      disabled={analysisMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      {analysisMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Brain className="h-4 w-4" />
                          Analyze with AI
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={handleReset}>
                      Choose Different Photo
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysisResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {analysisResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              Analysis Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {analysisResult.success ? (
              <>
                {/* Face Detection Results */}
                {analysisResult.analysis?.faces && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-500" />
                      <h3 className="font-medium">Face Detection</h3>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm">
                        <strong>Faces Detected:</strong> {analysisResult.analysis.faces.count || 0}
                      </p>
                      {analysisResult.analysis.faces.emotions && (
                        <p className="text-sm mt-1">
                          <strong>Emotions:</strong> {analysisResult.analysis.faces.emotions.join(', ')}
                        </p>
                      )}
                      {analysisResult.analysis.faces.familyMemberMatches && (
                        <div className="mt-3">
                          <p className="text-sm font-medium mb-2">Family Members Recognized:</p>
                          <div className="flex flex-wrap gap-2">
                            {analysisResult.analysis.faces.familyMemberMatches.map((memberId: string, index: number) => {
                              const member = familyMembers.find(m => m.id === memberId);
                              return (
                                <div key={index} className="flex items-center gap-2 bg-white p-2 rounded-lg border">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={member?.avatar} />
                                    <AvatarFallback>{member?.name?.charAt(0) || 'U'}</AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm">{member?.name || `Member ${memberId}`}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Scene Analysis */}
                {analysisResult.analysis?.scene_analysis && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-green-500" />
                      <h3 className="font-medium">Scene Analysis</h3>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      {analysisResult.analysis.scene_analysis.setting && (
                        <p className="text-sm">
                          <strong>Setting:</strong> {analysisResult.analysis.scene_analysis.setting}
                        </p>
                      )}
                      {analysisResult.analysis.scene_analysis.activity && (
                        <p className="text-sm mt-1">
                          <strong>Activity:</strong> {analysisResult.analysis.scene_analysis.activity}
                        </p>
                      )}
                      {analysisResult.analysis.scene_analysis.mood && (
                        <p className="text-sm mt-1">
                          <strong>Mood:</strong> {analysisResult.analysis.scene_analysis.mood}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Smart Tags */}
                {analysisResult.analysis?.smart_tags && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      <h3 className="font-medium">Smart Tags</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {analysisResult.analysis.smart_tags.map((tag: string, index: number) => (
                        <Badge key={index} variant="secondary" className="bg-purple-100 text-purple-800">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Family Insights */}
                {analysisResult.analysis?.family_insights && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-orange-500" />
                      <h3 className="font-medium">Family Insights</h3>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      {analysisResult.analysis.family_insights.relationship_context && (
                        <p className="text-sm">
                          <strong>Relationship Context:</strong> {analysisResult.analysis.family_insights.relationship_context}
                        </p>
                      )}
                      {analysisResult.analysis.family_insights.suggested_title && (
                        <p className="text-sm mt-1">
                          <strong>Suggested Title:</strong> {analysisResult.analysis.family_insights.suggested_title}
                        </p>
                      )}
                      {analysisResult.analysis.family_insights.memory_category && (
                        <p className="text-sm mt-1">
                          <strong>Memory Category:</strong> {analysisResult.analysis.family_insights.memory_category}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Objects Detected */}
                {analysisResult.analysis?.objects && analysisResult.analysis.objects.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-indigo-500" />
                        <h3 className="font-medium">Objects Detected</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {analysisResult.analysis.objects.map((object: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-indigo-600 border-indigo-200">
                            {object}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-red-700 mb-2">Analysis Failed</h3>
                <p className="text-sm text-red-600">
                  {analysisResult.error || 'An error occurred during analysis'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Family Context Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Family Context ({familyMembers.length} members)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Our AI uses these family members for face recognition:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {familyMembers.map((member) => (
              <div key={member.id} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={member.avatar} />
                  <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{member.name}</p>
                  {member.nameArabic && (
                    <p className="text-xs text-muted-foreground truncate">{member.nameArabic}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};