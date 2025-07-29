import React from 'react';
import { TravelMemory } from '../memoryTypes';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MemoryCardProps {
  memory: TravelMemory;
}

const MemoryCard: React.FC<MemoryCardProps> = ({ memory }) => {
  return (
    <Card className="w-full overflow-hidden transition-all duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-2 flex flex-col">
      <CardHeader className="p-0 relative">
        <img 
          src={memory.photoGallery[0]} 
          alt={memory.title} 
          className="w-full h-56 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-0 left-0 p-4">
          <CardTitle className="text-2xl font-bold text-white tracking-tight">{memory.title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3">
          {memory.story}
        </p>
      </CardContent>
      <CardFooter className="p-4 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          <span>{memory.location.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          <span>{new Date(memory.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </CardFooter>
    </Card>
  );
};

export default MemoryCard;
