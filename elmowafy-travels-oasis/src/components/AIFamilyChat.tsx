import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageCircle, 
  Send, 
  Brain, 
  MapPin, 
  Plane, 
  Camera, 
  Heart, 
  Sparkles,
  Clock,
  Users,
  Globe,
  Mic,
  MicOff
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { apiService } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';

interface ContextData {
  memoryId?: string;
  location?: string;
  familyMembers?: string[];
  travelDates?: string[];
  activityType?: string;
  metadata?: Record<string, unknown>;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context?: {
    type: 'memory' | 'travel' | 'family' | 'general';
    data?: ContextData;
  };
  suggestions?: string[];
}

interface FamilyMember {
  id: string;
  name: string;
  nameArabic?: string;
}

interface Memory {
  id: string;
  title: string;
  date: string;
  location?: string;
  participants: string[];
}

interface TravelHistory {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  participants: string[];
}

interface TravelPreferences {
  budget?: number;
  duration?: number;
  activityTypes?: string[];
  participants?: string[];
}

interface AIFamilyChatProps {
  familyContext?: {
    members: FamilyMember[];
    recentMemories?: Memory[];
    travelHistory?: TravelHistory[];
  };
  onTravelPlanRequest?: (destination: string, preferences: TravelPreferences) => void;
  onMemorySearch?: (query: string) => void;
}

