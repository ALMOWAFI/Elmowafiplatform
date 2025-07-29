import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { apiService, queryKeys } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  CheckCircle, 
  Sparkles, 
  Brain, 
  Users, 
  Calendar, 
  MapPin, 
  Camera, 
  Upload, 
  Eye, 
  Zap,
  Globe,
  Heart,
  Star,
  Loader2,
  AlertCircle,
  Database,
  Server,
  Code,
  Cpu
} from 'lucide-react';
import { toast } from 'sonner';

interface IntegrationStatus {
  component: string;
  status: 'connected' | 'loading' | 'error';
  description: string;
  features: string[];
}

export const IntegrationDemo: React.FC = () => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  const queryClient = useQueryClient();
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // Test all API connections
  const { data: healthStatus, isLoading: healthLoading } = useQuery({
    queryKey: ['health'],
    queryFn: () => apiService.healthCheck(),
    refetchInterval: 10000, // Check every 10 seconds
  });

  const { data: familyMembers = [] } = useQuery({
    queryKey: queryKeys.familyMembers,
    queryFn: () => apiService.getFamilyMembers(),
  });

  const { data: memories = [] } = useQuery({
    queryKey: queryKeys.memories(),
    queryFn: () => apiService.getMemories(),
  });

  const { data: suggestions } = useQuery({
    queryKey: queryKeys.memorySuggestions(),
    queryFn: () => apiService.getMemorySuggestions(),
  });

  const { data: travelRecs } = useQuery({
    queryKey: ['travel-demo'],
    queryFn: () => apiService.getAITravelRecommendations('Dubai', {
      members: familyMembers,
      budget: 2000,
      interests: ['culture', 'family', 'food']
    }),
    enabled: familyMembers.length > 0,
  });

  // AI Analysis mutation
  const analysisMutation = useMutation({
    mutationFn: async (file: File) => {
      return apiService.analyzeImage({
        imageFile: file,
        analysisType: 'memory',
        familyContext: familyMembers
      });
    },
    onSuccess: (result) => {
      setAnalysisResult(result);
      toast.success(isArabic ? 'تم التحليل بنجاح!' : 'Analysis completed successfully!');
    },
    onError: (error) => {
      toast.error(isArabic ? 'فشل التحليل' : 'Analysis failed');
    },
  });

  // Calculate integration status
  const integrationStatuses: IntegrationStatus[] = [
    {
      component: 'Main API Server',
      status: healthStatus?.services.api ? 'connected' : 'error',
      description: 'FastAPI server handling all family data operations',
      features: ['Family Management', 'Memory Storage', 'Travel Planning', 'Real-time WebSockets']
    },
    {
      component: 'AI Processing Engine',
      status: healthStatus?.services.ai ? 'connected' : 'error',
      description: 'hack2 AI service for photo analysis and smart suggestions',
      features: ['Photo Analysis', 'Face Recognition', 'Smart Tagging', 'Educational Content']
    },
    {
      component: 'Smart Memory System',
      status: suggestions ? 'connected' : (healthLoading ? 'loading' : 'error'),
      description: 'AI-powered memory suggestions and timeline',
      features: ['On This Day', 'Similar Memories', 'Pattern Analysis', 'Recommendations']
    },
    {
      component: 'Travel Intelligence',
      status: travelRecs ? 'connected' : (familyMembers.length === 0 ? 'loading' : 'error'),
      description: 'AI travel assistant with family preferences',
      features: ['Destination Analysis', 'Activity Suggestions', 'Budget Planning', 'Cultural Tips']
    }
  ];

  const connectedComponents = integrationStatuses.filter(s => s.status === 'connected').length;
  const totalComponents = integrationStatuses.length;

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      analysisMutation.mutate(file);
    } else {
      toast.error(isArabic ? 'يرجى اختيار صورة' : 'Please select an image file');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="flex items-center justify-center gap-3">
          <div className="relative">
            <Zap className="h-12 w-12 text-blue-600" />
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full"
            />
          </div>
          <h1 className={`text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent ${isArabic ? 'font-noto' : ''}`}>
            {isArabic ? 'عرض التكامل الكامل' : 'Complete Integration Demo'}
          </h1>
        </div>
        
        <p className={`text-lg text-muted-foreground max-w-2xl mx-auto ${isArabic ? 'font-noto' : ''}`}>
          {isArabic 
            ? 'عرض شامل لجميع مكونات النظام المتكامل للذكريات العائلية والسفر مع الذكاء الاصطناعي'
            : 'Comprehensive demonstration of all integrated system components for family memories, travel, and AI processing'
          }
        </p>

        {/* Integration Status */}
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="inline-flex items-center gap-3 bg-green-50 border border-green-200 rounded-full px-6 py-3"
        >
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className={`font-medium text-green-700 ${isArabic ? 'font-noto' : ''}`}>
            {isArabic 
              ? `${connectedComponents}/${totalComponents} مكونات متصلة`
              : `${connectedComponents}/${totalComponents} Components Connected`
            }
          </span>
          <div className="flex -space-x-1">
            {integrationStatuses.map((status, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full border-2 border-white ${
                  status.status === 'connected' ? 'bg-green-500' :
                  status.status === 'loading' ? 'bg-yellow-500' : 'bg-red-500'
                }`}
              />
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* Main Demo Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            {isArabic ? 'نظرة عامة' : 'Overview'}
          </TabsTrigger>
          <TabsTrigger value="ai-demo" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            {isArabic ? 'الذكاء الاصطناعي' : 'AI Demo'}
          </TabsTrigger>
          <TabsTrigger value="integration" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            {isArabic ? 'التكامل' : 'Integration'}
          </TabsTrigger>
          <TabsTrigger value="live-data" className="flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            {isArabic ? 'البيانات المباشرة' : 'Live Data'}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            {integrationStatuses.map((integration, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        integration.status === 'connected' ? 'bg-green-100' :
                        integration.status === 'loading' ? 'bg-yellow-100' : 'bg-red-100'
                      }`}>
                        {integration.status === 'connected' ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : integration.status === 'loading' ? (
                          <Loader2 className="h-5 w-5 text-yellow-600 animate-spin" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <div>
                        <h3 className={`font-semibold ${isArabic ? 'font-noto' : ''}`}>
                          {integration.component}
                        </h3>
                        <Badge variant={
                          integration.status === 'connected' ? 'default' :
                          integration.status === 'loading' ? 'secondary' : 'destructive'
                        }>
                          {integration.status.toUpperCase()}
                        </Badge>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={`text-muted-foreground mb-4 ${isArabic ? 'font-noto' : ''}`}>
                      {integration.description}
                    </p>
                    <div className="space-y-2">
                      <h4 className={`font-medium text-sm ${isArabic ? 'font-noto' : ''}`}>
                        {isArabic ? 'الميزات:' : 'Features:'}
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {integration.features.map((feature, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* AI Demo Tab */}
        <TabsContent value="ai-demo" className="mt-6">
          <div className="space-y-6">
            {/* Live AI Analysis Demo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-500" />
                  {isArabic ? 'تحليل الصور بالذكاء الاصطناعي' : 'AI Photo Analysis Demo'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                  <Camera className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className={`text-lg font-medium mb-2 ${isArabic ? 'font-noto' : ''}`}>
                    {isArabic ? 'اختر صورة للتحليل' : 'Select Image for Analysis'}
                  </h3>
                  <p className={`text-muted-foreground mb-4 ${isArabic ? 'font-noto' : ''}`}>
                    {isArabic 
                      ? 'سيقوم الذكاء الاصطناعي بتحليل الصورة وتمييز أفراد العائلة'
                      : 'AI will analyze the image and recognize family members'
                    }
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="ai-demo-upload"
                  />
                  <label
                    htmlFor="ai-demo-upload"
                    className="inline-flex items-center justify-center px-6 py-3 bg-purple-600 text-white rounded-lg cursor-pointer hover:bg-purple-700 transition-colors"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {isArabic ? 'اختر صورة' : 'Choose Image'}
                  </label>
                </div>

                {analysisMutation.isPending && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                    <span className="ml-2 text-muted-foreground">
                      {isArabic ? 'جاري التحليل...' : 'Analyzing...'}
                    </span>
                  </div>
                )}

                {analysisResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-purple-50 border border-purple-200 rounded-lg p-4"
                  >
                    <h4 className={`font-medium mb-3 ${isArabic ? 'font-noto' : ''}`}>
                      {isArabic ? 'نتائج التحليل:' : 'Analysis Results:'}
                    </h4>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <strong>{isArabic ? 'حالة التحليل:' : 'Analysis Status:'}</strong>
                        <Badge className="ml-2" variant={analysisResult.success ? 'default' : 'destructive'}>
                          {analysisResult.success ? 'SUCCESS' : 'ERROR'}
                        </Badge>
                      </div>
                      {analysisResult.analysis && (
                        <>
                          <div>
                            <strong>{isArabic ? 'الوجوه المكتشفة:' : 'Faces Detected:'}</strong>
                            <span className="ml-2">{analysisResult.analysis.faces?.count || 0}</span>
                          </div>
                          <div>
                            <strong>{isArabic ? 'الكائنات:' : 'Objects:'}</strong>
                            <span className="ml-2">{analysisResult.analysis.objects?.length || 0}</span>
                          </div>
                          <div>
                            <strong>{isArabic ? 'النوع:' : 'Type:'}</strong>
                            <span className="ml-2">{analysisResult.analysis.type || 'Unknown'}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>

            {/* Smart Suggestions Display */}
            {suggestions && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-yellow-500" />
                    {isArabic ? 'الاقتراحات الذكية' : 'Smart AI Suggestions'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className={`font-medium mb-2 ${isArabic ? 'font-noto' : ''}`}>
                        {isArabic ? 'في مثل هذا اليوم:' : 'On This Day:'}
                      </h4>
                      <div className="space-y-2">
                        {suggestions.onThisDay?.length > 0 ? (
                          suggestions.onThisDay.slice(0, 2).map((memory: any, idx: number) => (
                            <div key={idx} className="p-2 bg-blue-50 rounded border">
                              <p className="text-sm font-medium">{memory.title}</p>
                              <p className="text-xs text-muted-foreground">{memory.date}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {isArabic ? 'لا توجد ذكريات من هذا اليوم' : 'No memories from this day'}
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className={`font-medium mb-2 ${isArabic ? 'font-noto' : ''}`}>
                        {isArabic ? 'توصيات:' : 'Recommendations:'}
                      </h4>
                      <div className="space-y-1">
                        {suggestions.recommendations?.slice(0, 3).map((rec: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-2">
                            <Star className="h-3 w-3 text-yellow-500" />
                            <p className="text-sm">{rec}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Integration Tab */}
        <TabsContent value="integration" className="mt-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5 text-blue-500" />
                  {isArabic ? 'معمارية النظام' : 'System Architecture'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
                        <Globe className="h-6 w-6 text-blue-600" />
                      </div>
                      <h3 className={`font-medium ${isArabic ? 'font-noto' : ''}`}>
                        {isArabic ? 'الواجهة الأمامية' : 'React Frontend'}
                      </h3>
                      <p className="text-sm text-muted-foreground">Port 8081</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="w-12 h-12 bg-green-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
                        <Server className="h-6 w-6 text-green-600" />
                      </div>
                      <h3 className={`font-medium ${isArabic ? 'font-noto' : ''}`}>
                        {isArabic ? 'خادم API' : 'API Server'}
                      </h3>
                      <p className="text-sm text-muted-foreground">Port 8001</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
                        <Brain className="h-6 w-6 text-purple-600" />
                      </div>
                      <h3 className={`font-medium ${isArabic ? 'font-noto' : ''}`}>
                        {isArabic ? 'خدمة الذكاء الاصطناعي' : 'AI Service'}
                      </h3>
                      <p className="text-sm text-muted-foreground">Port 5000</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="text-center">
                    <h4 className={`font-medium mb-2 ${isArabic ? 'font-noto' : ''}`}>
                      {isArabic ? 'تدفق البيانات' : 'Data Flow'}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      React ↔ FastAPI ↔ AI Services ↔ SQLite Database
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{isArabic ? 'إحصائيات الأداء' : 'Performance Stats'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">{connectedComponents}</div>
                    <div className="text-sm text-muted-foreground">
                      {isArabic ? 'مكونات متصلة' : 'Connected Components'}
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{familyMembers.length}</div>
                    <div className="text-sm text-muted-foreground">
                      {isArabic ? 'أفراد العائلة' : 'Family Members'}
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">{memories.length}</div>
                    <div className="text-sm text-muted-foreground">
                      {isArabic ? 'الذكريات' : 'Memories'}
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-600">
                      {suggestions?.recommendations?.length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {isArabic ? 'الاقتراحات' : 'Suggestions'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Live Data Tab */}
        <TabsContent value="live-data" className="mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  {isArabic ? 'أفراد العائلة' : 'Family Members'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {familyMembers.map((member) => (
                    <div key={member.id} className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg">
                      <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium">{member.name.charAt(0)}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{member.name}</p>
                        {member.nameArabic && (
                          <p className="text-sm text-muted-foreground">{member.nameArabic}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-red-500" />
                  {isArabic ? 'الذكريات الحديثة' : 'Recent Memories'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {memories.slice(0, 3).map((memory) => (
                    <div key={memory.id} className="p-3 border rounded-lg">
                      <h4 className="font-medium">{memory.title}</h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(memory.date).toLocaleDateString()}
                        </div>
                        {memory.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {memory.location}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {memory.tags.slice(0, 3).map((tag, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};