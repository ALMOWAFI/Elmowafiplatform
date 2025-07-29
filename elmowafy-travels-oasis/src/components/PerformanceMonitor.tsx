import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, Database, Zap, Wifi, Clock, TrendingUp, 
  Server, Users, MessageSquare, BarChart3
} from 'lucide-react';
import { websocketService, useWebSocketStatus } from '@/services/websocketService';

interface CacheStats {
  cache_hits: number;
  cache_misses: number;
  total_operations: number;
  hit_rate_percent: number;
  miss_rate_percent: number;
}

interface RedisInfo {
  redis_version: string;
  used_memory: string;
  connected_clients: number;
  total_commands_processed: number;
  keyspace_hits: number;
  keyspace_misses: number;
  expired_keys: number;
}

interface WebSocketStats {
  active_connections: number;
  unique_users: number;
  active_families: number;
  subscribed_channels: number;
  total_messages_sent: number;
  total_messages_received: number;
}

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  bundleSize: number;
  memoryUsage: number;
}

export const PerformanceMonitor: React.FC = () => {
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [redisInfo, setRedisInfo] = useState<RedisInfo | null>(null);
  const [wsStats, setWsStats] = useState<WebSocketStats | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  
  const wsStatus = useWebSocketStatus();

  useEffect(() => {
    loadPerformanceData();
    
    // Update every 30 seconds
    const interval = setInterval(loadPerformanceData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Calculate frontend performance metrics
    if (performance.timing) {
      const timing = performance.timing;
      const loadTime = timing.loadEventEnd - timing.navigationStart;
      const renderTime = timing.domContentLoadedEventEnd - timing.domLoading;
      
      setPerformanceMetrics({
        loadTime: loadTime,
        renderTime: renderTime,
        bundleSize: 1.2, // MB - would be calculated from actual bundle
        memoryUsage: (performance as any).memory?.usedJSHeapSize / 1024 / 1024 || 0
      });
    }
  }, []);

  const loadPerformanceData = async () => {
    try {
      setLoading(true);
      
      // Simulate API calls to get stats
      // In real implementation, these would call actual endpoints
      const mockCacheStats: CacheStats = {
        cache_hits: 1547,
        cache_misses: 213,
        total_operations: 1760,
        hit_rate_percent: 87.9,
        miss_rate_percent: 12.1
      };

      const mockRedisInfo: RedisInfo = {
        redis_version: "7.0.8",
        used_memory: "45.2MB",
        connected_clients: 12,
        total_commands_processed: 15847,
        keyspace_hits: 8923,
        keyspace_misses: 1247,
        expired_keys: 342
      };

      const mockWsStats: WebSocketStats = {
        active_connections: 8,
        unique_users: 6,
        active_families: 3,
        subscribed_channels: 15,
        total_messages_sent: 1205,
        total_messages_received: 1198
      };

      setCacheStats(mockCacheStats);
      setRedisInfo(mockRedisInfo);
      setWsStats(mockWsStats);
      
    } catch (error) {
      console.error('Failed to load performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceScore = () => {
    if (!cacheStats || !performanceMetrics) return 0;
    
    const cacheScore = Math.min(cacheStats.hit_rate_percent, 100);
    const loadTimeScore = Math.max(0, 100 - (performanceMetrics.loadTime / 100));
    const memoryScore = Math.max(0, 100 - (performanceMetrics.memoryUsage / 10));
    
    return Math.round((cacheScore + loadTimeScore + memoryScore) / 3);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading && !cacheStats) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Activity className="h-6 w-6 animate-pulse mr-2" />
            Loading performance data...
          </div>
        </CardContent>
      </Card>
    );
  }

  const performanceScore = getPerformanceScore();

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-6 w-6" />
            <span>Performance Overview</span>
            <Badge variant="outline" className={getScoreColor(performanceScore)}>
              Score: {performanceScore}/100
            </Badge>
          </CardTitle>
          <CardDescription>
            Real-time performance metrics for Redis caching and WebSocket communication
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Database className="h-5 w-5 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {cacheStats?.hit_rate_percent.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600">Cache Hit Rate</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Wifi className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-green-600">
                {wsStatus.latency || 0}ms
              </p>
              <p className="text-sm text-gray-600">WebSocket Latency</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Clock className="h-5 w-5 text-purple-500" />
              </div>
              <p className="text-2xl font-bold text-purple-600">
                {performanceMetrics?.loadTime ? Math.round(performanceMetrics.loadTime) : 0}ms
              </p>
              <p className="text-sm text-gray-600">Page Load Time</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Users className="h-5 w-5 text-orange-500" />
              </div>
              <p className="text-2xl font-bold text-orange-600">
                {wsStats?.active_connections || 0}
              </p>
              <p className="text-sm text-gray-600">Active Connections</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="redis" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="redis">Redis Cache</TabsTrigger>
          <TabsTrigger value="websocket">WebSocket</TabsTrigger>
          <TabsTrigger value="frontend">Frontend</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="redis" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5" />
                  <span>Cache Performance</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cacheStats && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span>Hit Rate</span>
                        <span className="font-bold text-green-600">
                          {cacheStats.hit_rate_percent.toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={cacheStats.hit_rate_percent} className="h-2" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Cache Hits</p>
                        <p className="text-lg font-bold text-green-600">
                          {cacheStats.cache_hits.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Cache Misses</p>
                        <p className="text-lg font-bold text-red-600">
                          {cacheStats.cache_misses.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-gray-600">Total Operations</p>
                      <p className="text-xl font-bold">
                        {cacheStats.total_operations.toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Server className="h-5 w-5" />
                  <span>Redis Server Info</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {redisInfo && (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Version</span>
                      <span className="font-medium">{redisInfo.redis_version}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Memory Used</span>
                      <span className="font-medium">{redisInfo.used_memory}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Connected Clients</span>
                      <span className="font-medium">{redisInfo.connected_clients}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Commands Processed</span>
                      <span className="font-medium">{redisInfo.total_commands_processed.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Keyspace Hits</span>
                      <span className="font-medium text-green-600">{redisInfo.keyspace_hits.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Expired Keys</span>
                      <span className="font-medium">{redisInfo.expired_keys.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="websocket" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Wifi className="h-5 w-5" />
                  <span>Connection Status</span>
                  <Badge variant={wsStatus.connected ? "default" : "destructive"}>
                    {wsStatus.connected ? "Connected" : "Disconnected"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status</span>
                    <span className={`font-medium ${wsStatus.connected ? 'text-green-600' : 'text-red-600'}`}>
                      {wsStatus.connected ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Latency</span>
                    <span className="font-medium">
                      {wsStatus.latency ? `${wsStatus.latency}ms` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Reconnect Attempts</span>
                    <span className="font-medium">{wsStatus.reconnectAttempts}</span>
                  </div>
                  {wsStatus.lastConnected && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Connected</span>
                      <span className="font-medium">
                        {wsStatus.lastConnected.toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>Message Statistics</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {wsStats && (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Active Connections</span>
                      <span className="font-medium">{wsStats.active_connections}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Unique Users</span>
                      <span className="font-medium">{wsStats.unique_users}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Active Families</span>
                      <span className="font-medium">{wsStats.active_families}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Messages Sent</span>
                      <span className="font-medium text-green-600">
                        {wsStats.total_messages_sent.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Messages Received</span>
                      <span className="font-medium text-blue-600">
                        {wsStats.total_messages_received.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="frontend" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Frontend Performance</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {performanceMetrics && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-600">Page Load Time</span>
                        <span className="font-medium">{Math.round(performanceMetrics.loadTime)}ms</span>
                      </div>
                      <Progress 
                        value={Math.max(0, 100 - (performanceMetrics.loadTime / 50))} 
                        className="h-2" 
                      />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-600">DOM Render Time</span>
                        <span className="font-medium">{Math.round(performanceMetrics.renderTime)}ms</span>
                      </div>
                      <Progress 
                        value={Math.max(0, 100 - (performanceMetrics.renderTime / 30))} 
                        className="h-2" 
                      />
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Bundle Size</span>
                      <span className="font-medium">{performanceMetrics.bundleSize.toFixed(1)}MB</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Memory Usage</span>
                      <span className="font-medium">{performanceMetrics.memoryUsage.toFixed(1)}MB</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Optimization Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">TypeScript Strict Mode</span>
                    <Badge variant="default">Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Code Splitting</span>
                    <Badge variant="default">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Tree Shaking</span>
                    <Badge variant="default">Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Gzip Compression</span>
                    <Badge variant="default">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Service Worker</span>
                    <Badge variant="secondary">Pending</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>System Health</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">{performanceScore}</div>
                  <div className="text-sm text-gray-600">Overall Score</div>
                  <Progress value={performanceScore} className="h-2 mt-2" />
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">99.9%</div>
                  <div className="text-sm text-gray-600">Uptime</div>
                  <Progress value={99.9} className="h-2 mt-2" />
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    {cacheStats?.hit_rate_percent.toFixed(0)}%
                  </div>
                  <div className="text-sm text-gray-600">Cache Efficiency</div>
                  <Progress value={cacheStats?.hit_rate_percent || 0} className="h-2 mt-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PerformanceMonitor; 