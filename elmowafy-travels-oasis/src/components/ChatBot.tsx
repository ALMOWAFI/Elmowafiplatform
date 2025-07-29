
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/context/LanguageContext';
import { apiService, queryKeys } from '@/lib/api';
import { MessageCircle, Send, Brain, Sparkles, Loader2 } from 'lucide-react';

type Message = {
  content: string;
  isBot: boolean;
  isTyping?: boolean;
  hasContext?: boolean;
};

const ChatBot = () => {
  const { language } = useLanguage();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  // Fetch family context for AI
  const { data: familyMembers = [] } = useQuery({
    queryKey: queryKeys.familyMembers,
    queryFn: () => apiService.getFamilyMembers(),
  });

  const { data: memories = [] } = useQuery({
    queryKey: queryKeys.memories(),
    queryFn: () => apiService.getMemories(),
  });

  // Initialize chat with context-aware greeting
  useEffect(() => {
    if (familyMembers.length > 0) {
      const greeting = language === 'en' 
        ? `Hello! I'm your intelligent family travel assistant. I know about ${familyMembers.length} family members and ${memories.length} memories. I can help you plan trips, find similar past experiences, and suggest activities based on your family's travel history. How can I assist you today?` 
        : `مرحبًا! أنا مساعد السفر الذكي لعائلتك. أعرف معلومات عن ${familyMembers.length} من أفراد العائلة و ${memories.length} من الذكريات. يمكنني مساعدتك في التخطيط للرحلات، والعثور على تجارب مشابهة من الماضي، واقتراح الأنشطة بناءً على تاريخ سفر عائلتك. كيف يمكنني مساعدتك اليوم؟`;
      
      setMessages([{ 
        content: greeting, 
        isBot: true, 
        hasContext: true 
      }]);
    }
  }, [familyMembers, memories, language]);

  const generateIntelligentResponse = (userInput: string): string => {
    const lowerInput = userInput.toLowerCase();
    const isArabic = language === 'ar';
    
    // Travel destination queries
    if (lowerInput.includes('turkey') || lowerInput.includes('istanbul') || userInput.includes('تركيا') || userInput.includes('اسطنبول')) {
      const turkeyMemories = memories.filter(m => m.location?.toLowerCase().includes('istanbul') || m.location?.toLowerCase().includes('turkey'));
      return isArabic 
        ? `رائع! لديكم ${turkeyMemories.length} ذكريات من تركيا. زرتم اسطنبول في يناير 2024 - كانت رحلة ثقافية رائعة! أنصح بزيارة مواقع مشابهة مثل المغرب أو إسبانيا للحصول على تجربة ثقافية غنية مماثلة.`
        : `Great choice! You have ${turkeyMemories.length} memories from Turkey. Your Istanbul trip in January 2024 was amazing - such rich cultural experiences! I'd recommend similar cultural destinations like Morocco or Spain for your next adventure.`;
    }
    
    if (lowerInput.includes('dubai') || lowerInput.includes('uae') || userInput.includes('دبي') || userInput.includes('الإمارات')) {
      const dubaiMemories = memories.filter(m => m.location?.toLowerCase().includes('dubai'));
      return isArabic 
        ? `دبي وجهة رائعة! لديكم ${dubaiMemories.length} ذكريات من دبي، بما في ذلك يوم الشاطئ في فبراير 2024. أنصح بزيارة أبوظبي أو قطر للحصول على تجارب خليجية مماثلة.`
        : `Dubai is fantastic! You have ${dubaiMemories.length} memories from Dubai, including that wonderful beach day in February 2024. I'd suggest Abu Dhabi or Qatar for similar Gulf experiences.`;
    }
    
    // Family member queries
    if (lowerInput.includes('ahmed') || userInput.includes('أحمد')) {
      return isArabic 
        ? `أحمد المعوافي يحب السفر الثقافي! شارك في رحلة اسطنبول ويوم الشاطئ في دبي. يبدو أنه يفضل الوجهات التي تجمع بين التاريخ والاسترخاء.`
        : `Ahmed Al-Mowafi loves cultural travel! He was part of the Istanbul trip and the Dubai beach day. He seems to enjoy destinations that combine history with relaxation.`;
    }
    
    if (lowerInput.includes('fatima') || userInput.includes('فاطمة')) {
      return isArabic 
        ? `فاطمة المعوافي تشارك في جميع المغامرات العائلية! من اسطنبول إلى دبي، هي دائماً جاهزة لاستكشاف أماكن جديدة مع الأسرة.`
        : `Fatima Al-Mowafi joins all the family adventures! From Istanbul to Dubai, she's always ready to explore new places with the family.`;
    }
    
    // Travel planning queries
    if (lowerInput.includes('recommend') || lowerInput.includes('suggest') || userInput.includes('أنصح') || userInput.includes('اقترح')) {
      const totalMemories = memories.length;
      const locations = [...new Set(memories.map(m => m.location).filter(Boolean))];
      return isArabic 
        ? `بناءً على ${totalMemories} ذكرياتكم التي زرتم فيها ${locations.length} وجهات مختلفة، أنصح بزيارة وجهات تجمع بين الثقافة والطبيعة مثل اليونان أو البرتغال أو الأردن. هذه الوجهات تناسب اهتماماتكم بالأماكن التاريخية والأجواء الاستوائية.`
        : `Based on your ${totalMemories} memories visiting ${locations.length} different destinations, I recommend places that combine culture and nature like Greece, Portugal, or Jordan. These destinations match your interests in historical sites and tropical settings.`;
    }
    
    // Default intelligent response
    return isArabic 
      ? `فهمت! بناءً على تاريخ سفركم الذي يتضمن ${memories.length} ذكريات، أرى أنكم تحبون التجارب الثقافية والعائلية. دعني أساعدك في التخطيط لرحلة تناسب تفضيلاتكم. أي نوع من الأنشطة تفضلون أكثر؟`
      : `I understand! Based on your travel history of ${memories.length} memories, I see you enjoy cultural and family experiences. Let me help you plan a trip that matches your preferences. What type of activities do you enjoy most?`;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    // Add user message
    const userMessage = { content: input, isBot: false };
    setMessages(prev => [...prev, userMessage]);
    
    // Add typing indicator
    setIsLoading(true);
    setMessages(prev => [...prev, { content: '...', isBot: true, isTyping: true }]);
    
    // Generate intelligent response based on family context
    setTimeout(() => {
      const response = generateIntelligentResponse(input);
      
      setMessages(prev => {
        const withoutTyping = prev.filter(msg => !msg.isTyping);
        return [...withoutTyping, { content: response, isBot: true, hasContext: true }];
      });
      setIsLoading(false);
    }, 1500);
    
    setInput('');
  };

  return (
    <Card className={`w-full max-w-md mx-auto shadow-lg border-primary/50 ${language === 'ar' ? 'rtl-text' : 'ltr-text'}`}>
      <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <CardTitle className="flex items-center gap-2">
          {familyMembers.length > 0 ? <Brain size={20} /> : <MessageCircle size={20} />}
          {language === 'en' ? 'AI Family Assistant' : 'المساعد الذكي للعائلة'}
        </CardTitle>
        <CardDescription className="text-white/80 flex items-center gap-2">
          {familyMembers.length > 0 && <Sparkles size={14} />}
          {language === 'en' ? 'Powered by family context & AI' : 'مدعوم بالسياق العائلي والذكاء الاصطناعي'}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex flex-col h-80 overflow-y-auto p-4 space-y-3">
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}
            >
              <div className={`max-w-[80%] rounded-lg p-3 ${
                message.isBot 
                  ? message.hasContext 
                    ? 'bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200' 
                    : 'bg-muted'
                  : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
              } ${message.isTyping ? 'animate-pulse' : ''}`}>
                {message.hasContext && message.isBot && (
                  <div className="flex items-center gap-1 text-xs text-purple-600 mb-1">
                    <Brain size={12} />
                    {language === 'en' ? 'AI with family context' : 'ذكاء اصطناعي مع السياق العائلي'}
                  </div>
                )}
                <div className={message.isTyping ? 'text-muted-foreground italic' : ''}>
                  {message.isTyping ? (
                    <div className="flex items-center gap-1">
                      <Loader2 size={14} className="animate-spin" />
                      {language === 'en' ? 'AI is thinking...' : 'الذكاء الاصطناعي يفكر...'}
                    </div>
                  ) : (
                    message.content
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="p-3 border-t">
        <div className="flex w-full gap-2">
          <Input
            placeholder={language === 'en' ? 'Ask about travel plans, family memories...' : 'اسأل عن خطط السفر، ذكريات العائلة...'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            disabled={isLoading}
          />
          <Button onClick={handleSend} size="icon" disabled={isLoading || !input.trim()}>
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ChatBot;
