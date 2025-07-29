// Lightweight Performance Monitoring for Bundle Optimization
// Focused on Core Web Vitals and bundle performance tracking

interface PerformanceMetric {
  name: string;
  value: number;
  id: string;
  timestamp: number;
}

interface BundleMetrics {
  loadTime: number;
  domContentLoaded: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  timeToFirstByte: number;
}

// Global performance store
const performanceStore: PerformanceMetric[] = [];

// Initialize monitoring without external dependencies
export const initializeMonitoring = () => {
  console.log('🔍 Performance monitoring initialized (lightweight mode)');
  
  // Track initial load performance
  if (typeof window !== 'undefined') {
    trackWebVitals();
    trackCustomMetrics();
    trackMemoryUsage();
    trackBundleSize();
  }
};

// Web Vitals tracking using native Performance Observer API
export const trackWebVitals = () => {
  const sendToAnalytics = ({ name, value, id }: { name: string; value: number; id: string }) => {
    const metric: PerformanceMetric = {
      name,
      value,
      id,
      timestamp: Date.now()
    };
    
    performanceStore.push(metric);
    console.log(`📊 Performance Metric: ${name}`, { value: Math.round(value), id });
    
    // Send to analytics endpoint if available
    fetch('/api/analytics/vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metric),
    }).catch(() => {
      // Silently fail if analytics endpoint not available
    });
  };

  // Use Performance Observer for Core Web Vitals
  if ('PerformanceObserver' in window) {
    try {
      // First Contentful Paint
      const fcpObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            sendToAnalytics({
              name: 'FCP',
              value: entry.startTime,
              id: 'v1-' + Date.now()
            });
          }
        }
      });
      fcpObserver.observe({ entryTypes: ['paint'] });

      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        sendToAnalytics({
          name: 'LCP',
          value: lastEntry.startTime,
          id: 'v1-' + Date.now()
        });
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // Navigation timing for TTFB
      const navObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          const navEntry = entry as PerformanceNavigationTiming;
          sendToAnalytics({
            name: 'TTFB',
            value: navEntry.responseStart - navEntry.requestStart,
            id: 'v1-' + Date.now()
          });
        }
      });
      navObserver.observe({ entryTypes: ['navigation'] });

    } catch (error) {
      console.warn('Performance Observer not fully supported:', error);
    }
  }
};

// Custom performance tracking for app-specific metrics
export const trackCustomMetrics = () => {
  // Track chunk loading performance
  const chunkLoadTimes = new Map<string, number>();
  
  if ('PerformanceObserver' in window) {
    const resourceObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        const resource = entry as PerformanceResourceTiming;
        
        // Track JavaScript chunks
        if (resource.name.includes('.js') && resource.name.includes('assets')) {
          const chunkName = resource.name.split('/').pop() || 'unknown';
          const loadTime = resource.responseEnd - resource.requestStart;
          
          chunkLoadTimes.set(chunkName, loadTime);
          console.log(`📦 Chunk loaded: ${chunkName} (${Math.round(loadTime)}ms)`);
          
          // Track slow chunk loads
          if (loadTime > 1000) {
            reportPerformanceIssue('slow_chunk_load', {
              chunk: chunkName,
              loadTime: loadTime
            });
          }
        }
      }
    });
    
    resourceObserver.observe({ entryTypes: ['resource'] });
  }

  // Track memory upload performance
  window.addEventListener('memoryUploadStart', () => {
    const startTime = performance.now();
    
    window.addEventListener('memoryUploadComplete', () => {
      const duration = performance.now() - startTime;
      console.log('📷 Memory Upload Duration:', Math.round(duration), 'ms');
      
      performanceStore.push({
        name: 'memory_upload_duration',
        value: duration,
        id: 'upload-' + Date.now(),
        timestamp: Date.now()
      });
    }, { once: true });
  });

  // Track AI analysis performance
  window.addEventListener('aiAnalysisStart', () => {
    const startTime = performance.now();
    
    window.addEventListener('aiAnalysisComplete', () => {
      const duration = performance.now() - startTime;
      console.log('🤖 AI Analysis Duration:', Math.round(duration), 'ms');
      
      performanceStore.push({
        name: 'ai_analysis_duration',
        value: duration,
        id: 'ai-' + Date.now(),
        timestamp: Date.now()
      });
    }, { once: true });
  });

  // Track WebGL/3D rendering performance
  window.addEventListener('webglRenderStart', () => {
    const startTime = performance.now();
    
    window.addEventListener('webglRenderComplete', () => {
      const duration = performance.now() - startTime;
      console.log('🎮 WebGL Render Duration:', Math.round(duration), 'ms');
      
      performanceStore.push({
        name: 'webgl_render_duration',
        value: duration,
        id: 'webgl-' + Date.now(),
        timestamp: Date.now()
      });
    }, { once: true });
  });
};

// Error reporting without external service
export const reportPerformanceIssue = (issue: string, context?: Record<string, any>) => {
  console.warn(`⚠️ Performance Issue: ${issue}`, context);
  
  performanceStore.push({
    name: 'performance_issue',
    value: 1,
    id: issue + '-' + Date.now(),
    timestamp: Date.now()
  });
  
  // Could send to your own logging service
  fetch('/api/performance/issues', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ issue, context, timestamp: Date.now() }),
  }).catch(() => {
    // Silently fail if endpoint not available
  });
};

