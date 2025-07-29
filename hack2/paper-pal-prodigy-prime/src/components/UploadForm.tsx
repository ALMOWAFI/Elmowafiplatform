
import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, File, ArrowUp, Circle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UploadFormProps {
  onImageUploaded: (image: File) => void;
  isProcessing: boolean;
}

const UploadForm: React.FC<UploadFormProps> = ({ onImageUploaded, isProcessing }) => {
  const [dragActive, setDragActive] = useState(false);
  const [portalActive, setPortalActive] = useState(false);
  const [particles, setParticles] = useState<Array<{id: number, x: number, y: number, size: number, opacity: number, speed: number}>>([]);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  
  // Generate particles for the portal effect
  useEffect(() => {
    if (portalActive) {
      const newParticles = Array(25).fill(0).map((_, i) => ({
        id: i,
        x: 35 + Math.random() * 30,
        y: 35 + Math.random() * 30,
        size: 1 + Math.random() * 3,
        opacity: 0.3 + Math.random() * 0.7,
        speed: 0.5 + Math.random() * 1.5
      }));
      
      setParticles(newParticles);
    }
    
    return () => {
      setParticles([]);
    };
  }, [portalActive]);
  
  // Animate particles
  useEffect(() => {
    if (!portalActive || particles.length === 0) return;
    
    const interval = setInterval(() => {
      setParticles(prev => prev.map(particle => {
        // Circular motion
        const angle = Date.now() * 0.001 * particle.speed;
        const radius = 15 + particle.id % 3 * 5;
        const centerX = 50;
        const centerY = 50;
        
        return {
          ...particle,
          x: centerX + Math.cos(angle + particle.id) * radius,
          y: centerY + Math.sin(angle + particle.id) * radius,
          opacity: 0.3 + 0.7 * Math.sin(Date.now() * 0.002 + particle.id)
        };
      }));
    }, 50);
    
    return () => clearInterval(interval);
  }, [portalActive, particles]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
      setPortalActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
      setTimeout(() => setPortalActive(false), 1000);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    // Validate file type
    if (!file.type.match('image.*')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }
    
    // Animate portal closing with the paper
    setPortalActive(true);
    
    setTimeout(() => {
      onImageUploaded(file);
    }, 1500);
  };

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      setPortalActive(true);
      fileInputRef.current.click();
    }
  };

  const handleMouseEnter = () => {
    setPortalActive(true);
  };

  const handleMouseLeave = () => {
    if (!dragActive) {
      setTimeout(() => setPortalActive(false), 1000);
    }
  };

  return (
    <div 
      className={`p-6 rounded-lg border-2 border-dashed transition-all duration-500 w-full max-w-md mx-auto ${
        dragActive ? "border-primary bg-primary/10 scale-105" : portalActive ? "border-indigo-400 bg-indigo-400/5" : "border-gray-300"
      } overflow-hidden relative`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Portal effect */}
      <div 
        ref={portalRef} 
        className={`absolute inset-0 rounded-lg transition-all duration-1000 ${
          portalActive ? "opacity-100" : "opacity-0"
        }`}
        style={{
          background: `radial-gradient(circle, rgba(129,104,240,0.6) 0%, rgba(76,29,149,0.1) 70%, rgba(0,0,0,0) 100%)`,
          zIndex: 0,
        }}
      >
        {/* Particle effects */}
        {particles.map((particle) => (
          <div 
            key={particle.id}
            className="absolute rounded-full"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              opacity: particle.opacity,
              backgroundColor: 'white',
              boxShadow: `0 0 ${particle.size * 3}px ${particle.size}px rgba(255,255,255,${particle.opacity})`,
              zIndex: 1,
              transition: 'all 0.5s ease'
            }}
          />
        ))}
      </div>

      <div className="flex flex-col items-center justify-center space-y-6 relative z-10">
        <div 
          className={`rounded-full ${portalActive ? 'bg-indigo-600' : 'bg-primary/10'} p-6 transition-all duration-500 transform ${
            portalActive ? 'scale-110 shadow-lg shadow-indigo-500/50' : ''
          }`}
        >
          <div className={`relative transition-all duration-500 ${portalActive ? 'animate-bounce' : ''}`}>
            <Circle className={`h-8 w-8 absolute top-0 left-0 ${portalActive ? 'text-indigo-300 opacity-70' : 'opacity-0'} transform -translate-x-1 -translate-y-1 transition-all`} />
            <ArrowUp className={`h-10 w-10 ${portalActive ? 'text-white animate-pulse' : 'text-primary'}`} />
          </div>
        </div>
        <div className="text-center">
          <h3 className={`font-semibold text-xl transition-all duration-500 ${portalActive ? 'text-indigo-600' : 'text-gray-800'}`}>
            Share Your Math Journey
          </h3>
          <p className={`mt-2 transition-all duration-500 ${portalActive ? 'text-indigo-500' : 'text-gray-500'}`}>
            {portalActive ? "The AI is ready to receive your work..." : "Upload your assignment to begin analysis"}
          </p>
          <p className="text-xs text-gray-400 mt-1 transition-opacity duration-300" style={{opacity: portalActive ? 0 : 1}}>
            Supports: JPG, PNG, GIF (max 10MB)
          </p>
        </div>
        <div className="w-full relative z-10">
          <Input
            ref={fileInputRef}
            id="file-upload"
            type="file"
            accept="image/*"
            onChange={handleChange}
            className="hidden"
            disabled={isProcessing}
          />
          <Button
            onClick={handleButtonClick}
            variant={portalActive ? "default" : "outline"}
            className={`w-full transition-all duration-500 ${
              portalActive ? "bg-indigo-600 hover:bg-indigo-700 text-white" : ""
            }`}
            disabled={isProcessing}
          >
            <File className="mr-2 h-4 w-4" /> 
            {portalActive ? "Enter the Portal" : "Browse files"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UploadForm;
