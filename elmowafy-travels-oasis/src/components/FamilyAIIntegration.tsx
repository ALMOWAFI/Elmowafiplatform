// Family AI Integration Component - Main integration component for Family AI features
// Provides full, widget, and embedded variants for flexible integration

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { 
  Brain, MessageCircle, Users, Heart, Sparkles, 
  Settings, Minimize2, Maximize2, X 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { apiService } from '../lib/api';

// Use apiService singleton

interface FamilyAIIntegrationProps {
  familyId: string;
  memberId: string;
  variant?: 'full' | 'widget' | 'embedded';
  onClose?: () => void;
  className?: string;
}

interface FamilyContext {
  personalities: Array<{
    memberId: string;
    name: string;
    traits: string[];
    preferences: string[];
  }>;
  runningJokes: Array<{
    id: string;
    content: string;
    frequency: number;
    lastUsed: string;
  }>;
  dynamics: {
    closeness: number;
    communication_style: string;
    shared_interests: string[];
  };
}

const FamilyAIIntegration: React.FC<FamilyAIIntegrationProps> = ({
  familyId,
  memberId,
  variant = 'full',
  onClose,
  className = ''
}) => {
  const { isRTL } = useLanguage();
  const [isMinimized, setIsMinimized] = useState(false);
  const [familyContext, setFamilyContext] = useState<FamilyContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFamilyContext();
  }, [familyId]);

  const loadFamilyContext = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Use API class instead of direct fetch
    const data = await apiService.getFamilyContext(familyId);
      setFamilyContext(data);
    } catch (err) {
      console.error('Error loading family context:', err);
      setError('Failed to load family context');
      
      // Fallback to mock data
      setFamilyContext({
        personalities: [],
        runningJokes: [],
        dynamics: {
          closeness: 0,
          communication_style: 'unknown',
          shared_interests: []
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderFullVariant = () => (
    <Card className={`family-ai-integration-full border-0 shadow-2xl bg-gradient-to-br from-card via-card to-muted/10 ${className}`}>
      <CardHeader className={`flex flex-row items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <CardTitle className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Family AI Assistant
          </span>
        </CardTitle>
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Button
            onClick={() => setIsMinimized(!isMinimized)}
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </Button>
          {onClose && (
            <Button
              onClick={onClose}
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <AnimatePresence>
        {!isMinimized && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <CardContent className="space-y-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-red-500 mb-4">{error}</p>
                  <Button onClick={loadFamilyContext} variant="outline">
                    Retry
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Family Dynamics */}
                  <div className="space-y-3">
                    <h3 className={`font-semibold flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Heart className="w-4 h-4 text-red-500" />
                      Family Dynamics
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-muted/50 rounded-xl p-4">
                        <div className="text-2xl font-bold text-blue-600">
                          {familyContext?.dynamics.closeness || 0}%
                        </div>
                        <div className="text-sm text-muted-foreground">Closeness</div>
                      </div>
                      <div className="bg-muted/50 rounded-xl p-4">
                        <div className="text-sm font-medium capitalize">
                          {familyContext?.dynamics.communication_style.replace('_', ' ') || 'Unknown'}
                        </div>
                        <div className="text-sm text-muted-foreground">Communication Style</div>
                      </div>
                      <div className="bg-muted/50 rounded-xl p-4">
                        <div className="text-sm font-medium">
                          {familyContext?.dynamics.shared_interests.length || 0} Interests
                        </div>
                        <div className="text-sm text-muted-foreground">Shared</div>
                      </div>
                    </div>
                  </div>

                  {/* Family Personalities */}
                  <div className="space-y-3">
                    <h3 className={`font-semibold flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Users className="w-4 h-4 text-blue-500" />
                      Family Personalities
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {familyContext?.personalities.map((personality, index) => (
                        <motion.div
                          key={personality.memberId}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="bg-muted/50 rounded-xl p-4 space-y-3"
                        >
                          <div className="font-medium">{personality.name}</div>
                          <div className="flex flex-wrap gap-1">
                            {personality.traits.map((trait) => (
                              <Badge key={trait} variant="secondary" className="text-xs">
                                {trait}
                              </Badge>
                            ))}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Running Jokes */}
                  <div className="space-y-3">
                    <h3 className={`font-semibold flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Sparkles className="w-4 h-4 text-yellow-500" />
                      Running Jokes
                    </h3>
                    <div className="space-y-2">
                      {familyContext?.runningJokes.map((joke) => (
                        <div key={joke.id} className="bg-muted/50 rounded-xl p-4">
                          <div className="text-sm">{joke.content}</div>
                          <div className="text-xs text-muted-foreground mt-2">
                            Used {joke.frequency} times • Last: {joke.lastUsed}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Button className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Start Chat
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );

  const renderWidgetVariant = () => (
    <div className={`family-ai-integration-widget ${className}`}>
      <Button
        className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 via-purple-600 to-pink-600 hover:from-blue-600 hover:via-purple-700 hover:to-pink-700 shadow-lg"
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <Brain className="w-5 h-5 text-white" />
      </Button>
      
      <AnimatePresence>
        {!isMinimized && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="absolute bottom-16 right-0 w-80 bg-card border shadow-2xl rounded-2xl overflow-hidden"
          >
            {renderFullVariant()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderEmbeddedVariant = () => (
    <div className={`family-ai-integration-embedded ${className}`}>
      <div className="bg-muted/50 rounded-xl p-4 space-y-4">
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 via-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold">Family AI</span>
        </div>
        
        {isLoading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-sm">
              Family closeness: <span className="font-medium">{familyContext?.dynamics.closeness || 0}%</span>
            </div>
            <div className="text-sm">
              Active members: <span className="font-medium">{familyContext?.personalities.length || 0}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  switch (variant) {
    case 'widget':
      return renderWidgetVariant();
    case 'embedded':
      return renderEmbeddedVariant();
    default:
      return renderFullVariant();
  }
};

export default FamilyAIIntegration;
