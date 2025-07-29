import React from 'react';
import { cn } from '@/lib/utils';

interface ElmowafyLogoProps {
  className?: string;
}

/**
 * Custom logo component for the Elmowafy Travels platform 
 */
export const ElmowafyLogo: React.FC<ElmowafyLogoProps> = ({ className }) => {
  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-indigo-500/20 rounded-full blur-xl"></div>
      <div className="relative flex items-center justify-center bg-background rounded-full p-2 border">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-primary"
        >
          <path
            d="M12 2L4 7V17L12 22L20 17V7L12 2Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 22V12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 12L20 7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 12L4 7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
};
