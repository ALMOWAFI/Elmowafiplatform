import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface FamilyConnectionLineProps {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  type: 'parent-child' | 'spouse' | 'sibling';
  isHighlighted?: boolean;
  sharedTravelCount?: number;
}

/**
 * Renders visually enhanced connection lines between family members
 * with travel-themed animations and styling based on relationship types
 */
export const FamilyConnectionLine: React.FC<FamilyConnectionLineProps> = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  type,
  isHighlighted = false,
  sharedTravelCount = 0
}) => {
  const [animationActive, setAnimationActive] = useState(false);
  
  // Activate animations when highlighted
  useEffect(() => {
    if (isHighlighted) {
      setAnimationActive(true);
      
      // Turn off animation after some time to prevent excessive animation
      const timer = setTimeout(() => {
        setAnimationActive(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isHighlighted]);
  // Calculate control points for curved paths
  const getControlPoints = () => {
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // For spouse connections, we'll use a slight curve
    if (type === 'spouse') {
      const midX = (sourceX + targetX) / 2;
      const midY = (sourceY + targetY) / 2;
      const curvature = distance * 0.1;
      
      // Create a slight curve based on vertical vs horizontal positioning
      if (Math.abs(dx) > Math.abs(dy)) {
        // More horizontal relationship
        return {
          cp1x: sourceX + dx / 3,
          cp1y: sourceY - curvature,
          cp2x: sourceX + dx * 2/3,
          cp2y: targetY - curvature
        };
      } else {
        // More vertical relationship
        return {
          cp1x: sourceX - curvature,
          cp1y: sourceY + dy / 3,
          cp2x: targetX - curvature,
          cp2y: sourceY + dy * 2/3
        };
      }
    } 
    // For parent-child connections, we'll create a smoother curve
    else if (type === 'parent-child') {
      const midY = (sourceY + targetY) / 2;
      
      return {
        cp1x: sourceX,
        cp1y: midY,
        cp2x: targetX,
        cp2y: midY
      };
    } 
    // For siblings, we'll create a very gentle curve
    else {
      const midX = (sourceX + targetX) / 2;
      const midY = (sourceY + targetY) / 2;
      const offset = distance * 0.1;
      
      return {
        cp1x: midX,
        cp1y: sourceY,
        cp2x: midX,
        cp2y: targetY
      };
    }
  };
  
  // Determine path drawing based on connection type
  const getPath = () => {
    const { cp1x, cp1y, cp2x, cp2y } = getControlPoints();
    
    if (type === 'spouse') {
      // Curved line for spouse connections
      return `M${sourceX},${sourceY} C${cp1x},${cp1y} ${cp2x},${cp2y} ${targetX},${targetY}`;
    } else if (type === 'parent-child') {
      // Curved paths for parent-child relationships
      return `M${sourceX},${sourceY} C${cp1x},${cp1y} ${cp2x},${cp2y} ${targetX},${targetY}`;
    } else {
      // Gentle curve for siblings
      return `M${sourceX},${sourceY} C${cp1x},${cp1y} ${cp2x},${cp2y} ${targetX},${targetY}`;
    }
  };
  
  // Determine style based on connection type and shared travel history
  const getLineStyles = () => {
    const baseStyles = "fill-none";
    const hasSharedTravels = sharedTravelCount > 0;
    
    if (type === 'spouse') {
      return cn(
        baseStyles,
        isHighlighted ? "stroke-primary stroke-[2px]" : 
          hasSharedTravels ? "stroke-indigo-400 stroke-[1.5px]" : "stroke-muted-foreground stroke-[1.5px]",
        hasSharedTravels ? "stroke-dasharray-none" : "stroke-dasharray-2"
      );
    } else if (type === 'parent-child') {
      return cn(
        baseStyles,
        isHighlighted ? "stroke-primary stroke-[2px]" : 
          hasSharedTravels ? "stroke-indigo-400 stroke-[1.5px]" : "stroke-muted-foreground stroke-[1.5px]"
      );
    } else {
      return cn(
        baseStyles,
        isHighlighted ? "stroke-primary stroke-[1.5px]" : 
          hasSharedTravels ? "stroke-indigo-300 stroke-[1px]" : "stroke-muted-foreground/50 stroke-[1px]",
        "stroke-dasharray-4"
      );
    }
  };
  
  // Generate travel dots positions along the path for shared travel history
  const getTravelDotsPositions = () => {
    if (sharedTravelCount <= 0) return [];
    
    const { cp1x, cp1y, cp2x, cp2y } = getControlPoints();
    const dots = [];
    const maxDots = Math.min(sharedTravelCount, 5); // Limit to avoid overcrowding
    
    for (let i = 0; i < maxDots; i++) {
      const t = (i + 1) / (maxDots + 1); // evenly space dots along path
      
      // Calculate point along Bezier curve
      // P = (1-t)³P₀ + 3(1-t)²tP₁ + 3(1-t)t²P₂ + t³P₃
      const oneMinusT = 1 - t;
      const oneMinusTSquared = oneMinusT * oneMinusT;
      const oneMinusTCubed = oneMinusTSquared * oneMinusT;
      const tSquared = t * t;
      const tCubed = tSquared * t;
      
      const x = oneMinusTCubed * sourceX + 
                3 * oneMinusTSquared * t * cp1x + 
                3 * oneMinusT * tSquared * cp2x + 
                tCubed * targetX;
                
      const y = oneMinusTCubed * sourceY + 
                3 * oneMinusTSquared * t * cp1y + 
                3 * oneMinusT * tSquared * cp2y + 
                tCubed * targetY;
      
      dots.push({ x, y, delay: i * 0.15 });
    }
    
    return dots;
  };
  
  // Travel dots positions
  const travelDots = getTravelDotsPositions();
  
  return (
    <>
      {/* Main connection line */}
      <motion.path
        d={getPath()}
        className={getLineStyles()}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ 
          pathLength: 1, 
          opacity: 1,
          strokeWidth: isHighlighted ? 2 : (sharedTravelCount > 0 ? 1.5 : 1)
        }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      />
      
      {/* Animated glow effect for highlighted connections */}
      {isHighlighted && (
        <motion.path
          d={getPath()}
          className="stroke-primary/30 fill-none"  
          strokeWidth={4}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.6 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          filter="url(#glow)"
        />
      )}
      
      {/* Travel history dots */}
      {travelDots.map((dot, index) => (
        <motion.g key={`travel-dot-${index}`}>
          <motion.circle
            cx={dot.x}
            cy={dot.y}
            r={3}
            className={isHighlighted ? "fill-primary" : "fill-indigo-400"}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: sharedTravelCount > 0 ? 0.8 : 0, 
              scale: 1,
              y: animationActive ? [dot.y, dot.y - 5, dot.y] : dot.y
            }}
            transition={{ 
              delay: dot.delay,
              duration: 0.3,
              y: { repeat: animationActive ? Infinity : 0, duration: 1.5 }
            }}
          />
          
          {/* Pulse effect for the dots when highlighted */}
          {isHighlighted && (
            <motion.circle
              cx={dot.x}
              cy={dot.y}
              r={3}
              className="fill-primary"
              initial={{ opacity: 0.7, scale: 1 }}
              animate={{ opacity: 0, scale: 3 }}
              transition={{ 
                repeat: animationActive ? Infinity : 0,
                duration: 1.5,
                delay: dot.delay
              }}
            />
          )}
        </motion.g>
      ))}
      
      {/* SVG filter for glow effect */}
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
    </>
  );
};
