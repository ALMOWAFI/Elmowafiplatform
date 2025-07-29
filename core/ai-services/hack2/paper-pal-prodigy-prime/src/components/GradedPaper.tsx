
import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

interface FeedbackItem {
  id: number;
  x: number;
  y: number;
  type: 'error' | 'correct' | 'partial';
  message: string;
}

interface GradedPaperProps {
  originalImage: string;
  grade: string; 
  feedback: string;
  markings: FeedbackItem[];
}

const GradedPaper: React.FC<GradedPaperProps> = ({
  originalImage,
  grade,
  feedback,
  markings
}) => {
  const { toast } = useToast();
  const [showMarkings, setShowMarkings] = useState(false);
  const [showGrade, setShowGrade] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    // Simulate the teacher grading process with animations
    const timer1 = setTimeout(() => setShowMarkings(true), 500);
    const timer2 = setTimeout(() => setShowGrade(true), 1500);
    const timer3 = setTimeout(() => setShowFeedback(true), 2500);
    
    toast({
      title: "Grading in progress...",
      description: "Your math teacher is reviewing your work"
    });
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [toast]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card className="overflow-hidden shadow-lg">
        <div className="relative paper-bg">
          {/* The original image */}
          <img 
            src={originalImage} 
            alt="Graded paper" 
            className="w-full h-auto"
          />
          
          {/* Overlay markings */}
          {showMarkings && markings.map((mark) => (
            <div 
              key={mark.id}
              className={`absolute animate-circle opacity-0 ${
                mark.type === 'error' ? 'teacher-circle' :
                mark.type === 'correct' ? 'border-2 border-green-500 rounded-full' :
                'border-2 border-orange-500 rounded-full'
              }`}
              style={{
                left: `${mark.x}%`,
                top: `${mark.y}%`,
                width: '30px',
                height: '30px',
                animationDelay: `${(mark.id * 0.2) + 0.5}s`
              }}
            >
              {mark.message && (
                <div className="absolute handwritten text-sm bg-white p-1 rounded shadow-sm -mt-8 -ml-4 text-teacher-red max-w-[120px] opacity-0 animate-circle" style={{animationDelay: `${(mark.id * 0.2) + 0.8}s`}}>
                  {mark.message}
                </div>
              )}
            </div>
          ))}
          
          {/* Grade */}
          {showGrade && (
            <div className="absolute top-4 right-4 opacity-0 animate-grade">
              <Badge className="text-3xl px-4 py-2 bg-teacher-red text-white font-bold handwritten">
                {grade}
              </Badge>
            </div>
          )}
        </div>
        
        {/* Feedback section */}
        {showFeedback && (
          <div className="p-6 border-t">
            <h3 className="text-xl font-semibold mb-2 text-teacher-darkblue">Teacher Feedback</h3>
            <div className="handwritten text-lg text-gray-700 bg-teacher-paper p-4 rounded border border-gray-200">
              <p className="w-0 whitespace-nowrap overflow-hidden animate-writing">
                {feedback}
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default GradedPaper;
