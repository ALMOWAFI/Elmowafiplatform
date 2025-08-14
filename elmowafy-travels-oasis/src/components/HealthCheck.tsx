import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { CheckCircle, XCircle, Clock, RefreshCw, Server, Database, Globe } from 'lucide-react';

// API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface HealthStatus {
  frontend: 'healthy' | 'unhealthy' | 'checking';
  backend: 'healthy' | 'unhealthy' | 'checking';
  database: 'healthy' | 'unhealthy' | 'checking';
  lastChecked: Date | null;
}

export default function HealthCheck() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>({
    frontend: 'checking',
    backend: 'checking',
    database: 'checking',
    lastChecked: null
  });

  const checkHealth = async () => {
    setHealthStatus(prev => ({
      ...prev,
      frontend: 'checking',
      backend: 'checking',
      database: 'checking'
    }));

    // Check frontend (always healthy if component is rendered)
    setHealthStatus(prev => ({
      ...prev,
      frontend: 'healthy'
    }));

    // Check backend
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/health`);
      if (response.ok) {
        setHealthStatus(prev => ({
          ...prev,
          backend: 'healthy'
        }));
      } else {
        setHealthStatus(prev => ({
          ...prev,
          backend: 'unhealthy'
        }));
      }
    } catch (error) {
      setHealthStatus(prev => ({
        ...prev,
        backend: 'unhealthy'
      }));
    }

    // Check database
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/health/db`);
      if (response.ok) {
        setHealthStatus(prev => ({
          ...prev,
          database: 'healthy'
        }));
      } else {
        setHealthStatus(prev => ({
          ...prev,
          database: 'unhealthy'
        }));
      }
    } catch (error) {
      setHealthStatus(prev => ({
        ...prev,
        database: 'unhealthy'
      }));
    }

    setHealthStatus(prev => ({
      ...prev,
      lastChecked: new Date()
    }));
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'unhealthy':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'checking':
        return <Clock className="w-4 h-4 text-yellow-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="default" className="bg-green-100 text-green-800">Healthy</Badge>;
      case 'unhealthy':
        return <Badge variant="destructive">Unhealthy</Badge>;
      case 'checking':
        return <Badge variant="secondary">Checking...</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getOverallStatus = () => {
    const { frontend, backend, database } = healthStatus;
    if (frontend === 'unhealthy' || backend === 'unhealthy' || database === 'unhealthy') {
      return 'unhealthy';
    }
    if (frontend === 'checking' || backend === 'checking' || database === 'checking') {
      return 'checking';
    }
    return 'healthy';
  };

  const overallStatus = getOverallStatus();

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5" />
          System Health Status
          <Button
            variant="outline"
            size="sm"
            onClick={checkHealth}
            className="ml-auto"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Status */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span className="font-medium">Overall System Status</span>
          <div className="flex items-center gap-2">
            {getStatusIcon(overallStatus)}
            {getStatusBadge(overallStatus)}
          </div>
        </div>

        {/* Individual Services */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-500" />
              <span>Frontend</span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(healthStatus.frontend)}
              {getStatusBadge(healthStatus.frontend)}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-purple-500" />
              <span>Backend API</span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(healthStatus.backend)}
              {getStatusBadge(healthStatus.backend)}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-green-500" />
              <span>Database</span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(healthStatus.database)}
              {getStatusBadge(healthStatus.database)}
            </div>
          </div>
        </div>

        {/* Last Checked */}
        {healthStatus.lastChecked && (
          <div className="text-sm text-muted-foreground text-center">
            Last checked: {healthStatus.lastChecked.toLocaleTimeString()}
          </div>
        )}

        {/* API URL Info */}
        <div className="text-xs text-muted-foreground text-center p-2 bg-gray-50 rounded">
          Backend API: {API_BASE_URL}
        </div>
      </CardContent>
    </Card>
  );
}
