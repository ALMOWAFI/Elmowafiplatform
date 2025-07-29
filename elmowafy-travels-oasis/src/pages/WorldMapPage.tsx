import React from 'react';
import Globe from '@/features/world-map/components/Globe';

const WorldMapPage: React.FC = () => {
  return (
    <div className="relative w-full h-screen bg-slate-900">
      <header className="absolute top-8 left-1/2 -translate-x-1/2 z-10 text-center">
        <h1 className="text-5xl font-extrabold text-white tracking-tight">The Elmowafy World</h1>
        <p className="text-xl text-slate-400 mt-2">Explore our family's journey across the globe</p>
      </header>
      <Globe />
    </div>
  );
};

export default WorldMapPage;
