'use client';

import { PreferencesPage } from '@/components/preferences/PreferencesPage';
import { PreferencesProvider } from '@/contexts/PreferencesContext';
import { AIAssistantProvider } from '@/contexts/AIAssistantContext';

export default function Preferences() {
  return (
    <PreferencesProvider>
      <AIAssistantProvider>
        <div className="min-h-screen bg-background">
          <PreferencesPage />
        </div>
      </AIAssistantProvider>
    </PreferencesProvider>
  );
}
