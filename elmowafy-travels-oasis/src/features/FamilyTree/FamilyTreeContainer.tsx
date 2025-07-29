import React, { useState, Suspense, lazy } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Eye, Layers3, Loader2, Zap } from 'lucide-react';
import FamilyTree from './FamilyTree';

// Lazy load heavy WebGL component
const WebGLFamilyTree = lazy(() => import('./WebGLFamilyTree').then(module => ({
  default: module.WebGLFamilyTree
})));

// Lazy load performance optimizations
const WebGLOptimizations = lazy(() => import('./WebGLOptimizations'));

interface FamilyTreeContainerProps {
  familyData?: any;
  onMemberSelect?: (member: any) => void;
}

export const FamilyTreeContainer: React.FC<FamilyTreeContainerProps> = ({
  familyData,
  onMemberSelect
}) => {
  const [view, setView] = useState<'2d' | '3d'>('2d');
  const [webglLoaded, setWebglLoaded] = useState(false);
  const [optimizationsEnabled, setOptimizationsEnabled] = useState(true);

  // Track bundle loading performance
  const handleWebGLLoad = () => {
    setWebglLoaded(true);
    console.log('WebGL component loaded dynamically');
  };

  // Preload WebGL component when user hovers over 3D tab
  const preloadWebGL = () => {
    if (!webglLoaded) {
      import('./WebGLFamilyTree').then(() => {
        setWebglLoaded(true);
      });
    }
  };

  // WebGL Loading Fallback
  const WebGLLoadingFallback = () => (
    <Card className="min-h-[600px] flex items-center justify-center">
      <CardContent className="text-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <div>
            <h3 className="text-lg font-semibold">Loading 3D Family Tree</h3>
            <p className="text-sm text-gray-600 mt-1">
              Initializing WebGL renderer and loading 3D assets...
            </p>
            <div className="flex items-center justify-center mt-2 space-x-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="text-xs text-gray-500">Dynamically loaded for optimal performance</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Error Boundary for WebGL
  const WebGLErrorBoundary = ({ children }: { children: React.ReactNode }) => {
    const [hasError, setHasError] = useState(false);

    React.useEffect(() => {
      const handleError = () => setHasError(true);
      window.addEventListener('error', handleError);
      return () => window.removeEventListener('error', handleError);
    }, []);

    if (hasError) {
      return (
        <Card className="min-h-[600px] flex items-center justify-center">
          <CardContent className="text-center">
            <div className="flex flex-col items-center space-y-4">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <div>
                <h3 className="text-lg font-semibold">WebGL Not Available</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Your browser doesn't support WebGL or it's disabled.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                  onClick={() => setView('2d')}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Switch to 2D View
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return <>{children}</>;
  };

  return (
    <div className="space-y-6">
      {/* Header with view controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CardTitle className="flex items-center space-x-2">
                <Layers3 className="h-6 w-6" />
                <span>Family Tree Visualization</span>
              </CardTitle>
              
              {view === '3d' && (
                <Badge variant="outline" className="text-purple-600">
                  <Zap className="h-3 w-3 mr-1" />
                  WebGL Accelerated
                </Badge>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant={view === '2d' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView('2d')}
              >
                <Eye className="h-4 w-4 mr-2" />
                2D View
              </Button>
              
              <Button
                variant={view === '3d' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView('3d')}
                onMouseEnter={preloadWebGL}
              >
                <Layers3 className="h-4 w-4 mr-2" />
                3D View
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Family Tree Content */}
      <Tabs value={view} onValueChange={(value) => setView(value as '2d' | '3d')}>
        <TabsList className="hidden" /> {/* Hide tabs since we have custom buttons */}
        
        <TabsContent value="2d">
          <FamilyTree 
            familyData={familyData}
            onMemberSelect={onMemberSelect}
          />
        </TabsContent>
        
        <TabsContent value="3d">
          <WebGLErrorBoundary>
            <Suspense fallback={<WebGLLoadingFallback />}>
              <WebGLFamilyTree
                familyData={familyData}
                onMemberSelect={onMemberSelect}
                onLoad={handleWebGLLoad}
                optimizationsEnabled={optimizationsEnabled}
              />
              
              {/* Optional: Load optimizations */}
              {optimizationsEnabled && (
                <Suspense fallback={null}>
                  <WebGLOptimizations />
                </Suspense>
              )}
            </Suspense>
          </WebGLErrorBoundary>
        </TabsContent>
      </Tabs>

      {/* Performance Info */}
      {view === '3d' && webglLoaded && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4 text-green-500" />
                <span>3D rendering active with hardware acceleration</span>
              </div>
              
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={optimizationsEnabled}
                    onChange={(e) => setOptimizationsEnabled(e.target.checked)}
                    className="rounded"
                  />
                  <span>Performance optimizations</span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FamilyTreeContainer; 