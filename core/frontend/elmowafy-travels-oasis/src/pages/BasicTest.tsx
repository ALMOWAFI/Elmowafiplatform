import React from 'react';

/**
 * A minimal test page to verify that the React application is running properly
 * without any dependencies on complex components
 */
const BasicTest: React.FC = () => {
  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-6">
          Elmowafy Travel Platform - Basic Test Page
        </h1>
        
        <div className="bg-blue-50 rounded-lg p-6 mb-6">
          <p className="text-lg">
            If you can see this page, the basic React application is functioning properly.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-green-50 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-3">Application Working</h2>
            <p>
              This test page confirms that the core React application is rendering correctly.
              The issue with the blank page might be in specific components or data dependencies.
            </p>
          </div>
          
          <div className="bg-yellow-50 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-3">Next Steps</h2>
            <p>
              After confirming this page works, we can:
            </p>
            <ul className="list-disc ml-5 mt-2">
              <li>Gradually add components to identify which one is failing</li>
              <li>Check for missing dependencies in package.json</li>
              <li>Inspect browser console errors for specific issues</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BasicTest;
