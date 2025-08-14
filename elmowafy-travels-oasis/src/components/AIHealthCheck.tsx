import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { RefreshCw, Activity, Zap } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://elmowafiplatform-production.up.railway.app';

interface AIHealthStatus {
  status: 'connected' | 'disconnected' | 'error';
  ai_service?: {
    service: string;
    status: string;
    services: {
      memory_processor: string;
      travel_ai: string;
    };
  };
  message?: string;
}

export const AIHealthCheck: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<AIHealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkAIHealth = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/ai/health`);
      const data = await response.json();
      setHealthStatus(data);
    } catch (error) {
      setHealthStatus({
        status: 'error',
        message: 'Failed to connect to backend'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAIHealth();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
      case 'healthy':
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'disconnected':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4" />
          AI Service Status
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={checkAIHealth}
          disabled={isLoading}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {healthStatus ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Backend Connection:</span>
              <Badge className={getStatusColor(healthStatus.status)}>
                {healthStatus.status}
              </Badge>
            </div>
            
            {healthStatus.ai_service && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">AI Service:</span>
                  <Badge className={getStatusColor(healthStatus.ai_service.status)}>
                    {healthStatus.ai_service.status}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Memory Processor:</span>
                    <Badge variant="outline" className={getStatusColor(healthStatus.ai_service.services.memory_processor)}>
                      {healthStatus.ai_service.services.memory_processor}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Travel AI:</span>
                    <Badge variant="outline" className={getStatusColor(healthStatus.ai_service.services.travel_ai)}>
                      {healthStatus.ai_service.services.travel_ai}
                    </Badge>
                  </div>
                </div>
              </>
            )}
            
            {healthStatus.message && (
              <div className="text-xs text-gray-500 mt-2">
                {healthStatus.message}
              </div>
            )}
            
            {healthStatus.status === 'connected' && (
              <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 p-2 rounded">
                <Zap className="h-3 w-3" />
                AI-powered photo analysis ready!
              </div>
            )}
          </>
        ) : (
          <div className="text-sm text-gray-500">
            Loading AI service status...
          </div>
        )}
      </CardContent>
    </Card>
  );
};