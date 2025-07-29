import React from 'react';
import './i18n';
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Initialize monitoring and performance tracking
import { 
  initializeMonitoring, 
  trackWebVitals, 
  trackCustomMetrics, 
  trackBundleSize,
  trackMemoryUsage 
} from './utils/monitoring';

// Initialize error monitoring
initializeMonitoring();

// Track performance metrics
trackWebVitals();
trackCustomMetrics();
trackBundleSize();

// Monitor memory usage in production
if (import.meta.env.PROD) {
  trackMemoryUsage();
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error('Failed to find the root element');
const root = createRoot(rootElement);
root.render(<App />);
