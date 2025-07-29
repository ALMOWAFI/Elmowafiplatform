import React from 'react';
import ChatInterface from '@/features/ai-assistant/components/ChatInterface';

const AIHelperPage: React.FC = () => {
  return (
    <div className="w-full h-screen bg-slate-100 dark:bg-slate-900 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-3xl h-full max-h-[90vh] flex flex-col">
        <header className="text-center mb-6">
          <h1 className="text-4xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">AI Travel Assistant</h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 mt-2">Your personal guide for planning the perfect family adventure.</p>
        </header>
        <ChatInterface />
      </div>
    </div>
  );
};

export default AIHelperPage;
