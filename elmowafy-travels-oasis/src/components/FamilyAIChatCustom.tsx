// Family AI Chat Custom Component - Advanced chat interface with context and learning
// Provides comprehensive chat functionality with family context integration

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { 
  Brain, Send, Mic, Image, Paperclip, MoreVertical,
  Heart, Sparkles, Users, Settings, RefreshCw
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { apiService } from '../lib/api';

interface FamilyAIChatCustomProps {
  familyId: string;
  memberId: string;
  showContext?: boolean;
  enableLearning?: boolean;
  variant?: 'default' | 'compact' | 'expanded';
  className?: string;
}

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type?: 'text' | 'suggestion' | 'memory' | 'context';
  metadata?: {
    confidence?: number;
    context_used?: string[];
    learned?: boolean;
  };
}

interface FamilyContext {
  current_mood: string;
  recent_activities: string[];
  shared_memories: Array<{
    id: string;
    title: string;
    relevance: number;
  }>;
  personality_insights: Array<{
    member: string;
    trait: string;
    confidence: number;
  }>;
}

const FamilyAIChatCustom: React.FC<FamilyAIChatCustomProps> = ({
  familyId,
  memberId,
  showContext = true,
  enableLearning = true,
  variant = 'default',
  className = ''
}) => {
  const { isRTL } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [familyContext, setFamilyContext] = useState<FamilyContext | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeChat();
    if (showContext) {
      loadFamilyContext();
    }
  }, [familyId, memberId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeChat = () => {
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      content: 'مرحباً! أنا مساعد العائلة الذكي. أنا هنا لمساعدتك في أي شيء تحتاجه، من الذكريات العائلية إلى التخطيط للأنشطة. كيف يمكنني مساعدتك اليوم؟',
      sender: 'ai',
      timestamp: new Date(),
      type: 'text'
    };
    setMessages([welcomeMessage]);
  };

  const loadFamilyContext = async () => {
    setIsLoading(true);
    
    try {
      // Use API class instead of direct fetch
    const data = await apiService.getFamilyContext(familyId);
      setFamilyContext(data);
    } catch (err) {
      console.error('Error loading family context:', err);
      // Fallback to empty context
      setFamilyContext(null);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!message.trim()) return;
    
    const userMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: message,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setIsTyping(true);
    
    try {
      // Use API class instead of direct fetch
    const data = await apiService.sendFamilyAIChat(familyId, message);
      
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: data.response,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      console.error('Error sending message:', err);
      
      // Fallback response
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: 'I apologize, but I am having trouble connecting to my knowledge base. Please try again later.',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ar-SA', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getMessageTypeIcon = (type?: string) => {
    switch (type) {
      case 'memory':
        return <Sparkles className="w-3 h-3 text-yellow-500" />;
      case 'context':
        return <Brain className="w-3 h-3 text-blue-500" />;
      case 'suggestion':
        return <Heart className="w-3 h-3 text-pink-500" />;
      default:
        return null;
    }
  };

  const renderContextPanel = () => {
    if (!showContext) return null;

    return (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-muted/50 to-muted/20">
        <CardHeader className="pb-3">
          <CardTitle className={`text-sm flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Users className="w-4 h-4" />
            سياق العائلة
            <Button
              onClick={loadFamilyContext}
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 ml-auto"
              disabled={contextLoading}
            >
              <RefreshCw className={`w-3 h-3 ${contextLoading ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {contextLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-3 bg-muted rounded"></div>
              <div className="h-3 bg-muted rounded w-3/4"></div>
            </div>
          ) : familyContext ? (
            <Tabs defaultValue="mood" className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-8">
                <TabsTrigger value="mood" className="text-xs">المزاج</TabsTrigger>
                <TabsTrigger value="memories" className="text-xs">الذكريات</TabsTrigger>
                <TabsTrigger value="insights" className="text-xs">الشخصيات</TabsTrigger>
              </TabsList>
              
              <TabsContent value="mood" className="mt-3 space-y-2">
                <div className="text-xs">
                  <Badge variant="secondary" className="text-xs">
                    {familyContext.current_mood.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  الأنشطة الأخيرة: {familyContext.recent_activities.slice(0, 2).join(', ')}
                </div>
              </TabsContent>
              
              <TabsContent value="memories" className="mt-3 space-y-2">
                {familyContext.shared_memories.slice(0, 2).map((memory) => (
                  <div key={memory.id} className="text-xs p-2 bg-muted/50 rounded-lg">
                    <div className="font-medium">{memory.title}</div>
                    <div className="text-muted-foreground">
                      صلة: {Math.round(memory.relevance * 100)}%
                    </div>
                  </div>
                ))}
              </TabsContent>
              
              <TabsContent value="insights" className="mt-3 space-y-2">
                {familyContext.personality_insights.slice(0, 2).map((insight, index) => (
                  <div key={index} className="text-xs p-2 bg-muted/50 rounded-lg">
                    <div className="font-medium">{insight.member}</div>
                    <div className="text-muted-foreground">
                      {insight.trait} ({Math.round(insight.confidence * 100)}%)
                    </div>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-xs text-muted-foreground">
              لا يوجد سياق متاح
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'compact':
        return 'h-80';
      case 'expanded':
        return 'h-[600px]';
      default:
        return 'h-96';
    }
  };

  return (
    <div className={`family-ai-chat-custom ${className}`} style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
      <div className={`flex gap-4 ${getVariantClasses()}`}>
        {/* Main Chat */}
        <Card className={`flex-1 border-0 shadow-xl bg-gradient-to-br from-card via-card to-muted/10 ${
          showContext ? 'w-2/3' : 'w-full'
        }`}>
          <CardHeader className="pb-3">
            <CardTitle className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 via-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg">محادثة العائلة الذكية</span>
              {enableLearning && (
                <Badge variant="secondary" className="text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  التعلم مفعل
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="flex flex-col h-full p-0">
            {/* Messages */}
            <ScrollArea className="flex-1 px-4">
              <div className="space-y-4 pb-4">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${
                      message.sender === 'user' 
                        ? isRTL ? 'justify-start' : 'justify-end'
                        : isRTL ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] p-3 rounded-2xl relative ${
                        message.sender === 'user'
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                          : message.type === 'memory'
                          ? 'bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-800 border border-yellow-200'
                          : 'bg-muted text-foreground'
                      } ${
                        message.sender === 'user'
                          ? isRTL ? 'rounded-br-md' : 'rounded-bl-md'
                          : isRTL ? 'rounded-bl-md' : 'rounded-br-md'
                      }`}
                    >
                      <div className={`flex items-start gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        {getMessageTypeIcon(message.type)}
                        <div className="flex-1">
                          <p className="text-sm leading-relaxed">{message.content}</p>
                          <div className={`flex items-center justify-between mt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <p className={`text-xs opacity-70 ${
                              message.sender === 'user' ? 'text-white/70' : 'text-muted-foreground'
                            }`}>
                              {formatTime(message.timestamp)}
                            </p>
                            {message.metadata?.confidence && (
                              <Badge variant="outline" className="text-xs">
                                {Math.round(message.metadata.confidence * 100)}%
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
                
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`flex ${isRTL ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="bg-muted p-3 rounded-2xl rounded-br-md">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t bg-muted/50">
              <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="flex-1 relative">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="اكتب رسالتك هنا..."
                    className="border-0 bg-background pr-12"
                    disabled={isLoading}
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />
                  <div className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'left-2' : 'right-2'} flex items-center gap-1`}>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                      <Paperclip className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                      <Image className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                      <Mic className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <Button
                  onClick={sendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  className="h-10 w-10 p-0 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Context Panel */}
        {showContext && (
          <div className="w-1/3">
            {renderContextPanel()}
          </div>
        )}
      </div>
    </div>
  );
};

export default FamilyAIChatCustom;

// Use apiService singleton
