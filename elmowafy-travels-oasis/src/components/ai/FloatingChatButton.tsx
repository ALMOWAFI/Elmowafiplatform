'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bot, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChatInterface } from './ChatInterface';

export function FloatingChatButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  // Only show the chat button after the component has mounted to avoid hydration issues
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Close chat when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const chatContainer = document.querySelector('.chat-container');
      const chatButton = document.querySelector('.chat-button');
      
      if (
        chatContainer && 
        !chatContainer.contains(target) && 
        chatButton && 
        !chatButton.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);
  
  // Toggle chat window
  const toggleChat = () => {
    setIsOpen(!isOpen);
  };
  
  // Don't render anything during SSR to avoid hydration issues
  if (!isMounted) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Button */}
      <Button
        onClick={toggleChat}
        className={cn(
          'chat-button rounded-full h-14 w-14 p-0 shadow-lg transition-all duration-300',
          isOpen ? 'opacity-0 scale-0' : 'opacity-100 scale-100',
          'bg-gradient-to-br from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80'
        )}
        aria-label="Chat with AI Assistant"
      >
        <Bot className="h-6 w-6" />
      </Button>
      
      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="chat-container absolute bottom-0 right-0 w-full sm:w-96 h-[600px]"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <ChatInterface 
              isMinimized={false}
              onToggleMinimize={toggleChat}
              className="h-full w-full shadow-2xl"
              initialMessage="Hello! I'm your Elmowafy Travel Assistant. How can I help you plan your next adventure?"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default FloatingChatButton;
