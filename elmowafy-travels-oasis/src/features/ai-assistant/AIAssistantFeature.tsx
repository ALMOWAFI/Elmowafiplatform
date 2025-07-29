import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { v4 as uuidv4 } from 'uuid';
import { 
  Bot, 
  Map, 
  Calendar, 
  BarChart3, 
  Sparkles, 
  Lightbulb, 
  Globe, 
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  PanelLeftClose,
  PanelRightClose,
  ImagePlus
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

import { ChatInterface } from './ChatInterface';
import { TravelSuggestionCard } from './TravelSuggestionCard';
import { Conversation, AIAssistantOptions, TravelSuggestion } from './types';
import { sampleConversations, sampleTravelSuggestions, assistantPersonas } from './data';
import { cn } from '@/lib/utils';

interface AIAssistantFeatureProps {
  initialTab?: string;
}

/**
 * The main AI Assistant feature component with immersive UX and 3D effects
 */
export const AIAssistantFeature: React.FC<AIAssistantFeatureProps> = ({
  initialTab = 'chat'
}) => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  const supabase = useSupabaseClient();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  // Parallax values for background elements
  const bgX = useTransform(mouseX, [-500, 500], [30, -30]);
  const bgY = useTransform(mouseY, [-500, 500], [30, -30]);
  
  // States
  const [activeTab, setActiveTab] = useState(initialTab);
  const [conversations, setConversations] = useState<Conversation[]>(sampleConversations);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [suggestions, setSuggestions] = useState<TravelSuggestion[]>(sampleTravelSuggestions);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  // Handle mouse move for parallax effect
  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    mouseX.set(clientX - centerX);
    mouseY.set(clientY - centerY);
  };
  
  // Load conversations from Supabase
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setIsLoading(true);
        
        // In a real implementation, this would fetch from Supabase
        // const { data, error } = await supabase
        //   .from('conversations')
        //   .select('*')
        //   .order('updatedAt', { ascending: false });
        
        // if (error) throw error;
        
        // Display sample conversations after a delay to simulate loading
        setTimeout(() => {
          setConversations(sampleConversations);
          setIsLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error fetching conversations:', error);
        setIsLoading(false);
      }
    };
    
    fetchConversations();
  }, []);
  
  // Save a conversation
  const handleSaveConversation = (conversation: Conversation) => {
    setConversations(prev => {
      const index = prev.findIndex(c => c.id === conversation.id);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = conversation;
        return updated;
      } else {
        return [conversation, ...prev];
      }
    });
  };
  
  // Start a new conversation
  const handleNewConversation = () => {
    setCurrentConversation(null);
    setActiveTab('chat');
  };
  
  // Select an existing conversation
  const handleSelectConversation = (conversation: Conversation) => {
    setCurrentConversation(conversation);
    setActiveTab('chat');
  };
  
  // Animation variants
  const containerVariants = {
    expanded: {
      width: '100%',
      height: 'calc(100vh - 180px)',
      transition: { duration: 0.5, ease: [0.19, 1.0, 0.22, 1.0] }
    },
    collapsed: {
      width: '100%',
      height: '500px',
      transition: { duration: 0.5, ease: [0.19, 1.0, 0.22, 1.0] }
    }
  };
  
  return (
    <motion.div 
      ref={containerRef}
      className="relative overflow-hidden w-full rounded-xl shadow-2xl"
      initial="expanded"
      animate={isExpanded ? "expanded" : "collapsed"}
      variants={containerVariants}
      onMouseMove={handleMouseMove}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div 
          className="absolute w-full h-full opacity-10"
          style={{ 
            backgroundImage: 'url(/patterns/neural-network.svg)',
            backgroundSize: '120% 120%',
            x: bgX,
            y: bgY
          }}
        />
        
        {/* Floating orbs */}
        <div className="absolute inset-0">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-gradient-to-r from-primary/20 to-secondary/20 backdrop-blur-md"
              style={{
                width: 100 + Math.random() * 200,
                height: 100 + Math.random() * 200,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                x: useTransform(mouseX, [-500, 500], [(i % 2 === 0 ? -20 : 20), (i % 2 === 0 ? 20 : -20)]),
                y: useTransform(mouseY, [-500, 500], [(i % 2 === 0 ? -20 : 20), (i % 2 === 0 ? 20 : -20)]),
              }}
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.2, 0.3, 0.2],
                transition: {
                  duration: 5 + Math.random() * 5,
                  repeat: Infinity,
                  repeatType: 'reverse'
                }
              }}
            />
          ))}
        </div>
      </div>
      
      {/* Main content */}
      <div className="relative z-10 flex h-full backdrop-blur-sm">
        {/* Sidebar */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="h-full bg-card/95 backdrop-blur-md border-r flex flex-col"
            >
              <div className="p-4 border-b flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Bot size={20} className="text-primary" />
                  </div>
                  <div className="ml-2">
                    <h3 className="font-semibold text-base">
                      {isArabic ? 'مساعد السفر الذكي' : 'Smart Travel Assistant'}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {isArabic ? 'مدعوم بالذكاء الاصطناعي' : 'Powered by AI'}
                    </p>
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsExpanded(false)}
                >
                  <PanelLeftClose size={16} />
                </Button>
              </div>
              
              <div className="p-4">
                <Button 
                  className="w-full justify-start" 
                  onClick={handleNewConversation}
                >
                  <MessageCircle size={16} className="mr-2" />
                  {isArabic ? 'محادثة جديدة' : 'New Conversation'}
                </Button>
              </div>
              
              <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-3">
                    <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                      {isArabic ? 'المحادثات السابقة' : 'Recent Conversations'}
                    </h4>
                    
                    {isLoading ? (
                      [...Array(3)].map((_, i) => (
                        <Card key={i} className="cursor-pointer hover:bg-accent/50 transition-colors">
                          <CardHeader className="p-3">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                          </CardHeader>
                        </Card>
                      ))
                    ) : (
                      conversations.map((conversation) => (
                        <Card 
                          key={conversation.id}
                          className="cursor-pointer hover:bg-accent/50 transition-colors"
                          onClick={() => handleSelectConversation(conversation)}
                        >
                          <CardHeader className="p-3">
                            <CardTitle className="text-sm">
                              {isArabic ? conversation.arabicTitle : conversation.title}
                            </CardTitle>
                            <CardDescription className="text-xs truncate">
                              {isArabic ? conversation.arabicSummary : conversation.summary}
                            </CardDescription>
                          </CardHeader>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
              
              <div className="p-4 border-t">
                <div className="text-xs text-muted-foreground">
                  {isArabic 
                    ? 'استخدم المساعد لتخطيط رحلاتك العائلية واستكشاف أماكن جديدة'
                    : 'Use the assistant to plan your family trips and explore new places'
                  }
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Main panel */}
        <div className="flex-1 flex flex-col h-full bg-background/95 backdrop-blur-lg">
          <div className="p-4 border-b flex justify-between items-center">
            <Tabs 
              value={activeTab} 
              onValueChange={setActiveTab}
              className="w-full"
            >
              <div className="flex justify-between items-center">
                <TabsList>
                  <TabsTrigger value="chat" className={isArabic ? 'font-noto' : ''}>
                    <MessageCircle size={16} className="mr-2" />
                    {isArabic ? 'الدردشة' : 'Chat'}
                  </TabsTrigger>
                  <TabsTrigger value="explore" className={isArabic ? 'font-noto' : ''}>
                    <Globe size={16} className="mr-2" />
                    {isArabic ? 'استكشاف' : 'Explore'}
                  </TabsTrigger>
                  <TabsTrigger value="plan" className={isArabic ? 'font-noto' : ''}>
                    <Calendar size={16} className="mr-2" />
                    {isArabic ? 'التخطيط' : 'Plan'}
                  </TabsTrigger>
                </TabsList>
                
                {!isExpanded && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsExpanded(true)}
                  >
                    <PanelRightClose size={16} />
                  </Button>
                )}
              </div>
            </Tabs>
          </div>
          
          <div className="flex-1 overflow-auto">
            <TabsContent value="chat" className="h-full p-4 m-0">
              <ChatInterface 
                initialConversation={currentConversation || undefined} 
                onSave={handleSaveConversation}
              />
            </TabsContent>
            
            <TabsContent value="explore" className="h-full p-4 m-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-1 md:col-span-2">
                  <h2 className={`text-2xl font-bold mb-1 ${isArabic ? 'font-noto text-right' : ''}`}>
                    {isArabic ? 'استكشف وجهات مذهلة' : 'Explore Amazing Destinations'}
                  </h2>
                  <p className={`text-muted-foreground mb-6 ${isArabic ? 'font-noto text-right' : ''}`}>
                    {isArabic 
                      ? 'اكتشف وجهات سفر فريدة مخصصة لتفضيلات عائلتك'
                      : 'Discover unique travel destinations tailored to your family preferences'
                    }
                  </p>
                </div>
                
                {suggestions.map((suggestion) => (
                  <TravelSuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    featured={suggestion.id === 'suggestion-1'}
                  />
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="plan" className="h-full m-0">
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                    <Calendar size={24} className="text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">
                    {isArabic ? 'قريباً: تخطيط الرحلات التعاوني' : 'Coming Soon: Collaborative Trip Planning'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {isArabic 
                      ? 'خطط لرحلاتك العائلية بشكل تعاوني، وصوّت على الوجهات، وشارك المسؤوليات'
                      : 'Plan your family trips collaboratively, vote on destinations, and share responsibilities'
                    }
                  </p>
                  <Button disabled>
                    {isArabic ? 'إعلامي عند الإطلاق' : 'Notify Me When Available'}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </div>
          
          <div className="p-3 border-t bg-muted/50">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-yellow-500" />
                <span className="text-xs">
                  {isArabic 
                    ? 'تم إنشائه باستخدام Azure OpenAI ومشغل بواسطة Supabase'
                    : 'Created with Azure OpenAI and powered by Supabase'
                  }
                </span>
              </div>
              
              <div className="flex gap-2">
                <Button size="icon" variant="ghost">
                  <ThumbsUp size={14} />
                </Button>
                <Button size="icon" variant="ghost">
                  <ThumbsDown size={14} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
