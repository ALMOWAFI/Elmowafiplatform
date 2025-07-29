import { useEffect, useCallback } from 'react';

interface KeyboardShortcuts {
  onSwitchView?: () => void;
  onResetCamera?: () => void;
  onToggleAutoRotate?: () => void;
  onSearch?: () => void;
  onEscape?: () => void;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcuts) => {
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in input fields
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLSelectElement
    ) {
      return;
    }

    switch (event.key.toLowerCase()) {
      case ' ':
      case 'spacebar':
        event.preventDefault();
        shortcuts.onSwitchView?.();
        break;
      
      case 'r':
        event.preventDefault();
        shortcuts.onResetCamera?.();
        break;
      
      case 'a':
        event.preventDefault();
        shortcuts.onToggleAutoRotate?.();
        break;
      
      case '/':
        event.preventDefault();
        shortcuts.onSearch?.();
        break;
      
      case 'escape':
        event.preventDefault();
        shortcuts.onEscape?.();
        break;
      
      default:
        break;
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);
};

export default useKeyboardShortcuts; 