// Performance measurement utility
export const measurePerformance = <T>(name: string, fn: () => T | Promise<T>) => {
  return async (): Promise<T> => {
    const startTime = performance.now();
    
    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      
      console.log(`⏱️ Performance: ${name} took ${duration.toFixed(2)}ms`);
      
      performanceStore.push({
        name: `measure_${name}`,
        value: duration,
        id: name + '-' + Date.now(),
        timestamp: Date.now()
      });
      
      // Track slow operations
      if (duration > 1000) {
        reportPerformanceIssue('slow_operation', {
          operation: name,
          duration: duration,
          threshold: 1000
        });
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(`❌ Error in ${name} after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  };
};

// Memory usage monitoring
export const trackMemoryUsage = () => {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    
    const checkMemory = () => {
      const memoryInfo = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        usagePercent: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
      };
      
      console.log('🧠 Memory Usage:', {
        used: Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024) + 'MB',
        percent: Math.round(memoryInfo.usagePercent) + '%'
      });
      
      performanceStore.push({
        name: 'memory_usage_percent',
        value: memoryInfo.usagePercent,
        id: 'memory-' + Date.now(),
        timestamp: Date.now()
      });
      
      // Alert if memory usage is high
      if (memoryInfo.usagePercent > 80) {
        reportPerformanceIssue('high_memory_usage', memoryInfo);
      }
    };
    
    // Initial check
    checkMemory();
    
    // Check every 2 minutes
    setInterval(checkMemory, 120000);
  }
};

// Bundle size and loading performance tracking
export const trackBundleSize = () => {
  window.addEventListener('load', () => {
    const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    const metrics: BundleMetrics = {
      loadTime: navigationTiming.loadEventEnd - navigationTiming.loadEventStart,
      domContentLoaded: navigationTiming.domContentLoadedEventEnd - navigationTiming.domContentLoadedEventStart,
      firstContentfulPaint: 0, // Will be updated by Performance Observer
      largestContentfulPaint: 0, // Will be updated by Performance Observer  
      timeToFirstByte: navigationTiming.responseStart - navigationTiming.requestStart,
    };
    
    console.log('📈 Bundle Performance Metrics:', {
      'Total Load Time': Math.round(navigationTiming.loadEventEnd - navigationTiming.fetchStart) + 'ms',
      'DOM Content Loaded': Math.round(metrics.domContentLoaded) + 'ms',
      'Time to First Byte': Math.round(metrics.timeToFirstByte) + 'ms'
    });
    
    // Store metrics
    Object.entries(metrics).forEach(([key, value]) => {
      if (value > 0) {
        performanceStore.push({
          name: key,
          value: value,
          id: key + '-' + Date.now(),
          timestamp: Date.now()
        });
      }
    });
    
    // Check for performance thresholds
    const totalLoadTime = navigationTiming.loadEventEnd - navigationTiming.fetchStart;
    if (totalLoadTime > 3000) {
      reportPerformanceIssue('slow_page_load', {
        totalLoadTime,
        threshold: 3000
      });
    }
  });
};

// Get performance data for analysis
export const getPerformanceMetrics = (): PerformanceMetric[] => {
  return [...performanceStore];
};

// Get performance summary
export const getPerformanceSummary = () => {
  const metrics = getPerformanceMetrics();
  
  const summary = {
    totalMetrics: metrics.length,
    averageLoadTime: 0,
    memoryIssues: 0,
    slowOperations: 0,
    recentMetrics: metrics.slice(-10)
  };
  
  // Calculate averages and issues
  metrics.forEach(metric => {
    if (metric.name.includes('load') || metric.name.includes('duration')) {
      summary.averageLoadTime += metric.value;
    }
    if (metric.name === 'performance_issue') {
      if (metric.id.includes('memory')) summary.memoryIssues++;
      if (metric.id.includes('slow')) summary.slowOperations++;
    }
  });
  
  summary.averageLoadTime = summary.averageLoadTime / Math.max(1, metrics.filter(m => 
    m.name.includes('load') || m.name.includes('duration')
  ).length);
  
  return summary;
};

// Export performance data as JSON
export const exportPerformanceData = () => {
  const data = {
    metrics: getPerformanceMetrics(),
    summary: getPerformanceSummary(),
    buildInfo: {
      buildTime: '__BUILD_TIME__',
      version: '__BUILD_VERSION__',
      timestamp: Date.now()
    }
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `performance-data-${Date.now()}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
  console.log('📊 Performance data exported');
};

// Clear performance data
export const clearPerformanceData = () => {
  performanceStore.length = 0;
  console.log('🧹 Performance data cleared');
};

export default {
  initializeMonitoring,
  trackWebVitals,
  trackCustomMetrics,
  reportPerformanceIssue,
  measurePerformance,
  trackMemoryUsage,
  trackBundleSize,
  getPerformanceMetrics,
  getPerformanceSummary,
  exportPerformanceData,
  clearPerformanceData
};