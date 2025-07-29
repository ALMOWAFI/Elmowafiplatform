import React from 'react';
import { FamilyTreeFeature } from '@/features/family-tree/FamilyTreeFeature';

const TestFamilyTree = () => {
  return (
    <div className="min-h-screen p-8 bg-background">
      <h1 className="text-3xl font-bold mb-8 text-center">
        Elmowafy Family Tree Test Page
      </h1>
      <div className="max-w-7xl mx-auto">
        <FamilyTreeFeature />
      </div>
    </div>
  );
};

export default TestFamilyTree;