export const AIFamilyChat: React.FC<AIFamilyChatProps> = ({
  familyContext,
  onTravelPlanRequest,
  onMemorySearch
}) => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      type: 'assistant',
      content: isArabic 
        ? 'مرحباً! أنا مساعدك الذكي للذكريات العائلية والسفر. كيف يمكنني مساعدتك اليوم؟'
        : 'Hello! I\'m your AI family memory and travel assistant. How can I help you today?',
      timestamp: new Date(),
      context: { type: 'family' },
      suggestions: isArabic 
        ? ['أظهر لي ذكريات من هذا اليوم', 'خطط رحلة عائلية', 'ابحث في الصور', 'اقترح أنشطة']
        : ['Show me memories from today', 'Plan a family trip', 'Search photos', 'Suggest activities']
    }
  ]);
  
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [chatMode, setChatMode] = useState<'memory' | 'travel' | 'general'>('general');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = async (content: string, quickAction = false) => {
    if (!content.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: content.trim(),
      timestamp: new Date(),
      context: { type: chatMode }
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Send to AI service with family context
      const aiResponse = await fetch('/api/chat/family-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          chatMode,
          familyContext,
          conversationHistory: messages.slice(-5), // Last 5 messages for context
          language,
          quickAction
        })
      });

      if (!aiResponse.ok) {
        throw new Error('Failed to get AI response');
      }

      const aiData = await aiResponse.json();
      
      const assistantMessage: ChatMessage = {
        id: `assistant_${Date.now()}`,
        type: 'assistant',
        content: aiData.response,
        timestamp: new Date(),
        context: aiData.context,
        suggestions: aiData.suggestions
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Handle special actions based on AI response
      if (aiData.actionType === 'travel_plan' && onTravelPlanRequest) {
        onTravelPlanRequest(aiData.destination, aiData.preferences);
      } else if (aiData.actionType === 'memory_search' && onMemorySearch) {
        onMemorySearch(aiData.searchQuery);
      }

    } catch (error) {
      console.error('Chat error:', error);
      
      // Fallback response
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        type: 'assistant',
        content: isArabic 
          ? 'عذراً، واجهت مشكلة في الرد. يرجى المحاولة مرة أخرى.'
          : 'Sorry, I encountered an issue. Please try again.',
        timestamp: new Date(),
        context: { type: 'general' }
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion, true);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputMessage);
    }
  };

  const toggleVoiceInput = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setIsListening(!isListening);
      
      if (!isListening) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.lang = isArabic ? 'ar-SA' : 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;
        
        recognition.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = event.results[0][0].transcript;
          setInputMessage(transcript);
          setIsListening(false);
        };
        
        recognition.onerror = () => {
          setIsListening(false);
        };
        
        recognition.onend = () => {
          setIsListening(false);
        };
        
        recognition.start();
      }
    }
  };

  const getChatModeIcon = (mode: string) => {
    switch (mode) {
      case 'memory': return <Camera className="w-4 h-4" />;
      case 'travel': return <Plane className="w-4 h-4" />;
      default: return <MessageCircle className="w-4 h-4" />;
    }
  };

  const getChatModeColor = (mode: string) => {
    switch (mode) {
      case 'memory': return 'bg-purple-500';
      case 'travel': return 'bg-blue-500';
      default: return 'bg-green-500';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto h-[700px] flex flex-col">
      <CardHeader className="flex-shrink-0 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className={`flex items-center gap-3 ${isArabic ? 'font-noto' : ''}`}>
            <div className="relative">
              <Brain className="w-6 h-6 text-purple-600" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            </div>
            {isArabic ? 'المساعد الذكي للعائلة' : 'AI Family Assistant'}
            <Badge variant="secondary" className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {isArabic ? 'مدعوم بالذكاء الاصطناعي' : 'AI-Powered'}
            </Badge>
          </CardTitle>
          
          {/* Chat Mode Selector */}
          <div className="flex gap-2">
            {(['general', 'memory', 'travel'] as const).map((mode) => (
              <Button
                key={mode}
                variant={chatMode === mode ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChatMode(mode)}
                className="flex items-center gap-1"
              >
                {getChatModeIcon(mode)}
                <span className="text-xs">
                  {mode === 'general' && (isArabic ? 'عام' : 'General')}
                  {mode === 'memory' && (isArabic ? 'الذكريات' : 'Memories')}
                  {mode === 'travel' && (isArabic ? 'السفر' : 'Travel')}
                </span>
              </Button>
            ))}
          </div>
        </div>
        
        {/* Family Context Display */}
        {familyContext && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{familyContext.members?.length || 0} {isArabic ? 'أفراد العائلة' : 'family members'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Camera className="w-4 h-4" />
              <span>{familyContext.recentMemories?.length || 0} {isArabic ? 'ذكريات حديثة' : 'recent memories'}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>{familyContext.travelHistory?.length || 0} {isArabic ? 'رحلات' : 'trips'}</span>
            </div>
          </div>
        )}
      </CardHeader>

      {/* Messages Area */}
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.type === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <div className={`text-sm ${isArabic ? 'font-noto text-right' : 'text-left'}`}>
                      {message.content}
                    </div>
                    
                    {/* Message Context Badge */}
                    {message.context && (
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {message.context.type === 'memory' && <Camera className="w-3 h-3 mr-1" />}
                          {message.context.type === 'travel' && <Plane className="w-3 h-3 mr-1" />}
                          {message.context.type === 'family' && <Users className="w-3 h-3 mr-1" />}
                          {message.context.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {message.timestamp.toLocaleTimeString(isArabic ? 'ar-SA' : 'en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                    )}
                    
                    {/* Quick Action Suggestions */}
                    {message.suggestions && message.suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {message.suggestions.map((suggestion, index) => (
                          <Button
                            key={index}
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="text-xs h-7 px-2 bg-white/10 hover:bg-white/20"
                          >
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {/* Loading Indicator */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {isArabic ? 'جاري التفكير...' : 'Thinking...'}
                  </span>
                </div>
              </motion.div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t p-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  isArabic 
                    ? 'اكتب رسالتك هنا...'
                    : 'Type your message here...'
                }
                disabled={isLoading}
                className={`pr-12 ${isArabic ? 'text-right font-noto' : 'text-left'}`}
              />
              
              {/* Voice Input Button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleVoiceInput}
                disabled={isLoading}
                className={`absolute ${isArabic ? 'left-2' : 'right-2'} top-1/2 transform -translate-y-1/2 h-7 w-7 p-0`}
              >
                {isListening ? (
                  <MicOff className="w-4 h-4 text-red-500" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </Button>
            </div>
            
            <Button
              onClick={() => sendMessage(inputMessage)}
              disabled={!inputMessage.trim() || isLoading}
              size="sm"
              className="px-3"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 mt-3 text-xs">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSuggestionClick(isArabic ? 'أظهر لي ذكريات اليوم' : 'Show me today\'s memories')}
              className="h-7 px-2"
            >
              <Clock className="w-3 h-3 mr-1" />
              {isArabic ? 'ذكريات اليوم' : 'Today\'s Memories'}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSuggestionClick(isArabic ? 'اقترح رحلة عائلية' : 'Suggest a family trip')}
              className="h-7 px-2"
            >
              <Plane className="w-3 h-3 mr-1" />
              {isArabic ? 'رحلة عائلية' : 'Family Trip'}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSuggestionClick(isArabic ? 'أين يمكننا الذهاب اليوم؟' : 'Where can we go today?')}
              className="h-7 px-2"
            >
              <MapPin className="w-3 h-3 mr-1" />
              {isArabic ? 'أماكن قريبة' : 'Nearby Places'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};