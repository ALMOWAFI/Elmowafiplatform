import React from 'react';
import { FamilyTreeView } from '@/features/family';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

// Sample data - replace with your actual data source
const sampleData = {
  members: [
    { id: '1', name: 'John Doe', birthDate: '1970-01-01' },
    { id: '2', name: 'Jane Smith', birthDate: '1975-05-15' },
    // Add more sample data as needed
  ],
  relationships: [
    // Define relationships between members
  ]
};

const TestFamilyTreePage: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Family Tree Visualization</h1>
        <div className="h-screen border rounded-lg p-4">
          <FamilyTreeView 
            defaultView="2d" 
            data={sampleData}
            onViewChange={(view) => console.log(`Switched to ${view} view`)}
          />
        </div>
      </div>
    </QueryClientProvider>
  );
};

export default TestFamilyTreePage;


