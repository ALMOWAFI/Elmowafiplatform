import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiService, queryKeys } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Send, 
  Bot, 
  User, 
  MapPin, 
  Plane, 
  DollarSign,
  Users,
  Sparkles,
  Clock,
  Globe
} from 'lucide-react';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  travelSuggestions?: TravelSuggestion[];
  budgetEstimate?: number;
}

interface TravelSuggestion {
  destination: string;
  description: string;
  estimatedCost: number;
  familyFriendly: boolean;
  activities: string[];
}

export const AITravelAssistant: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'assistant',
      content: `🌍 Hello! I'm your AI Travel Assistant. I know your family's travel history, preferences, and budget. 

I can help you with:
• 🗺️ Personalized destination recommendations
• 💰 Budget-friendly travel planning  
• 👨‍👩‍👧‍👦 Family-friendly activity suggestions
• 🏨 Accommodation and itinerary planning
• 📸 Connecting new trips with your family memories

What travel adventure can I help you plan today?`,
      timestamp: new Date(),
    }
  ]);
  
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch family context for better recommendations
  const { data: familyMembers = [] } = useQuery({
    queryKey: queryKeys.familyMembers,
    queryFn: () => apiService.getFamilyMembers(),
  });

  const { data: pastTravels = [] } = useQuery({
    queryKey: queryKeys.memories(),
    queryFn: () => apiService.getMemories({ tags: ['travel'] }),
  });

  const travelRecommendationMutation = useMutation({
    mutationFn: async (query: string) => {
      // Extract destination from query if possible
      const destinationMatch = query.match(/(?:to|visit|go to|travel to)\s+([A-Za-z\s,]+)/i);
      const destination = destinationMatch ? destinationMatch[1].trim() : '';

      if (destination) {
        return await apiService.getAITravelRecommendations(destination, {
          members: familyMembers,
          interests: extractInterests(query),
        });
      }

      // For general queries, provide contextual advice
      return {
        recommendations: generateContextualRecommendations(query, familyMembers, pastTravels),
        estimatedBudget: estimateBudget(familyMembers.length),
        suggestedActivities: []
      };
    },
    onSuccess: (data, query) => {
      const response = generateTravelResponse(query, data);
      addMessage('assistant', response, data.suggestedActivities.length > 0 ? 
        data.suggestedActivities.map(activity => ({
          destination: activity.location || 'Various',
          description: activity.description || activity.name,
          estimatedCost: activity.cost || 0,
          familyFriendly: true,
          activities: [activity.name]
        })) : undefined,
        data.estimatedBudget
      );
      setIsTyping(false);
    },
    onError: (error) => {
      addMessage('assistant', "I'm sorry, I'm having trouble connecting to my travel knowledge base right now. Please try again in a moment!");
      setIsTyping(false);
      toast.error('Travel assistant temporarily unavailable');
    }
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (type: 'user' | 'assistant', content: string, suggestions?: TravelSuggestion[], budget?: number) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
      travelSuggestions: suggestions,
      budgetEstimate: budget
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSend = () => {
    if (!input.trim()) return;

    addMessage('user', input);
    setIsTyping(true);
    
    // Simulate typing delay
    setTimeout(() => {
      travelRecommendationMutation.mutate(input);
    }, 1000);

    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[600px] max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-full">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold">AI Travel Assistant</h3>
            <p className="text-sm text-blue-100">
              Powered by your family's travel history • {familyMembers.length} family members • {pastTravels.length} past trips
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.type === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <Avatar className="w-8 h-8">
                <AvatarFallback className={message.type === 'user' ? 'bg-blue-500' : 'bg-purple-500'}>
                  {message.type === 'user' ? <User className="h-4 w-4 text-white" /> : <Bot className="h-4 w-4 text-white" />}
                </AvatarFallback>
              </Avatar>
              
              <div className={`flex-1 ${message.type === 'user' ? 'text-right' : ''}`}>
                <div
                  className={`p-3 rounded-lg max-w-[80%] ${
                    message.type === 'user'
                      ? 'bg-blue-500 text-white ml-auto'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
                
                {/* Travel Suggestions */}
                {message.travelSuggestions && message.travelSuggestions.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.travelSuggestions.map((suggestion, index) => (
                      <Card key={index} className="p-3 bg-gradient-to-r from-blue-50 to-purple-50">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              {suggestion.destination}
                            </h4>
                            <p className="text-sm text-muted-foreground mt-1">{suggestion.description}</p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {suggestion.activities.map((activity, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {activity}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-sm font-medium">
                              <DollarSign className="h-3 w-3" />
                              ${suggestion.estimatedCost}
                            </div>
                            {suggestion.familyFriendly && (
                              <Badge variant="outline" className="text-xs mt-1">
                                <Users className="h-3 w-3 mr-1" />
                                Family-friendly
                              </Badge>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Budget Estimate */}
                {message.budgetEstimate && (
                  <div className="mt-2 p-2 bg-green-50 rounded border-l-4 border-green-400">
                    <p className="text-sm flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="font-medium">Estimated Budget: ${message.budgetEstimate}</span>
                    </p>
                  </div>
                )}

                <p className="text-xs text-muted-foreground mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          
          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex gap-3">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-purple-500">
                  <Bot className="h-4 w-4 text-white" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-gray-100 p-3 rounded-lg">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            placeholder="Ask me about travel destinations, budgets, or family-friendly activities..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button 
            onClick={handleSend} 
            disabled={!input.trim() || isTyping}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Quick suggestions */}
        <div className="flex flex-wrap gap-2 mt-2">
          {quickSuggestions.map((suggestion, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => setInput(suggestion)}
              className="text-xs"
            >
              {suggestion}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

// Helper functions
const quickSuggestions = [
  "Plan a family trip to Europe",
  "Find budget-friendly destinations",
  "Activities for kids in Tokyo",
  "Best time to visit Morocco",
  "Family resorts in the Caribbean"
];

const extractInterests = (query: string): string[] => {
  const interests = [];
  if (query.toLowerCase().includes('beach')) interests.push('beach');
  if (query.toLowerCase().includes('mountain')) interests.push('mountains');
  if (query.toLowerCase().includes('culture')) interests.push('culture');
  if (query.toLowerCase().includes('food')) interests.push('food');
  if (query.toLowerCase().includes('adventure')) interests.push('adventure');
  if (query.toLowerCase().includes('history')) interests.push('history');
  return interests;
};

const estimateBudget = (familySize: number): number => {
  const basePerPerson = 1500; // Base cost per person for a week-long trip
  return basePerPerson * familySize;
};

const generateContextualRecommendations = (query: string, familyMembers: any[], pastTravels: any[]): string[] => {
  const recommendations = [];
  
  if (query.toLowerCase().includes('budget')) {
    recommendations.push('Consider visiting Eastern Europe for affordable family destinations');
    recommendations.push('Look into local domestic destinations to save on flights');
  }
  
  if (query.toLowerCase().includes('family')) {
    recommendations.push('Theme parks and beach resorts are great for families');
    recommendations.push('Consider all-inclusive resorts for easier planning');
  }
  
  if (pastTravels.length > 0) {
    recommendations.push(`Based on your past ${pastTravels.length} trips, you seem to enjoy diverse destinations`);
  }
  
  return recommendations.length > 0 ? recommendations : [
    'Tell me more about your preferences and I can give personalized recommendations!',
    'What type of experience are you looking for? Adventure, relaxation, or cultural exploration?'
  ];
};

const generateTravelResponse = (query: string, data: any): string => {
  let response = "Based on your family's travel history and preferences, here are my recommendations:\n\n";
  
  if (data.recommendations && data.recommendations.length > 0) {
    response += data.recommendations.join('\n\n');
  }
  
  if (data.estimatedBudget) {
    response += `\n\n💰 For your family of ${data.estimatedBudget / 1500} people, I estimate a budget of $${data.estimatedBudget} for a week-long trip.`;
  }
  
  response += "\n\nWould you like me to help you create a detailed itinerary or find specific accommodations?";
  
  return response;
}; 