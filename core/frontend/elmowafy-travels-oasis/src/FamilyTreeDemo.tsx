import React from 'react';
import { createRoot } from 'react-dom/client';
import { FamilyTreeFeature } from './features/family-tree/FamilyTreeFeature';
import { LanguageProvider } from './context/LanguageContext';
import './index.css';

// Simple demo wrapper
const FamilyTreeDemo = () => {
  return (
    <LanguageProvider>
      <div className="min-h-screen p-4 bg-background">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Elmowafy Family Tree</h1>
          <p className="text-muted-foreground mt-2">
            Interactive visualization of the Elmowafy family history and travel memories
          </p>
        </header>
        
        <main className="max-w-7xl mx-auto">
          <FamilyTreeFeature />
        </main>
        
        <footer className="mt-12 text-center text-sm text-muted-foreground">
          <p>Part of the Elmowafy Travel Platform - The Cultural Journey Experience</p>
        </footer>
      </div>
    </LanguageProvider>
  );
};

// Render this standalone demo directly
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<FamilyTreeDemo />);
}

export default FamilyTreeDemo;
