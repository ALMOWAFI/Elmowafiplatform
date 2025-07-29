// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ChatInterface from '../ChatInterface';
import type { AIMessage } from '@/hooks/useAIAssistant';
import '@testing-library/jest-dom';

// Mock the useAIAssistant hook
const mockUseAIAssistant = vi.fn().mockReturnValue({
  messages: [],
  isLoading: false,
  sendMessage: vi.fn().mockResolvedValue(undefined),
  createNewConversation: vi.fn().mockResolvedValue('new-conversation-id'),
  deleteConversation: vi.fn().mockResolvedValue(true),
  loadConversation: vi.fn().mockResolvedValue(true),
  conversations: [
    { id: 'conv1', title: 'Test Conversation 1', lastUpdated: new Date().toISOString(), preview: 'Hello', messageCount: 1 },
    { id: 'conv2', title: 'Test Conversation 2', lastUpdated: new Date().toISOString(), preview: 'Hi there', messageCount: 1 },
  ],
  currentConversationId: 'conv1',
});

vi.mock('@/hooks/useAIAssistant', () => ({
  useAIAssistant: mockUseAIAssistant,
}));

describe('ChatInterface', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  it('renders the chat interface', () => {
    render(<ChatInterface />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('AI Assistant Chat')).toBeInTheDocument();
  });

  it('displays the conversation list when the menu button is clicked', () => {
    render(<ChatInterface />);
    const menuButton = screen.getByLabelText('Show conversation list');
    fireEvent.click(menuButton);
    expect(screen.getByText('Test Conversation 1')).toBeInTheDocument();
    expect(screen.getByText('Test Conversation 2')).toBeInTheDocument();
  });

  it('allows sending a message', async () => {
    render(<ChatInterface />);
    const input = screen.getByPlaceholderText('Type a message...');
    const sendButton = screen.getByLabelText('Send message');
    
    fireEvent.change(input, { target: { value: 'Hello, AI!' } });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(mockUseAIAssistant().sendMessage).toHaveBeenCalledWith('Hello, AI!');
    });
  });

  it('creates a new conversation when new chat button is clicked', async () => {
    render(<ChatInterface />);
    const newChatButton = screen.getByLabelText('New chat');
    fireEvent.click(newChatButton);
    
    await waitFor(() => {
      expect(mockUseAIAssistant().createNewConversation).toHaveBeenCalled();
    });
  });

  it('loads a conversation when clicked from the list', async () => {
    render(<ChatInterface />);
    
    // Open conversation list
    const menuButton = screen.getByLabelText('Show conversation list');
    fireEvent.click(menuButton);
    
    // Click on a conversation
    const conversation = screen.getByText('Test Conversation 2');
    fireEvent.click(conversation);
    
    await waitFor(() => {
      expect(mockUseAIAssistant().loadConversation).toHaveBeenCalledWith('conv2');
    });
  });

  it('deletes a conversation when delete button is clicked', async () => {
    // Mock window.confirm
    const originalConfirm = window.confirm;
    window.confirm = vi.fn(() => true);
    
    render(<ChatInterface />);
    
    // Open conversation list
    const menuButton = screen.getByLabelText('Show conversation list');
    fireEvent.click(menuButton);
    
    // Click delete button on a conversation
    const deleteButtons = screen.getAllByLabelText('Delete conversation');
    fireEvent.click(deleteButtons[0]);
    
    await waitFor(() => {
      expect(mockUseAIAssistant().deleteConversation).toHaveBeenCalledWith('conv1');
    });
    
    // Restore original confirm
    window.confirm = originalConfirm;
  });

  it('toggles between minimized and expanded states', () => {
    render(<ChatInterface />);
    
    // Check initial state (expanded)
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    
    // Get the container that should have the height class
    const container = dialog.closest('.fixed');
    expect(container).toBeInTheDocument();
    
    // Minimize
    const minimizeButton = screen.getByLabelText('Minimize chat');
    fireEvent.click(minimizeButton);
    
    // Check minimized state - should not have the expanded height class
    expect(container).not.toHaveClass('h-[500px]');
    
    // Expand again
    const expandButton = screen.getByLabelText('Expand chat');
    fireEvent.click(expandButton);
    
    // Check expanded state - should have the expanded height class
    expect(container).toHaveClass('h-[500px]');
  });

  it('displays loading state when messages are being loaded', () => {
    // Mock loading state
    mockUseAIAssistant.mockReturnValueOnce({
      ...mockUseAIAssistant(),
      isLoading: true,
    });
    
    render(<ChatInterface />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('displays error messages', () => {
    const errorMessage = 'This is an error message';
    const errorMessageObj: AIMessage = {
      id: '1',
      role: 'assistant',
      content: errorMessage,
      timestamp: new Date().toISOString(),
      isError: true,
    };
    
    // Mock error state
    mockUseAIAssistant.mockReturnValueOnce({
      ...mockUseAIAssistant(),
      messages: [errorMessageObj],
    });
    
    render(<ChatInterface />);
    expect(screen.getByText(errorMessage)).toHaveClass('text-red-500');
  });
});
