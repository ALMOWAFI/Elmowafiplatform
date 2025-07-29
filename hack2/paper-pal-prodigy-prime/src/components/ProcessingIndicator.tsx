
import React, { useEffect, useState, useRef } from 'react';
import { Progress } from '@/components/ui/progress';
import { 
  GraduationCap, BookOpen, Check, PenTool, 
  Calculator, CircleDot, LoaderCircle 
} from 'lucide-react';

interface ProcessingIndicatorProps {
  progress: number;
  stage: 'analyzing' | 'checking' | 'marking' | 'finalizing';
}

interface Particle {
  id: number;
  x: number;
  y: number;
  opacity: number;
  size: number;
  speed: number;
  symbol: string;
}

// Mathematical symbols for the visualization
const mathSymbols = ['+', '-', '×', '÷', '=', '≠', '≈', '∑', '∫', '√', 'π', '∞', 'Δ', '∇', '∂', '%'];

const ProcessingIndicator: React.FC<ProcessingIndicatorProps> = ({ progress, stage }) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  
  const getStageInfo = () => {
    switch(stage) {
      case 'analyzing':
        return {
          text: 'Analyzing mathematical patterns...',
          icon: <Calculator className="animate-pulse text-indigo-400" />,
          color: 'from-indigo-400 to-blue-500'
        };
      case 'checking':
        return {
          text: 'Verifying solutions and approaches...',
          icon: <BookOpen className="animate-pulse text-blue-500" />,
          color: 'from-blue-500 to-teal-400'
        };
      case 'marking':
        return {
          text: 'Identifying learning opportunities...',
          icon: <PenTool className="animate-pulse text-teal-400" />,
          color: 'from-teal-400 to-emerald-500'
        };
      case 'finalizing':
        return {
          text: 'Crafting personalized insights...',
          icon: <GraduationCap className="animate-pulse text-emerald-500" />,
          color: 'from-emerald-500 to-green-400'
        };
      default:
        return {
          text: 'Processing...',
          icon: <Check className="animate-pulse text-indigo-500" />,
          color: 'from-indigo-500 to-purple-500'
        };
    }
  };

  const { text, icon, color } = getStageInfo();

  // Generate particles
  useEffect(() => {
    const particleCount = 40;
    const newParticles = Array(particleCount).fill(0).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      opacity: 0.3 + Math.random() * 0.7,
      size: 10 + Math.random() * 20,
      speed: 0.5 + Math.random() * 2,
      symbol: mathSymbols[Math.floor(Math.random() * mathSymbols.length)]
    }));
    
    setParticles(newParticles);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Neural network visualization
  useEffect(() => {
    if (!canvasRef.current || particles.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions
    const updateCanvasSize = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    };
    
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    
    // Animation function
    const animate = () => {
      if (!ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw connections (neural pathways)
      ctx.strokeStyle = `rgba(99, 102, 241, ${progress / 200})`;
      ctx.lineWidth = 1;
      
      // Connect particles based on progress
      const connectionThreshold = Math.min(100, 20 + progress);
      
      particles.forEach((particle, i) => {
        const x1 = canvas.width * particle.x / 100;
        const y1 = canvas.height * particle.y / 100;
        
        // Connect to nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const particle2 = particles[j];
          const x2 = canvas.width * particle2.x / 100;
          const y2 = canvas.height * particle2.y / 100;
          
          // Distance between particles
          const dx = x2 - x1;
          const dy = y2 - y1;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < connectionThreshold) {
            // Opacity based on distance and progress
            const opacity = (1 - distance / connectionThreshold) * progress / 100;
            
            ctx.beginPath();
            ctx.strokeStyle = `rgba(99, 102, 241, ${opacity})`;
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          }
        }
      });
      
      // Draw mathematical symbols (particles)
      particles.forEach((particle) => {
        // Skip rendering some particles based on progress
        if (particle.id % 5 > progress / 20) return;
        
        const x = canvas.width * particle.x / 100;
        const y = canvas.height * particle.y / 100;
        
        // Draw the symbol
        ctx.font = `${particle.size}px serif`;
        ctx.fillStyle = `rgba(99, 102, 241, ${particle.opacity * progress / 100})`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(particle.symbol, x, y);
      });
      
      // Continue animation
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [particles, progress]);

  return (
    <div className="w-full max-w-3xl mx-auto py-8 px-4">
      <div className="relative">
        {/* Canvas for neural network visualization */}
        <div className="aspect-video w-full mb-6 rounded-lg overflow-hidden bg-gray-900/10 backdrop-blur-sm">
          <canvas
            ref={canvasRef}
            className="w-full h-full"
          />
          
          {/* Centered icon and text overlay */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center bg-white/10 backdrop-blur-md p-4 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              {stage === 'analyzing' ? (
                <LoaderCircle className="animate-spin text-indigo-500" size={28} />
              ) : (
                <CircleDot className="animate-pulse text-indigo-500" size={28} />
              )}
            </div>
            <h3 className="text-lg font-medium text-indigo-900">{text}</h3>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="relative z-10">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-gray-700">AI Processing</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress 
            value={progress} 
            className={`h-3 bg-gradient-to-r ${color}`}
          />
        </div>
        
        {/* Stage indicators */}
        <div className="mt-8 grid grid-cols-4 gap-2">
          {['analyzing', 'checking', 'marking', 'finalizing'].map((s, i) => {
            const isActive = ['analyzing', 'checking', 'marking', 'finalizing'].indexOf(stage) >= i;
            const isPast = ['analyzing', 'checking', 'marking', 'finalizing'].indexOf(stage) > i;
            
            return (
              <div 
                key={s} 
                className={`flex flex-col items-center p-2 rounded-lg transition-all ${
                  isActive ? 'bg-indigo-50' : 'opacity-50'
                }`}
              >
                <div className={`rounded-full p-2 ${
                  isPast ? 'bg-indigo-100 text-indigo-600' : 
                  isActive ? 'bg-indigo-100 text-indigo-500 animate-pulse' : 
                  'bg-gray-100 text-gray-400'
                }`}>
                  {s === 'analyzing' && <Calculator size={16} />}
                  {s === 'checking' && <BookOpen size={16} />}
                  {s === 'marking' && <PenTool size={16} />}
                  {s === 'finalizing' && <GraduationCap size={16} />}
                </div>
                <span className="text-xs mt-1 capitalize">
                  {s}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ProcessingIndicator;
