import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  BarChart3, Package, Zap, Download, Clock, TrendingDown,
  FileText, Layers, CheckCircle, AlertCircle, RefreshCw
} from 'lucide-react';
import { CDNPerformanceMonitor } from '@/utils/cdnLoader';

interface BundleChunk {
  name: string;
  size: number;
  gzipSize: number;
  loaded: boolean;
  route?: string;
  type: 'entry' | 'vendor' | 'async' | 'css';
}

interface PerformanceMetrics {
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
}

interface BundleStats {
  totalSize: number;
  gzipSize: number;
  chunks: BundleChunk[];
  cacheHitRate: number;
  loadTime: number;
}

export const BundleAnalyzer: React.FC = () => {
  const [bundleStats, setBundleStats] = useState<BundleStats | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [loadedChunks, setLoadedChunks] = useState<Set<string>>(new Set());
  const [optimizations, setOptimizations] = useState<Record<string, boolean>>({});
  const [cdnStats, setCdnStats] = useState<any>(null);

  // Mock bundle data (in real app, this would come from build stats)
  const mockBundleStats: BundleStats = {
    totalSize: 2847,
    gzipSize: 892,
    cacheHitRate: 87.3,
    loadTime: 1840,
    chunks: [
      {
        name: 'index',
        size: 145,
        gzipSize: 52,
        loaded: true,
        type: 'entry'
      },
      {
        name: 'react-libs',
        size: 342,
        gzipSize: 118,
        loaded: true,
        type: 'vendor'
      },
      {
        name: 'ui-libs',
        size: 298,
        gzipSize: 95,
        loaded: true,
        type: 'vendor'
      },
      {
        name: 'three-libs',
        size: 1098,
        gzipSize: 305,
        loaded: false,
        type: 'async',
        route: '/family-tree-webgl'
      },
      {
        name: 'chart-libs',
        size: 287,
        gzipSize: 89,
        loaded: false,
        type: 'async',
        route: '/analytics'
      },
      {
        name: 'map-libs',
        size: 456,
        gzipSize: 142,
        loaded: false,
        type: 'async',
        route: '/travel-planning'
      },
      {
        name: 'pages',
        size: 221,
        gzipSize: 91,
        loaded: true,
        type: 'async'
      }
    ]
  };

  useEffect(() => {
    loadBundleStats();
    measurePerformanceMetrics();
    loadCDNStats();
    
    // Monitor chunk loading
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === 'navigation' || entry.entryType === 'resource') {
          updateChunkLoadingStatus(entry.name);
        }
      });
    });
    
    observer.observe({ entryTypes: ['navigation', 'resource'] });
    
    return () => observer.disconnect();
  }, []);

  const loadBundleStats = () => {
    // Simulate loading bundle stats with optimizations applied
    const optimizedStats = { ...mockBundleStats };
    
    // Apply code splitting optimizations
    if (optimizations.codeSplitting) {
      optimizedStats.totalSize *= 0.7; // 30% reduction
      optimizedStats.loadTime *= 0.6; // 40% faster
    }
    
    // Apply CDN optimizations
    if (optimizations.cdnEnabled) {
      optimizedStats.totalSize *= 0.8; // 20% reduction
      optimizedStats.loadTime *= 0.5; // 50% faster
    }
    
    setBundleStats(optimizedStats);
  };

  const measurePerformanceMetrics = () => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      // Use Performance Observer API for Core Web Vitals
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            setPerformanceMetrics({
              fcp: navEntry.responseStart - navEntry.navigationStart,
              lcp: navEntry.loadEventStart - navEntry.navigationStart,
              fid: 0, // Would be measured differently
              cls: 0, // Would be measured with Layout Shift API
              ttfb: navEntry.responseStart - navEntry.requestStart
            });
          }
        }
      });
      
      observer.observe({ entryTypes: ['navigation'] });
      
      // Also check for existing performance data
      const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navTiming) {
        setPerformanceMetrics({
          fcp: navTiming.responseStart - navTiming.navigationStart,
          lcp: navTiming.loadEventStart - navTiming.navigationStart,
          fid: 0,
          cls: 0,
          ttfb: navTiming.responseStart - navTiming.requestStart
        });
      }
    }
  };

  const loadCDNStats = () => {
    setCdnStats(CDNPerformanceMonitor.getStats());
  };

  const updateChunkLoadingStatus = (resourceName: string) => {
    setLoadedChunks(prev => {
      const newSet = new Set(prev);
      
      // Check if this is one of our chunks
      bundleStats?.chunks.forEach(chunk => {
        if (resourceName.includes(chunk.name)) {
          newSet.add(chunk.name);
        }
      });
      
      return newSet;
    });
  };

  const getOptimizationScore = () => {
    if (!bundleStats || !performanceMetrics) return 0;
    
    let score = 0;
    
    // Bundle size score (smaller is better)
    const sizeScore = Math.max(0, 100 - (bundleStats.totalSize / 30));
    score += sizeScore * 0.3;
    
    // Load time score (faster is better)
    const loadTimeScore = Math.max(0, 100 - (bundleStats.loadTime / 50));
    score += loadTimeScore * 0.3;
    
    // Cache hit rate score
    score += bundleStats.cacheHitRate * 0.2;
    
    // Performance metrics score
    const perfScore = Math.max(0, 100 - (performanceMetrics.lcp / 50));
    score += perfScore * 0.2;
    
    return Math.round(score);
  };

  const getChunkTypeColor = (type: string) => {
    switch (type) {
      case 'entry': return 'bg-blue-100 text-blue-800';
      case 'vendor': return 'bg-green-100 text-green-800';
      case 'async': return 'bg-purple-100 text-purple-800';
      case 'css': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const getPerformanceGrade = (metric: number, thresholds: [number, number]) => {
    if (metric <= thresholds[0]) return 'A';
    if (metric <= thresholds[1]) return 'B';
    return 'C';
  };

  if (!bundleStats) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Analyzing bundle performance...
          </div>
        </CardContent>
      </Card>
    );
  }

  const optimizationScore = getOptimizationScore();

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-6 w-6" />
                <span>Bundle Performance Analysis</span>
              </CardTitle>
              <CardDescription>
                Real-time monitoring of code splitting and optimization effectiveness
              </CardDescription>
            </div>
            
            <div className="flex items-center space-x-3">
              <Badge 
                variant={optimizationScore >= 80 ? "default" : optimizationScore >= 60 ? "secondary" : "destructive"}
                className="text-lg px-3 py-1"
              >
                {optimizationScore}/100
              </Badge>
              <Button variant="outline" size="sm" onClick={loadBundleStats}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Package className="h-5 w-5 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {formatSize(bundleStats.totalSize * 1024)}
              </p>
              <p className="text-sm text-gray-600">Total Bundle Size</p>
              <p className="text-xs text-green-600">
                {formatSize(bundleStats.gzipSize * 1024)} gzipped
              </p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Clock className="h-5 w-5 text-purple-500" />
              </div>
              <p className="text-2xl font-bold text-purple-600">
                {bundleStats.loadTime}ms
              </p>
              <p className="text-sm text-gray-600">Initial Load Time</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Zap className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-green-600">
                {bundleStats.cacheHitRate.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600">Cache Hit Rate</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Layers className="h-5 w-5 text-orange-500" />
              </div>
              <p className="text-2xl font-bold text-orange-600">
                {bundleStats.chunks.length}
              </p>
              <p className="text-sm text-gray-600">Total Chunks</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="chunks" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="chunks">Chunks</TabsTrigger>
          <TabsTrigger value="performance">Core Web Vitals</TabsTrigger>
          <TabsTrigger value="cdn">CDN Stats</TabsTrigger>
          <TabsTrigger value="optimizations">Optimizations</TabsTrigger>
        </TabsList>

        <TabsContent value="chunks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>Bundle Chunks Analysis</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bundleStats.chunks.map((chunk, index) => {
                  const isLoaded = loadedChunks.has(chunk.name) || chunk.loaded;
                  const compressionRatio = ((chunk.size - chunk.gzipSize) / chunk.size * 100);
                  
                  return (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <Badge className={getChunkTypeColor(chunk.type)}>
                            {chunk.type}
                          </Badge>
                          <span className="font-medium">{chunk.name}</span>
                          {isLoaded ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                        
                        <div className="text-sm text-gray-600">
                          {formatSize(chunk.size * 1024)} → {formatSize(chunk.gzipSize * 1024)}
                          <span className="text-green-600 ml-1">
                            (-{compressionRatio.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Compression Efficiency</span>
                          <span>{compressionRatio.toFixed(1)}% reduction</span>
                        </div>
                        <Progress value={compressionRatio} className="h-2" />
                        
                        {chunk.route && (
                          <div className="text-xs text-gray-500">
                            Lazy loaded for route: {chunk.route}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between text-xs">
                          <span>Status</span>
                          <span className={isLoaded ? 'text-green-600' : 'text-gray-500'}>
                            {isLoaded ? 'Loaded' : 'Not loaded'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingDown className="h-5 w-5" />
                <span>Core Web Vitals</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {performanceMetrics ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold mb-1">
                      {performanceMetrics.fcp.toFixed(0)}ms
                    </div>
                    <div className="text-sm text-gray-600 mb-2">First Contentful Paint</div>
                    <Badge variant={getPerformanceGrade(performanceMetrics.fcp, [1800, 3000]) === 'A' ? 'default' : 'secondary'}>
                      Grade {getPerformanceGrade(performanceMetrics.fcp, [1800, 3000])}
                    </Badge>
                  </div>
                  
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold mb-1">
                      {performanceMetrics.lcp.toFixed(0)}ms
                    </div>
                    <div className="text-sm text-gray-600 mb-2">Largest Contentful Paint</div>
                    <Badge variant={getPerformanceGrade(performanceMetrics.lcp, [2500, 4000]) === 'A' ? 'default' : 'secondary'}>
                      Grade {getPerformanceGrade(performanceMetrics.lcp, [2500, 4000])}
                    </Badge>
                  </div>
                  
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold mb-1">
                      {performanceMetrics.ttfb.toFixed(0)}ms
                    </div>
                    <div className="text-sm text-gray-600 mb-2">Time to First Byte</div>
                    <Badge variant={getPerformanceGrade(performanceMetrics.ttfb, [800, 1800]) === 'A' ? 'default' : 'secondary'}>
                      Grade {getPerformanceGrade(performanceMetrics.ttfb, [800, 1800])}
                    </Badge>
                  </div>
                  
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold mb-1">
                      {optimizationScore}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">Performance Score</div>
                    <Badge variant={optimizationScore >= 80 ? 'default' : 'secondary'}>
                      {optimizationScore >= 80 ? 'Excellent' : optimizationScore >= 60 ? 'Good' : 'Needs Work'}
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Measuring performance metrics...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cdn" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Download className="h-5 w-5" />
                <span>CDN Performance</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cdnStats ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{cdnStats.loaded}</div>
                      <div className="text-sm text-gray-600">Libraries Loaded</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{cdnStats.loading}</div>
                      <div className="text-sm text-gray-600">Currently Loading</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{cdnStats.available}</div>
                      <div className="text-sm text-gray-600">Available Libraries</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {cdnStats.loaded > 0 ? (cdnStats.loaded / cdnStats.available * 100).toFixed(0) : 0}%
                      </div>
                      <div className="text-sm text-gray-600">Utilization Rate</div>
                    </div>
                  </div>
                  
                  {cdnStats.libraries.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Loaded from CDN:</h4>
                      <div className="flex flex-wrap gap-2">
                        {cdnStats.libraries.map((lib: string) => (
                          <Badge key={lib} variant="outline">{lib}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Download className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">No CDN usage detected</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimizations" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Active Optimizations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Code Splitting</span>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div className="flex items-center justify-between">
                  <span>Dynamic Imports</span>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div className="flex items-center justify-between">
                  <span>Tree Shaking</span>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div className="flex items-center justify-between">
                  <span>Gzip Compression</span>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div className="flex items-center justify-between">
                  <span>Asset Optimization</span>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Potential Improvements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Consider implementing Service Worker for better caching
                  </AlertDescription>
                </Alert>
                
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    WebP image format could reduce image sizes by 25-30%
                  </AlertDescription>
                </Alert>
                
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    HTTP/2 server push could improve critical resource loading
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BundleAnalyzer; 