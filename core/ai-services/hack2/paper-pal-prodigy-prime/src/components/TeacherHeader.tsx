
import React from 'react';
import { Pencil, GraduationCap, BookOpen, Calendar, Clock, Award } from 'lucide-react';
import { Button } from "@/components/ui/button";

const TeacherHeader = () => {
  return (
    <header className="w-full text-white shadow-lg relative">
      {/* Paper texture background */}
      <div 
        className="absolute inset-0 bg-primary opacity-90 z-0"
        style={{
          backgroundImage: "url('/paper-texture.png')",
          backgroundBlendMode: "multiply",
          backgroundSize: "cover"
        }}
      />
      
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between relative z-10 p-6">
        <div className="flex items-center mb-4 md:mb-0">
          <div className="bg-white rounded-full p-2 mr-3">
            <GraduationCap className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Math Teacher Assistant</h1>
            <p className="text-xs text-white/80 hidden md:block">Grade papers with precision and insightful feedback</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center justify-center md:justify-end">
          <Button variant="ghost" className="flex items-center bg-white/10 hover:bg-white/20">
            <BookOpen className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Smart Grading</span>
          </Button>
          
          <Button variant="ghost" className="flex items-center bg-white/10 hover:bg-white/20">
            <Pencil className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Feedback</span>
          </Button>
          
          <Button variant="ghost" className="flex items-center bg-white/10 hover:bg-white/20">
            <Award className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Analytics</span>
          </Button>
          
          <Button variant="ghost" className="flex items-center bg-white/10 hover:bg-white/20">
            <Calendar className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">History</span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default TeacherHeader;
