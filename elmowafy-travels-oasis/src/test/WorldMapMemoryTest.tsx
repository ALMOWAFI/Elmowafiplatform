import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import WorldMap from '@/components/WorldMap';

/**
 * Test component to verify WorldMap integration with real family memory data
 * This shows the 3D interactive map with family travel locations
 */
export const WorldMapMemoryTest: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl">
              🌍 <span>Family Travel Map - Live Data Test</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• <strong>Connected to Live API:</strong> Shows real Al-Mowafi family memory locations</p>
              <p>• <strong>Interactive 3D Globe:</strong> Click and drag to rotate, scroll to zoom</p>
              <p>• <strong>Memory Markers:</strong> Pulsing spheres show family memory locations</p>
              <p>• <strong>Location Details:</strong> Click any marker to see family memories</p>
              <p>• <strong>Enhanced Locations:</strong> Dubai, Burj Khalifa, Hatta Mountains, JBR, and more</p>
            </div>
          </CardContent>
        </Card>
        
        {/* 3D World Map with Real Family Memory Data */}
        <Card className="border-purple-200">
          <CardHeader>
            <CardTitle>🗺️ Interactive Family Memory Map</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[600px] rounded-lg overflow-hidden">
              <WorldMap />
            </div>
          </CardContent>
        </Card>
        
        {/* Expected Results */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">✅ Expected Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold text-green-700 mb-2">Visible Locations:</h4>
                <ul className="space-y-1 text-green-600">
                  <li>• Dubai, UAE (multiple memories)</li>
                  <li>• Burj Khalifa (family trip)</li>
                  <li>• Hatta Mountains (hiking)</li>
                  <li>• JBR Beach (beach day)</li>
                  <li>• Dubai International Academy</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-green-700 mb-2">Interactive Features:</h4>
                <ul className="space-y-1 text-green-600">
                  <li>• Pulsing animated markers</li>
                  <li>• Hover effects with glow</li>
                  <li>• Click to see memory details</li>
                  <li>• Memory count indicators</li>
                  <li>• Bilingual Arabic/English support</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
        
      </div>
    </div>
  );
};