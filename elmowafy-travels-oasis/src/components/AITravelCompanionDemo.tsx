import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AITravelCompanion } from '@/components/AITravelCompanion';
import { Badge } from '@/components/ui/badge';
import { 
  Compass, 
  Brain, 
  MapPin, 
  Users,
  Sparkles,
  CheckCircle
} from 'lucide-react';

/**
 * Demo component showcasing AI Travel Companion functionality
 * Shows how the component intelligently recommends destinations based on family history
 */
export const AITravelCompanionDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <Compass className="w-8 h-8 text-blue-600" />
              <span>AI Travel Companion - Intelligent Family Recommendations</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  AI-Powered Features
                </h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Analyzes family travel history from Al-Mowafi memories</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Personalizes recommendations based on budget & interests</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Considers family preferences from Dubai experiences</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Provides cultural context and family-friendly options</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-semibold text-purple-900 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Family Context Integration
                </h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-500" />
                    <span>Most visited: Dubai, UAE (family's home base)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    <span>Preferred activities: Family, Sightseeing, Cultural</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      Smart recommendations based on Burj Khalifa, JBR, Hatta visits
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* AI Travel Companion Demo */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <AITravelCompanion 
              onSelectDestination={(destination) => {
                alert(`Selected: ${destination}\n\nThis would normally navigate to travel planning with this destination pre-filled.`);
              }}
            />
          </div>
          
          {/* Expected Results Panel */}
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-800 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Expected Behavior
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-semibold text-green-700 mb-2">Smart Recommendations:</h4>
                  <ul className="space-y-1 text-green-600 text-xs">
                    <li>• Abu Dhabi (similar to Dubai experience)</li>
                    <li>• Sharjah (cultural heritage, nearby)</li>
                    <li>• Doha, Qatar (modern Middle Eastern city)</li>
                    <li>• Istanbul, Turkey (rich history)</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold text-green-700 mb-2">Family Context:</h4>
                  <ul className="space-y-1 text-green-600 text-xs">
                    <li>• Visited locations: 4+ (Dubai areas)</li>
                    <li>• Most visited: Dubai, UAE</li>
                    <li>• Budget preferences: Medium</li>
                    <li>• Duration: 3-5 days typical</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold text-green-700 mb-2">Interactive Features:</h4>
                  <ul className="space-y-1 text-green-600 text-xs">
                    <li>• Customizable preferences panel</li>
                    <li>• Budget/duration/interest filters</li>
                    <li>• Real-time AI confidence scoring</li>
                    <li>• Click destinations to plan trips</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
      </div>
    </div>
  );
};