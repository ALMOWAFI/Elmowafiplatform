'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAIAssistant, type AIMessage } from '@/hooks/useAIAssistant';
import { Send, X, Minimize2, Bot, Loader2, Plus, Trash2, List, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  message: AIMessage;
  isLast: boolean;
  isLoading: boolean;
}

interface ChatInterfaceProps {
  /** Initial message to display when chat loads */
  initialMessage?: string;
  /** Callback when the chat is closed */
  onClose?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Whether the chat is minimized */
  isMinimized?: boolean;
  /** Callback when minimize button is clicked */
  onToggleMinimize?: () => void;
  /** ID of the current conversation */
  conversationId?: string;
  /** Whether to show the conversation list */
  showConversationList?: boolean;
  /** Callback when a conversation is selected */
  onConversationSelect?: (id: string) => void;
  /** ARIA label for the chat interface */
  'aria-label'?: string;
  /** ID for the chat interface (for accessibility) */
  id?: string;
}

const ChatMessage = React.memo(({ message, isLast, isLoading }: ChatMessageProps) => {
  const { id, role, content, timestamp, isError } = message;
  const isUser = role === 'user';
  const isSystem = role === 'system';
  const date = timestamp ? new Date(timestamp) : new Date();
  const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const messageRef = useRef<HTMLDivElement>(null);

  // Auto-focus new messages for screen readers
  useEffect(() => {
    if (isLast && messageRef.current) {
      messageRef.current.focus({ preventScroll: true });
    }
  }, [isLast]);

  return (
    <div
      ref={messageRef}
      id={`message-${id}`}
      className={cn(
        'flex items-start gap-3 scroll-mt-4',
        isUser ? 'justify-end' : 'justify-start',
        isSystem && 'opacity-75',
        isError && 'border-l-4 border-red-500 pl-2'
      )}
      role={isSystem ? 'status' : 'article'}
      aria-live={isLast ? 'polite' : 'off'}
      aria-atomic="true"
      tabIndex={-1}
    >
      {!isUser && (
        <div className="flex-shrink-0">
          <Avatar className="h-8 w-8 bg-blue-500">
            <AvatarFallback>AI</AvatarFallback>
          </Avatar>
        </div>
      )}
      <div
        className={cn(
          'rounded-lg px-4 py-2 max-w-[80%] relative',
          isUser
            ? 'bg-blue-500 text-white rounded-br-none'
            : 'bg-gray-100 dark:bg-gray-800 rounded-bl-none',
          isSystem && 'bg-yellow-50 dark:bg-yellow-900/20',
          isError && 'border border-red-300 dark:border-red-900',
          'transition-colors duration-200'
        )}
        aria-label={`${isUser ? 'You' : 'AI Assistant'} said`}
      >
        <div 
          className="whitespace-pre-wrap break-words"
          dangerouslySetInnerHTML={{
            __html: content
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/\n/g, '<br />')
          }}
        />
        <div 
          className={cn(
            'text-xs mt-1 flex items-center gap-2',
            isUser ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400',
            isSystem && 'text-yellow-800 dark:text-yellow-200'
          )}
        >
          <time dateTime={date.toISOString()} className="whitespace-nowrap">
            {formattedTime}
          </time>
          {isError && (
            <span className="text-red-500 dark:text-red-400 flex items-center gap-1">
              <X className="h-3 w-3" />
              <span>Error</span>
            </span>
          )}
        </div>
        {isLoading && isLast && (
          <div 
            className="flex items-center justify-center mt-2"
            role="status"
            aria-label="AI is thinking"
          >
            <div className="flex space-x-1">
              {[0, 150, 300].map((delay) => (
                <div 
                  key={delay}
                  className={cn(
                    'h-2 w-2 rounded-full bg-blue-400',
                    'animate-bounce'
                  )}
                  style={{
                    animationDelay: `${delay}ms`,
                    animationDuration: '1s',
                    animationIterationCount: 'infinite',
                    animationTimingFunction: 'ease-in-out',
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      {isUser && (
        <div className="flex-shrink-0">
          <Avatar className="h-8 w-8">
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
        </div>
      )}
    </div>
  );
});

// Add display name for better dev tools
ChatMessage.displayName = 'ChatMessage';

export function ChatInterface({
  initialMessage = '',
  onClose,
  className = '',
  isMinimized: initialIsMinimized = false,
  onToggleMinimize,
  conversationId,
  'aria-label': ariaLabel = 'AI Assistant Chat',
  id = 'ai-chat-interface',
  ...props
}: ChatInterfaceProps) {
  const [isMinimized, setIsMinimized] = useState(initialIsMinimized);
  const [input, setInput] = useState(initialMessage);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [showConversationList, setShowConversationList] = useState(false);

  const {
    messages = [],
    isLoading,
    sendMessage,
    createNewConversation,
    deleteConversation,
    conversations = [],
    loadConversation,
    currentConversationId,
  } = useAIAssistant({
    initialMessage,
    conversationId,
  });

  // Handle sending a message
  const handleSendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput('');

    try {
      await sendMessage(message);
    } catch (err) {
      console.error('Failed to send message:', err);
      setInput(message);
    }
  }, [input, isLoading, sendMessage]);

  // Handle starting a new conversation
  const handleNewConversation = useCallback(() => {
    createNewConversation();
    setShowConversationList(false);
  }, [createNewConversation]);

  // Handle loading a conversation
  const handleLoadConversation = useCallback(async (id: string) => {
    const success = await loadConversation(id);
    if (success) {
      setShowConversationList(false);
      if (onConversationSelect) {
        onConversationSelect(id);
      }
    }
  }, [loadConversation, onConversationSelect]);

  // Load conversations on mount
  useEffect(() => {
    const loadInitialData = async () => {
      if (conversationId) {
        await loadConversation(conversationId);
      } else if (conversations.length > 0) {
        // Load the most recent conversation by default if we have any
        const mostRecent = conversations[0];
        if (mostRecent?.id) {
          await loadConversation(mostRecent.id);
        }
      }
    };
    
    loadInitialData();
  }, [conversationId, loadConversation, conversations]);

  // Handle deleting a conversation
  const handleDeleteConversation = useCallback(async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      await deleteConversation(id);
    }
  }, [deleteConversation]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }

      // Focus input when '/' is pressed
      if (e.key === '/' && e.target !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    },
    [handleSendMessage]
  );

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus input when conversation changes or when loading completes
  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading, conversationId]);

  // Toggle minimized state
  const toggleMinimize = useCallback(() => {
    if (onToggleMinimize) {
      onToggleMinimize();
    } else {
      setIsMinimized((prev) => !prev);
    }
    
    // Focus input when unminimizing
    if (isMinimized) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [onToggleMinimize, isMinimized]);

  if (isMinimized) {
    return (
      <div 
        className={cn('fixed bottom-4 right-4 z-50', className)}
        aria-label={ariaLabel}
        id={id}
        role="dialog"
        aria-modal="true"
        aria-expanded={!isMinimized}
        {...props}
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden w-80">
          <div className="bg-blue-500 text-white p-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bot className="h-5 w-5" aria-hidden="true" />
              <h2 className="font-medium m-0" id={`${id}-title`}>AI Assistant</h2>
            </div>
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-blue-600"
                onClick={toggleMinimize}
                aria-label="Expand chat"
                aria-expanded={!isMinimized}
                aria-controls={id}
              >
                <Minimize2 className="h-4 w-4" aria-hidden="true" />
              </Button>
              {onClose && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white hover:bg-blue-600"
                  onClick={onClose}
                  aria-label="Close chat"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn('fixed bottom-4 right-4 z-50 flex flex-col w-96', className)}
      aria-label={ariaLabel}
      id={id}
      role="dialog"
      aria-modal="true"
      aria-expanded={!isMinimized}
      aria-labelledby={`${id}-title`}
      {...props}
    >
      <div className="bg-white dark:bg-gray-800 rounded-t-lg shadow-lg overflow-hidden flex-1 flex flex-col">
        {/* Header */}
        <div 
          className="bg-blue-500 text-white p-3 flex items-center justify-between"
          role="banner"
        >
          <div className="flex items-center space-x-2">
            <Bot className="h-5 w-5" aria-hidden="true" />
            <h2 className="font-medium m-0" id={`${id}-title`}>AI Assistant</h2>
          </div>
          <div className="flex items-center space-x-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white hover:bg-blue-600"
                  onClick={() => setShowConversationList(!showConversationList)}
                  aria-label="Show conversations"
                  aria-expanded={showConversationList}
                  aria-controls={`${id}-conversation-list`}
                >
                  <List className="h-4 w-4" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Conversations</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white hover:bg-blue-600"
                  onClick={handleNewConversation}
                  aria-label="Start new conversation"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New Chat</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white hover:bg-blue-600"
                  onClick={toggleMinimize}
                  aria-label="Minimize chat"
                  aria-expanded={!isMinimized}
                >
                  <Minimize2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Minimize</TooltipContent>
            </Tooltip>
            {onClose && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:bg-blue-600"
                    onClick={onClose}
                    aria-label="Close chat"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Close</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Conversation List */}
          <div 
            id={`${id}-conversation-list`}
            className={cn(
              'w-48 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 overflow-y-auto transition-all duration-200',
              showConversationList ? 'block' : 'hidden w-0 border-0'
            )}
            role="region"
            aria-label="Conversation list"
          >
            <div className="p-2 min-w-[12rem]">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 px-2 py-1 mb-2">
                Conversations
              </h3>
              <div 
                className="space-y-1" 
                role="listbox" 
                aria-label="Conversations"
                aria-orientation="vertical"
              >
                {conversations?.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => handleLoadConversation(conv.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleLoadConversation(conv.id);
                      }
                    }}
                    className={cn(
                      'flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-800',
                      conversationId === conv.id && 'bg-blue-50 dark:bg-blue-900/30',
                      'transition-colors duration-150'
                    )}
                    role="option"
                    aria-selected={conversationId === conv.id}
                    tabIndex={0}
                  >
                    <div className="flex items-center space-x-2 overflow-hidden min-w-0">
                      <MessageSquare className="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" aria-hidden="true" />
                      <span className="text-sm truncate">
                        {conv.title || 'New Chat'}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-gray-400 hover:text-red-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConversation(e, conv.id);
                      }}
                      aria-label={`Delete conversation: ${conv.title || 'New Chat'}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
                {conversations?.length === 0 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1">
                    No conversations yet
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Chat Messages */}
          <div 
            className={cn("flex-1 flex flex-col transition-all duration-200", 
              showConversationList ? 'w-[calc(100%-12rem)]' : 'w-full'
            )}
            role="log"
            aria-live="polite"
            aria-atomic="false"
            aria-relevant="additions"
          >
            <ScrollArea className="flex-1 p-4 space-y-4">
              {messages.length === 0 ? (
                <div 
                  className="text-center text-gray-500 dark:text-gray-400 py-8"
                  aria-live="polite"
                >
                  <p>How can I help you today?</p>
                  <p className="text-xs mt-2">Start a new conversation or select an existing one</p>
                </div>
              ) : (
                <ul className="space-y-4 list-none p-0 m-0">
                  {messages.map((message, index) => (
                    <li key={message.id || index}>
                      <ChatMessage
                        message={message}
                        isLast={index === messages.length - 1}
                        isLoading={isLoading && index === messages.length - 1}
                      />
                    </li>
                  ))}
                </ul>
              )}
              <div 
                ref={messagesEndRef} 
                aria-hidden="true"
                tabIndex={-1}
              />
            </ScrollArea>
          </div>
        </div>

        {/* Input */}
        <div 
          className="border-t border-gray-200 dark:border-gray-700 p-3"
          role="form"
          aria-label="Chat input"
        >
          <div className="flex items-end space-x-2">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isLoading ? 'AI is thinking...' : 'Type your message...'}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-70 disabled:cursor-not-allowed pr-10"
                disabled={isLoading}
                aria-label="Type your message"
                aria-required="true"
                aria-disabled={isLoading}
                aria-busy={isLoading}
                aria-describedby={`${id}-input-help`}
              />
              <div 
                id={`${id}-input-help`} 
                className="sr-only"
                aria-live="polite"
              >
                {isLoading ? 'AI is generating a response, please wait...' : 'Type your message and press Enter to send'}
              </div>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isLoading}
                  className="h-10 w-10 p-0 flex-shrink-0"
                  aria-label={isLoading ? 'Sending message...' : 'Send message'}
                  aria-busy={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="sr-only">Sending message</span>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    </>
                  ) : (
                    <>
                      <span className="sr-only">Send message</span>
                      <Send className="h-4 w-4" aria-hidden="true" />
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isLoading ? 'Sending...' : 'Send message'}</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatInterface;
