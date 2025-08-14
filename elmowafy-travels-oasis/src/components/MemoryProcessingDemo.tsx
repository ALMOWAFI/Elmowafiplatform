import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiService } from '@/lib/api';

interface MemoryProcessingDemoProps {}

export const MemoryProcessingDemo: React.FC<MemoryProcessingDemoProps> = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any>(null);
  const [travelRecommendations, setTravelRecommendations] = useState<any>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [chatResponse, setChatResponse] = useState<any>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const analyzeImage = async () => {
    if (!selectedFile) return;

    setLoading('analysis');
    try {
      const result = await apiService.analyzeImageWithAI(selectedFile, {
        analysisType: 'memory_processing',
        includeFaceDetection: true,
        includeSceneAnalysis: true
      });
      setAnalysis(result);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setLoading(null);
    }
  };

  const getMemoryTimeline = async () => {
    setLoading('timeline');
    try {
      const result = await apiService.getMemoryTimeline({
        limit: 10,
        offset: 0
      });
      setTimeline(result.timeline);
    } catch (error) {
      console.error('Timeline fetch failed:', error);
    } finally {
      setLoading(null);
    }
  };

  const getMemorySuggestions = async () => {
    setLoading('suggestions');
    try {
      const result = await apiService.getMemorySuggestions(
        new Date().toISOString(),
        'family'
      );
      setSuggestions(result);
    } catch (error) {
      console.error('Suggestions fetch failed:', error);
    } finally {
      setLoading(null);
    }
  };

  const getTravelRecommendations = async () => {
    setLoading('travel');
    try {
      const result = await apiService.getDestinationRecommendations({
        travelDates: '2024-12-01',
        budget: 5000,
        familySize: 4,
        interests: ['cultural', 'educational', 'entertainment']
      });
      setTravelRecommendations(result);
    } catch (error) {
      console.error('Travel recommendations failed:', error);
    } finally {
      setLoading(null);
    }
  };

  const chatWithAI = async () => {
    if (!chatMessage.trim()) return;

    setLoading('chat');
    try {
      const result = await apiService.chatWithAI({
        message: chatMessage,
        conversationId: 'demo-conversation'
      });
      setChatResponse(result);
      setChatMessage('');
    } catch (error) {
      console.error('Chat failed:', error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-center mb-8">
        Memory Processing & AI Integration Demo
      </h1>

      {/* Image Analysis Section */}
      <Card>
        <CardHeader>
          <CardTitle>AI Image Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
          />
          <Button
            onClick={analyzeImage}
            disabled={!selectedFile || loading === 'analysis'}
          >
            {loading === 'analysis' ? 'Analyzing...' : 'Analyze Image with AI'}
          </Button>
          
          {analysis && (
            <div className="bg-gray-100 p-4 rounded">
              <h4 className="font-semibold mb-2">Analysis Result:</h4>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(analysis, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Memory Timeline Section */}
      <Card>
        <CardHeader>
          <CardTitle>Memory Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={getMemoryTimeline}
            disabled={loading === 'timeline'}
          >
            {loading === 'timeline' ? 'Loading...' : 'Get Memory Timeline'}
          </Button>
          
          {timeline.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold">Timeline ({timeline.length} items):</h4>
              {timeline.map((memory, index) => (
                <div key={index} className="bg-blue-50 p-3 rounded">
                  <div className="font-medium">{memory.title}</div>
                  <div className="text-sm text-gray-600">{memory.date}</div>
                  <div className="text-xs text-gray-500">
                    Faces: {memory.faces_detected}, Quality: {memory.quality_score}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Memory Suggestions Section */}
      <Card>
        <CardHeader>
          <CardTitle>AI Memory Suggestions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={getMemorySuggestions}
            disabled={loading === 'suggestions'}
          >
            {loading === 'suggestions' ? 'Loading...' : 'Get Memory Suggestions'}
          </Button>
          
          {suggestions && (
            <div className="space-y-2">
              <h4 className="font-semibold">Suggestions:</h4>
              <ul className="list-disc list-inside space-y-1">
                {suggestions.suggestions?.map((suggestion: string, index: number) => (
                  <li key={index} className="text-sm">{suggestion}</li>
                ))}
                {suggestions.contextualSuggestions?.map((suggestion: string, index: number) => (
                  <li key={`contextual-${index}`} className="text-sm text-blue-600">{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Travel Recommendations Section */}
      <Card>
        <CardHeader>
          <CardTitle>AI Travel Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={getTravelRecommendations}
            disabled={loading === 'travel'}
          >
            {loading === 'travel' ? 'Loading...' : 'Get Travel Recommendations'}
          </Button>
          
          {travelRecommendations && (
            <div className="space-y-2">
              <h4 className="font-semibold">Recommendations:</h4>
              {travelRecommendations.recommendations?.recommendations?.map((rec: any, index: number) => (
                <div key={index} className="bg-green-50 p-3 rounded">
                  <div className="font-medium">{rec.destination}</div>
                  <div className="text-sm text-gray-600">
                    Score: {(rec.score * 100).toFixed(0)}% | 
                    Strength: {rec.recommendation_strength}
                  </div>
                  <div className="text-xs text-gray-500">
                    Budget: ${rec.estimated_budget?.total_estimated || 'N/A'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chat with AI Section */}
      <Card>
        <CardHeader>
          <CardTitle>Chat with AI Assistant</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              placeholder="Ask me about travel, memories, or family..."
              onKeyPress={(e) => e.key === 'Enter' && chatWithAI()}
            />
            <Button
              onClick={chatWithAI}
              disabled={!chatMessage.trim() || loading === 'chat'}
            >
              {loading === 'chat' ? 'Sending...' : 'Send'}
            </Button>
          </div>
          
          {chatResponse && (
            <div className="bg-purple-50 p-4 rounded">
              <div className="font-medium mb-2">AI Response:</div>
              <div className="text-sm">{chatResponse.response?.message}</div>
              <div className="text-xs text-gray-500 mt-2">
                Context: {chatResponse.response?.context?.suggested_actions?.join(', ')}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MemoryProcessingDemo;