import * as React from "react";
import { cn } from "@/lib/utils";

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * Container component for consistent layout margins
 */
export function Container({ className, children, ...props }: ContainerProps) {
  return (
    <div
      className={cn(
        "w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", 
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
