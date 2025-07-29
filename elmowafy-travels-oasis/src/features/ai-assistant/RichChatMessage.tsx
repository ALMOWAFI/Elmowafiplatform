import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { 
  MessageCircle,
  User,
  Bot,
  Clock,
  Map,
  Image as ImageIcon,
  Play,
  BarChart,
  Sparkles,
  Volume2,
  Share,
  ThumbsUp,
  Bookmark,
  X,
  Heart,
  ChevronDown,
  ChevronUp,
  Globe,
  Flag,
  Send,
  Lightbulb
} from 'lucide-react';
import { 
  Avatar,
  AvatarFallback,
  AvatarImage
} from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/context/LanguageContext';
import { ChatMessage, MediaContent, RichMessageContent } from './types';

// Utility function to format time
const formatTime = (date: Date, language: string): string => {
  return date.toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Media renderer component
const MediaRenderer: React.FC<{ media: MediaContent; language: string }> = ({ media, language }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const caption = language === 'ar' ? media.caption?.ar : media.caption?.en;

  return (
    <div className="relative rounded-md overflow-hidden my-2 border">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <span className="animate-pulse">Loading...</span>
        </div>
      )}

      <div className="aspect-video relative">
        {media.type === 'image' && (
          <img 
            src={media.url} 
            alt={caption || 'Image'} 
            className="w-full h-full object-cover"
            onLoad={handleLoad}
          />
        )}

        {media.type === 'map' && (
          <div className="w-full h-full bg-muted">
            <iframe 
              src={media.url} 
              className="w-full h-full" 
              onLoad={handleLoad}
              title="Map"
            />
          </div>
        )}

        {media.type === 'video' && (
          <video 
            src={media.url} 
            controls 
            onLoadedData={handleLoad} 
            className="w-full h-full object-cover"
          />
        )}

        {media.type === 'chart' && (
          <div className="w-full h-full bg-card p-4">
            <iframe 
              src={media.url} 
              className="w-full h-full" 
              onLoad={handleLoad}
              title="Chart"
            />
          </div>
        )}

        {media.type === '3d-model' && (
          <div className="w-full h-full bg-card p-4">
            <iframe 
              src={media.url} 
              className="w-full h-full" 
              onLoad={handleLoad}
              title="3D Model"
            />
          </div>
        )}

        {media.type === 'audio' && (
          <div className="w-full h-full flex items-center justify-center p-4 bg-card">
            <audio 
              src={media.url} 
              controls 
              onLoadedData={handleLoad} 
              className="w-full max-w-xs"
            />
          </div>
        )}
      </div>

      {caption && (
        <div className="p-2 text-sm bg-muted/50 text-center">
          {caption}
        </div>
      )}

      {media.interactionData && (
        <div className="p-2 border-t">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                {language === 'ar' ? 'عرض أقل' : 'Show less'}
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                {language === 'ar' ? 'عرض المزيد' : 'Show more'}
              </>
            )}
          </Button>
          
          {isExpanded && (
            <div className="mt-2 p-2 bg-card rounded-md">
              <pre className="text-xs overflow-auto">
                {JSON.stringify(media.interactionData, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Location references component
const LocationReferences: React.FC<{ 
  locations: { id: string; name: string; nameAr?: string; coordinates: [number, number] }[]; 
  language: string;
}> = ({ locations, language }) => {
  if (!locations || locations.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 my-2">
      {locations.map(location => (
        <Badge key={location.id} variant="outline" className="flex items-center">
          <Map className="h-3 w-3 mr-1" />
          {language === 'ar' ? location.nameAr || location.name : location.name}
        </Badge>
      ))}
    </div>
  );
};

// Family references component
const FamilyReferences: React.FC<{ 
  familyMembers: { id: string; name: string; nameAr?: string; relation?: string; relationAr?: string; }[];
  language: string;
}> = ({ familyMembers, language }) => {
  if (!familyMembers || familyMembers.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 my-2">
      {familyMembers.map(member => (
        <Badge key={member.id} variant="secondary" className="flex items-center">
          <User className="h-3 w-3 mr-1" />
          {language === 'ar' ? member.nameAr || member.name : member.name}
          {member.relation && (
            <span className="text-xs opacity-70 ml-1">
              ({language === 'ar' ? member.relationAr || member.relation : member.relation})
            </span>
          )}
        </Badge>
      ))}
    </div>
  );
};

// Interactive elements component
const InteractiveElements: React.FC<{
  elements: {
    type: string;
    id: string;
    data: any;
    actionType: string;
  }[];
  language: string;
  onInteraction: (id: string, action: string, data: any) => void;
}> = ({ elements, language, onInteraction }) => {
  if (!elements || elements.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 my-2">
      {elements.map(element => {
        // Render different interactive elements based on type
        if (element.type === 'button') {
          return (
            <Button
              key={element.id}
              size="sm"
              variant={element.data.variant || "secondary"}
              onClick={() => onInteraction(element.id, element.actionType, element.data)}
            >
              {language === 'ar' ? element.data.labelAr || element.data.label : element.data.label}
            </Button>
          );
        }
        
        // Placeholder for other interactive elements
        return (
          <Badge key={element.id} variant="outline">
            {element.type}: {element.id}
          </Badge>
        );
      })}
    </div>
  );
};

// Voice message component
const VoiceMessage: React.FC<{
  url: string;
  duration?: number;
  transcription?: string;
  language: string;
}> = ({ url, duration, transcription, language }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    
    setIsPlaying(!isPlaying);
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '0:00';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="my-2 p-3 bg-muted/30 rounded-lg">
      <div className="flex items-center">
        <Button 
          size="sm" 
          variant="secondary" 
          className="h-8 w-8 rounded-full p-0 mr-3"
          onClick={togglePlay}
        >
          {isPlaying ? <X size={14} /> : <Volume2 size={14} />}
        </Button>
        
        <div className="flex-1">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div className={`h-full bg-primary ${isPlaying ? 'animate-progress' : ''}`} style={{ width: '0%' }}></div>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {formatDuration(duration)}
          </div>
        </div>
        
        {transcription && (
          <Button 
            size="sm" 
            variant="ghost" 
            className="ml-2"
            onClick={() => setShowTranscript(!showTranscript)}
          >
            {language === 'ar' ? 'النص' : 'Transcript'}
          </Button>
        )}
      </div>
      
      {showTranscript && transcription && (
        <div className="mt-2 p-2 bg-background rounded text-sm">
          {transcription}
        </div>
      )}
      
      <audio ref={audioRef} src={url} className="hidden" />
    </div>
  );
};

interface RichChatMessageProps {
  message: ChatMessage;
  isLastMessage?: boolean;
  onReaction?: (messageId: string, reaction: string) => void;
}

const RichChatMessage: React.FC<RichChatMessageProps> = ({ 
  message, 
  isLastMessage = false,
  onReaction
}) => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  const [showActions, setShowActions] = useState(false);
  
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isSystem = message.role === 'system';
  const isMemory = message.role === 'memory';
  
  // Get rich content if available
  const richContent = typeof message.content !== 'string' ? message.content : null;
  const textContent = typeof message.content === 'string' 
    ? message.content 
    : isArabic && richContent?.textAr 
      ? richContent.textAr 
      : richContent?.text || '';
  
  // Animation variants
  const containerVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.95
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: { 
        duration: 0.3,
        ease: [0.19, 1.0, 0.22, 1.0]
      } 
    },
    exit: { 
      opacity: 0,
      scale: 0.95,
      transition: { 
        duration: 0.2
      } 
    }
  };
  
  // Loading animation variants
  const loadingVariants = {
    animate: {
      opacity: [0.4, 1, 0.4],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };
  
  // Handle reactions
  const handleReaction = (reaction: string) => {
    if (onReaction) {
      onReaction(message.id, reaction);
    }
  };

  // Render different message types
  if (isSystem) {
    return (
      <motion.div
        className="flex justify-center my-2"
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={containerVariants}
      >
        <Badge variant="outline" className="bg-muted/30 text-xs">
          {textContent}
        </Badge>
      </motion.div>
    );
  }
  
  if (isMemory) {
    return (
      <motion.div
        className="flex justify-center my-2"
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={containerVariants}
      >
        <div className="max-w-md w-full bg-yellow-50 text-yellow-800 p-3 rounded-lg border border-yellow-200 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={14} className="text-yellow-600" />
            <span className="font-medium text-sm">
              {isArabic ? 'ذكرى سفر' : 'Travel Memory'}
            </span>
          </div>
          <div className="text-sm">
            {textContent}
          </div>
        </div>
      </motion.div>
    );
  }
  
  return (
    <motion.div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} my-2`}
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={containerVariants}
      onHoverStart={() => setShowActions(true)}
      onHoverEnd={() => setShowActions(false)}
    >
      <div className={`flex ${isUser ? 'flex-row-reverse' : 'flex-row'} max-w-[80%] group`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 ${isUser ? 'ml-2' : 'mr-2'}`}>
          <Avatar className="h-8 w-8">
            {isUser ? (
              <>
                <AvatarImage src="/avatars/user.jpg" alt="User" />
                <AvatarFallback>
                  <User size={16} />
                </AvatarFallback>
              </>
            ) : (
              <>
                <AvatarImage src="/ai-personas/historian.jpg" alt="AI Assistant" />
                <AvatarFallback>
                  <Bot size={16} />
                </AvatarFallback>
              </>
            )}
          </Avatar>
        </div>
        
        {/* Message content */}
        <div 
          className={`
            flex-1 
            ${isUser 
              ? 'bg-primary text-primary-foreground' 
              : message.isError 
                ? 'bg-destructive/10 text-destructive-foreground border border-destructive/20' 
                : 'bg-muted text-muted-foreground'
            } 
            rounded-lg p-3 shadow-sm
            ${message.isLoading ? 'animate-pulse' : ''}
          `}
        >
          {/* Loading state */}
          {message.isLoading ? (
            <div className="flex items-center">
              <motion.div 
                className="h-2 w-2 bg-current rounded-full mr-1" 
                variants={loadingVariants} 
                animate="animate"
              />
              <motion.div 
                className="h-2 w-2 bg-current rounded-full mr-1" 
                variants={loadingVariants} 
                animate="animate"
                style={{ animationDelay: "0.2s" }}
              />
              <motion.div 
                className="h-2 w-2 bg-current rounded-full" 
                variants={loadingVariants} 
                animate="animate"
                style={{ animationDelay: "0.4s" }}
              />
            </div>
          ) : (
            <div className={`${isArabic ? 'font-noto text-right' : ''}`}>
              {/* Voice message */}
              {message.voiceData?.url && (
                <VoiceMessage 
                  url={message.voiceData.url}
                  duration={message.voiceData.duration}
                  transcription={message.voiceData.transcription}
                  language={language}
                />
              )}
              
              {/* Plain text or markdown */}
              <div className="whitespace-pre-wrap break-words">
                {richContent?.markdown ? (
                  <ReactMarkdown className="prose dark:prose-invert max-w-none prose-sm">
                    {textContent}
                  </ReactMarkdown>
                ) : (
                  textContent
                )}
              </div>
              
              {/* Rich content - Media */}
              {richContent?.media && richContent.media.length > 0 && (
                <div className="mt-3 space-y-3">
                  {richContent.media.length === 1 ? (
                    <MediaRenderer media={richContent.media[0]} language={language} />
                  ) : (
                    <Tabs defaultValue="1" className="w-full">
                      <TabsList className="mb-2">
                        {richContent.media.map((_, index) => (
                          <TabsTrigger key={index} value={(index + 1).toString()}>
                            {index + 1}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      {richContent.media.map((media, index) => (
                        <TabsContent key={index} value={(index + 1).toString()}>
                          <MediaRenderer media={media} language={language} />
                        </TabsContent>
                      ))}
                    </Tabs>
                  )}
                </div>
              )}
              
              {/* Location references */}
              {richContent?.locationReferences && richContent.locationReferences.length > 0 && (
                <LocationReferences 
                  locations={richContent.locationReferences} 
                  language={language} 
                />
              )}
              
              {/* Family references */}
              {richContent?.familyReferences && richContent.familyReferences.length > 0 && (
                <FamilyReferences 
                  familyMembers={richContent.familyReferences} 
                  language={language} 
                />
              )}
              
              {/* Interactive elements */}
              {richContent?.interactiveElements && richContent.interactiveElements.length > 0 && (
                <InteractiveElements 
                  elements={richContent.interactiveElements} 
                  language={language}
                  onInteraction={(id, action, data) => {
                    console.log('Interaction:', id, action, data);
                    // Handle different interactions here
                  }}
                />
              )}
              
              {/* Message timestamp */}
              <div className="mt-1 text-right">
                <span className="text-[10px] opacity-70">
                  {formatTime(message.timestamp, language)}
                </span>
              </div>
            </div>
          )}
        </div>
        
        {/* Reactions */}
        {!isUser && !message.isLoading && (
          <AnimatePresence>
            {(showActions || message.reactions?.helpful || message.reactions?.saved) && (
              <motion.div 
                className="flex gap-1 items-center mt-2 ml-2"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
              >
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        size="icon" 
                        variant={message.reactions?.helpful ? "default" : "ghost"} 
                        className="h-7 w-7"
                        onClick={() => handleReaction('helpful')}
                      >
                        <ThumbsUp size={14} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isArabic ? 'مفيد' : 'Helpful'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        size="icon" 
                        variant={message.reactions?.saved ? "default" : "ghost"} 
                        className="h-7 w-7"
                        onClick={() => handleReaction('saved')}
                      >
                        <Bookmark size={14} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isArabic ? 'حفظ' : 'Save'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        size="icon" 
                        variant={message.reactions?.shared ? "default" : "ghost"} 
                        className="h-7 w-7"
                        onClick={() => handleReaction('shared')}
                      >
                        <Share size={14} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isArabic ? 'مشاركة' : 'Share'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
};

export default RichChatMessage;
