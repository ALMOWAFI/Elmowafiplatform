import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { v4 as uuidv4 } from 'uuid';
import { 
  Send, 
  Loader2, 
  Settings, 
  Bot, 
  User,
  Sparkles, 
  Save,
  Share,
  X,
  Microphone,
  ImagePlus,
  MapPin,
  Star
} from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Card, 
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import { ChatMessage, Conversation, AIAssistantOptions } from './types';
import { sampleConversations, assistantPersonas, defaultAssistantOptions, supabaseHelpers } from './data';
import { TravelSuggestionCard } from './TravelSuggestionCard';
import { cn } from '@/lib/utils';

interface ChatInterfaceProps {
  initialConversation?: Conversation;
  onSave?: (conversation: Conversation) => void;
}

const formSchema = z.object({
  message: z.string().min(1, {
    message: "Please enter a message",
  }),
});

/**
 * Main chat interface component for the AI Assistant feature
 */
export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  initialConversation,
  onSave
}) => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  const supabase = useSupabaseClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Form for message input
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: "",
    },
  });
  
  // States
  const [conversation, setConversation] = useState<Conversation>(
    initialConversation || {
      id: uuidv4(),
      title: isArabic ? 'محادثة جديدة' : 'New Conversation',
      arabicTitle: 'محادثة جديدة',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      category: 'general'
    }
  );
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [assistantOptions, setAssistantOptions] = useState<AIAssistantOptions>(defaultAssistantOptions);
  const [selectedPersona, setSelectedPersona] = useState('historian');
  
  // Scroll to bottom of messages
  useEffect(() => {
    scrollToBottom();
  }, [conversation.messages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (isLoading) return;
    
    // Add user message
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: values.message,
      timestamp: new Date()
    };
    
    // Create a loading message from the assistant
    const loadingMessage: ChatMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true
    };
    
    // Update conversation with user message and loading message
    setConversation(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage, loadingMessage],
      updatedAt: new Date()
    }));
    
    // Reset form
    form.reset();
    
    // Process the message and get a response
    try {
      setIsLoading(true);
      
      // In a real implementation, this would be an API call to your backend
      // For now, we'll simulate a delayed response
      setTimeout(() => {
        const assistantResponse = generateMockResponse(values.message, assistantOptions);
        
        // Update conversation with real response (replacing loading message)
        setConversation(prev => {
          const updatedMessages = [...prev.messages];
          // Remove the loading message
          updatedMessages.pop();
          
          // Add the real response
          updatedMessages.push({
            id: uuidv4(),
            role: 'assistant',
            content: assistantResponse,
            timestamp: new Date()
          });
          
          return {
            ...prev,
            messages: updatedMessages,
            updatedAt: new Date()
          };
        });
        
        setIsLoading(false);
        
        // Generate some suggested follow-up questions
        setSuggestions(generateMockSuggestions(values.message));
        
      }, 2000);
    } catch (error) {
      console.error('Error generating AI response:', error);
      
      // Update conversation with error message (replacing loading message)
      setConversation(prev => {
        const updatedMessages = [...prev.messages];
        // Remove the loading message
        updatedMessages.pop();
        
        // Add the error message
        updatedMessages.push({
          id: uuidv4(),
          role: 'assistant',
          content: isArabic 
            ? 'عذراً، حدث خطأ أثناء معالجة رسالتك. يرجى المحاولة مرة أخرى.' 
            : 'Sorry, an error occurred while processing your message. Please try again.',
          timestamp: new Date(),
          isError: true
        });
        
        return {
          ...prev,
          messages: updatedMessages,
          updatedAt: new Date()
        };
      });
      
      setIsLoading(false);
    }
  };
  
  // Handle saving conversation to Supabase
  const handleSaveConversation = async () => {
    try {
      // Skip if there are no messages
      if (conversation.messages.length === 0) return;
      
      // Format conversation for Supabase
      const formattedConversation = supabaseHelpers.formatConversationForStorage(conversation);
      
      // Save to Supabase
      const { error } = await supabase
        .from('conversations')
        .upsert(formattedConversation);
      
      if (error) throw error;
      
      // Callback if provided
      if (onSave) onSave(conversation);
      
      // Show success notification (would use a toast in real implementation)
      console.log('Conversation saved successfully');
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  };
  
  // Handle clicking on a suggestion
  const handleSuggestionClick = (suggestion: string) => {
    form.setValue("message", suggestion);
    setSuggestions([]);
  };
  
  // Mock response generator for demonstration
  const generateMockResponse = (message: string, options: AIAssistantOptions): string => {
    // In a real implementation, this would call your backend API
    // which would then use the Supabase JWT token to authenticate
    // and call an LLM API like OpenAI, Azure OpenAI, or Anthropic
    
    const persona = assistantPersonas[selectedPersona as keyof typeof assistantPersonas];
    const lowercaseMessage = message.toLowerCase();
    
    // Simple keyword matching for demo purposes
    if (lowercaseMessage.includes('egypt') || lowercaseMessage.includes('مصر')) {
      return isArabic 
        ? `كمرشد سياحي ${persona.arabicName}، أنصح بزيارة مصر في فصل الخريف أو الربيع لتجنب الحرارة الشديدة. الأهرامات والمتحف المصري ووادي الملوك هي مواقع لا يمكن تفويتها. للعائلات، أوصي بقضاء 3-4 أيام في القاهرة، ويومين في الأقصر، و2-3 أيام في الغردقة للاستمتاع بالبحر الأحمر. هل تريد توصيات محددة للفنادق الملائمة للعائلات؟`
        : `As travel guide ${persona.name}, I recommend visiting Egypt in fall or spring to avoid extreme heat. The Pyramids, Egyptian Museum, and Valley of the Kings are must-see sites. For families, I suggest spending 3-4 days in Cairo, 2 days in Luxor, and 2-3 days in Hurghada to enjoy the Red Sea. Would you like specific recommendations for family-friendly hotels?`;
    }
    
    if (lowercaseMessage.includes('istanbul') || lowercaseMessage.includes('turkey') || lowercaseMessage.includes('اسطنبول') || lowercaseMessage.includes('تركيا')) {
      return isArabic
        ? `بصفتي ${persona.arabicName}، أقترح استكشاف اسطنبول عن طريق تقسيمها إلى مناطق. ابدأ بالمدينة القديمة (السلطان أحمد) لرؤية آيا صوفيا والمسجد الأزرق وقصر توبكابي. ثم استكشف منطقة بيرا/بيوغلو لجو أكثر عصرية. لا تفوت رحلة بحرية على مضيق البوسفور - إنها طريقة رائعة لرؤية المدينة من منظور مختلف. الطعام التركي لذيذ، جرّب الكباب والبقلاوة والقهوة التركية.`
        : `As ${persona.name}, I suggest exploring Istanbul by dividing it into areas. Start with the Old City (Sultanahmet) to see Hagia Sophia, Blue Mosque, and Topkapi Palace. Then explore the Pera/Beyoglu area for a more modern vibe. Don't miss a Bosphorus cruise - it's a fantastic way to see the city from a different perspective. Turkish food is delicious, try kebabs, baklava, and Turkish coffee.`;
    }
    
    // Generic response
    return isArabic
      ? `مرحباً! أنا ${persona.arabicName}، ${persona.arabicDescription} كيف يمكنني مساعدتك في التخطيط لمغامرتك التالية؟`
      : `Hello! I'm ${persona.name}, ${persona.description} How can I help you plan your next adventure?`;
  };
  
  // Generate mock suggestions
  const generateMockSuggestions = (message: string): string[] => {
    const lowercaseMessage = message.toLowerCase();
    
    if (lowercaseMessage.includes('egypt') || lowercaseMessage.includes('مصر')) {
      return isArabic
        ? ['ما هي أفضل الأوقات لزيارة مصر؟', 'أين يمكنني رؤية أفضل المعالم الأثرية؟', 'هل مصر آمنة للعائلات؟']
        : ['What are the best times to visit Egypt?', 'Where can I see the best archaeological sites?', 'Is Egypt safe for families?'];
    }
    
    if (lowercaseMessage.includes('istanbul') || lowercaseMessage.includes('turkey') || lowercaseMessage.includes('اسطنبول') || lowercaseMessage.includes('تركيا')) {
      return isArabic
        ? ['ما هي أفضل المطاعم في اسطنبول؟', 'كيف يمكنني التنقل في اسطنبول؟', 'هل أحتاج تأشيرة لزيارة تركيا؟']
        : ['What are the best restaurants in Istanbul?', 'How do I get around Istanbul?', 'Do I need a visa to visit Turkey?'];
    }
    
    // Generic suggestions
    return isArabic
      ? ['ما هي أفضل الوجهات للعائلات؟', 'أين تنصح بالسفر في فصل الصيف؟', 'ما هي أفضل الوجهات ذات القيمة المقابلة للمال؟']
      : ['What are the best destinations for families?', 'Where do you recommend traveling in summer?', 'What are the best value-for-money destinations?'];
  };
  
  // Format time for chat bubbles
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <div className={`flex flex-col h-[600px] ${isArabic ? 'font-noto text-right' : ''}`}>
      <Card className="flex flex-col h-full border shadow-sm">
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0 border-b">
          <div className="flex items-center space-x-2">
            <Avatar className="h-10 w-10 border">
              <AvatarImage src={`/ai-personas/${selectedPersona}.jpg`} alt="AI Assistant" />
              <AvatarFallback>
                <Bot size={20} />
              </AvatarFallback>
            </Avatar>
            <div className={isArabic ? 'mr-2' : 'ml-2'}>
              <CardTitle className="text-base">
                {isArabic 
                  ? assistantPersonas[selectedPersona as keyof typeof assistantPersonas].arabicName
                  : assistantPersonas[selectedPersona as keyof typeof assistantPersonas].name
                }
              </CardTitle>
              <CardDescription className="text-xs">
                {isArabic ? 'مساعد سفر ذكي' : 'Smart Travel Assistant'}
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={handleSaveConversation}>
                    <Save size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isArabic ? 'حفظ المحادثة' : 'Save conversation'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings size={16} />
                </Button>
              </SheetTrigger>
              <SheetContent side={isArabic ? "right" : "left"} className={isArabic ? 'font-noto text-right' : ''}>
                <SheetHeader>
                  <SheetTitle>{isArabic ? 'الإعدادات' : 'Settings'}</SheetTitle>
                </SheetHeader>
                <div className="py-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <FormLabel>
                        {isArabic ? 'شخصية المساعد' : 'Assistant Persona'}
                      </FormLabel>
                      <Select 
                        value={selectedPersona} 
                        onValueChange={setSelectedPersona}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={isArabic ? 'اختر شخصية' : 'Select persona'} />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(assistantPersonas).map(([key, persona]) => (
                            <SelectItem key={key} value={key}>
                              {isArabic ? persona.arabicName : persona.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground">
                        {isArabic
                          ? assistantPersonas[selectedPersona as keyof typeof assistantPersonas].arabicDescription
                          : assistantPersonas[selectedPersona as keyof typeof assistantPersonas].description
                        }
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <FormLabel>
                        {isArabic ? 'اللغة' : 'Language'}
                      </FormLabel>
                      <Select 
                        value={assistantOptions.language} 
                        onValueChange={(value: any) => 
                          setAssistantOptions({...assistantOptions, language: value})
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={isArabic ? 'اختر لغة' : 'Select language'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="ar">العربية</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <FormLabel>
                        {isArabic ? 'تضمين السياق' : 'Include Context'}
                      </FormLabel>
                      <Select 
                        value={assistantOptions.includeContextualInfo ? "yes" : "no"} 
                        onValueChange={(value) => 
                          setAssistantOptions({
                            ...assistantOptions, 
                            includeContextualInfo: value === "yes"
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={isArabic ? 'تضمين السياق؟' : 'Include context?'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">{isArabic ? 'نعم' : 'Yes'}</SelectItem>
                          <SelectItem value="no">{isArabic ? 'لا' : 'No'}</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {isArabic 
                          ? 'تضمين معلومات عن تاريخ السفر العائلي والتفضيلات' 
                          : 'Include information about family travel history and preferences'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-auto p-4 space-y-4" dir={isArabic ? 'rtl' : 'ltr'}>
          {conversation.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles size={30} className="text-primary" />
              </div>
              <h3 className="text-lg font-medium mb-2">
                {isArabic ? 'مرحبًا بك في مساعد السفر الذكي!' : 'Welcome to your Smart Travel Assistant!'}
              </h3>
              <p className="text-muted-foreground mb-8">
                {isArabic 
                  ? 'اسأل أي شيء عن وجهات السفر، أو التخطيط للرحلات، أو نصائح السفر العائلي' 
                  : 'Ask anything about travel destinations, trip planning, or family travel tips'
                }
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full max-w-md">
                {[
                  isArabic ? 'أين يمكنني الذهاب في الصيف مع الأطفال؟' : 'Where can I go in summer with kids?',
                  isArabic ? 'ما هي أفضل الوجهات في الشرق الأوسط؟' : 'What are the best destinations in the Middle East?',
                  isArabic ? 'كيف أخطط لرحلة عائلية اقتصادية؟' : 'How do I plan an affordable family trip?',
                  isArabic ? 'ما هي أفضل الأماكن للزيارة في تركيا؟' : 'What are the best places to visit in Turkey?'
                ].map((suggestion, index) => (
                  <Button 
                    key={index} 
                    variant="outline" 
                    className="justify-start h-auto py-2 text-sm"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {conversation.messages.map((message, index) => (
                <div 
                  key={message.id}
                  className={cn(
                    "flex",
                    message.role === 'user' ? (isArabic ? "justify-start" : "justify-end") : (isArabic ? "justify-end" : "justify-start")
                  )}
                >
                  <div 
                    className={cn(
                      "flex items-start gap-2 max-w-[80%]",
                      isArabic && message.role === 'user' ? "flex-row-reverse" : "",
                      !isArabic && message.role === 'assistant' ? "flex-row-reverse" : ""
                    )}
                  >
                    <Avatar className="h-8 w-8 mt-1">
                      {message.role === 'user' ? (
                        <>
                          <AvatarImage src="/avatars/user.png" alt="User" />
                          <AvatarFallback>
                            <User size={16} />
                          </AvatarFallback>
                        </>
                      ) : (
                        <>
                          <AvatarImage 
                            src={`/ai-personas/${selectedPersona}.jpg`} 
                            alt="AI Assistant" 
                          />
                          <AvatarFallback>
                            <Bot size={16} />
                          </AvatarFallback>
                        </>
                      )}
                    </Avatar>
                    
                    <div
                      className={cn(
                        "rounded-lg px-4 py-2 max-w-full",
                        message.role === 'user' 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted",
                        message.isError ? "bg-destructive/15 text-destructive border border-destructive/30" : ""
                      )}
                    >
                      {message.isLoading ? (
                        <div className="flex items-center space-x-2">
                          <Loader2 size={16} className="animate-spin" />
                          <span>
                            {isArabic ? 'جاري الكتابة...' : 'Typing...'}
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="whitespace-pre-wrap break-words">
                            {message.content}
                          </div>
                          <div 
                            className={`text-xs opacity-70 mt-1 ${message.role === 'user' ? 'text-primary-foreground' : 'text-muted-foreground'}`}
                            style={{ textAlign: isArabic ? 'left' : 'right' }}
                          >
                            {formatTime(message.timestamp)}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Show suggestions after assistant response */}
              {!isLoading && suggestions.length > 0 && conversation.messages.length > 0 && conversation.messages[conversation.messages.length - 1].role === 'assistant' && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {suggestions.map((suggestion, index) => (
                    <Badge 
                      key={index}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10 transition-colors"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      {suggestion}
                    </Badge>
                  ))}
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </>
          )}
        </CardContent>
        
        <CardFooter className="p-4 pt-2 border-t">
          <Form {...form}>
            <form 
              onSubmit={form.handleSubmit(onSubmit)} 
              className="w-full space-y-2"
            >
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <div className="relative">
                      <FormControl>
                        <Textarea
                          placeholder={isArabic 
                            ? "اكتب رسالتك هنا..." 
                            : "Type your message here..."
                          }
                          className={`min-h-[80px] resize-none pr-20 ${isArabic ? 'text-right' : ''}`}
                          {...field}
                          onKeyDown={(e) => {
                            // Submit on Enter (without Shift)
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              form.handleSubmit(onSubmit)();
                            }
                          }}
                        />
                      </FormControl>
                      
                      <div className="absolute bottom-2 right-2 flex space-x-1">
                        <Button 
                          type="button" 
                          size="icon" 
                          variant="ghost"
                          disabled={isLoading}
                        >
                          <Microphone size={16} />
                        </Button>
                        <Button 
                          type="button" 
                          size="icon" 
                          variant="ghost"
                          disabled={isLoading}
                        >
                          <ImagePlus size={16} />
                        </Button>
                        <Button 
                          type="button" 
                          size="icon" 
                          variant="ghost"
                          disabled={isLoading}
                        >
                          <MapPin size={16} />
                        </Button>
                        <Button 
                          type="submit" 
                          size="icon" 
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Send size={16} />
                          )}
                        </Button>
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </CardFooter>
      </Card>
    </div>
  );
};
