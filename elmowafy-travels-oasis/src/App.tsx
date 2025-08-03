
import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from '@/components/ui/toaster';
import { Loader2 } from 'lucide-react';
import { LanguageProvider } from '@/context/LanguageContext';

// Eager load critical components
import Navbar from './components/Navbar';
import MobileNavigation from './components/MobileNavigation';

// Lazy load all pages for optimal code splitting
const FamilyDashboard = React.lazy(() => import('./pages/FamilyDashboard'));
const MemoriesPage = React.lazy(() => import('./pages/MemoriesPage'));
const AuthPage = React.lazy(() => import('./pages/AuthPage'));
const TravelPlanningPage = React.lazy(() => import('./pages/TravelPlanningPage'));
const GamingPage = React.lazy(() => import('./pages/GamingPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const NotificationsPage = React.lazy(() => import('./pages/NotificationsPage'));
const CalendarPage = React.lazy(() => import('./pages/CalendarPage'));
const SearchPage = React.lazy(() => import('./pages/SearchPage'));
const AchievementsPage = React.lazy(() => import('./pages/AchievementsPage'));
const AnalyticsPage = React.lazy(() => import('./pages/AnalyticsPage'));
const BudgetManagementPage = React.lazy(() => import('./pages/BudgetManagementPage'));

// Lazy load feature containers
const FamilyTreeContainer = React.lazy(() => import('./features/FamilyTree/FamilyTreeContainer'));

// Lazy load performance monitoring components
const PerformanceMonitor = React.lazy(() => import('./components/PerformanceMonitor'));
const RealTimeBudgetTracker = React.lazy(() => import('./components/RealTimeBudgetTracker'));
const ImageOptimizer = React.lazy(() => import('./components/ImageOptimizer'));

// Create a reusable loading component
const PageLoadingFallback: React.FC<{ page?: string }> = ({ page = 'page' }) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading {page}...</h3>
      <p className="text-sm text-gray-600">Optimizing performance with code splitting</p>
    </div>
  </div>
);

// Create React Query client with optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
    mutations: {
      retry: 1,
    }
  }
});

function App() {
  // Performance monitoring
  React.useEffect(() => {
    // Log performance metrics
    if (typeof window !== 'undefined' && window.performance) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'navigation') {
            console.log('📊 Navigation timing:', entry);
          }
          if (entry.entryType === 'measure') {
            console.log('📊 Custom measure:', entry);
          }
        });
      });
      
      observer.observe({ entryTypes: ['navigation', 'measure'] });
      
      return () => observer.disconnect();
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            {/* Navigation */}
            <Navbar />
          
          {/* Main content with optimized route loading */}
          <main className="pb-16 md:pb-0">
            <Routes>
              <Route path="/" element={<Suspense fallback={<PageLoadingFallback page="Dashboard" />}><FamilyDashboard /></Suspense>} />
              <Route path="/auth" element={<Suspense fallback={<PageLoadingFallback />}><AuthPage /></Suspense>} />
              <Route path="/memories" element={<Suspense fallback={<PageLoadingFallback page="Memories" />}><MemoriesPage /></Suspense>} />
              <Route path="/travel-planning" element={<Suspense fallback={<PageLoadingFallback page="Travel Planning" />}><TravelPlanningPage /></Suspense>} />
              <Route path="/gaming" element={<Suspense fallback={<PageLoadingFallback page="Gaming Hub" />}><GamingPage /></Suspense>} />
              <Route path="/profile" element={<Suspense fallback={<PageLoadingFallback />}><ProfilePage /></Suspense>} />
              <Route path="/notifications" element={<Suspense fallback={<PageLoadingFallback />}><NotificationsPage /></Suspense>} />
              <Route path="/calendar" element={<Suspense fallback={<PageLoadingFallback />}><CalendarPage /></Suspense>} />
              <Route path="/search" element={<Suspense fallback={<PageLoadingFallback />}><SearchPage /></Suspense>} />
              <Route path="/achievements" element={<Suspense fallback={<PageLoadingFallback />}><AchievementsPage /></Suspense>} />
              <Route path="/analytics" element={<Suspense fallback={<PageLoadingFallback page="Analytics" />}><AnalyticsPage /></Suspense>} />
              <Route path="/budget" element={<Suspense fallback={<PageLoadingFallback page="Budget Management" />}><BudgetManagementPage /></Suspense>} />
              <Route path="/family-tree-webgl" element={<Suspense fallback={<PageLoadingFallback page="Family Tree" />}><FamilyTreeContainer /></Suspense>} />
              <Route path="/performance" element={<Suspense fallback={<PageLoadingFallback page="Performance Monitor" />}><PerformanceMonitor /></Suspense>} />
              <Route path="/budget-tracker" element={<Suspense fallback={<PageLoadingFallback page="Budget Tracker" />}><RealTimeBudgetTracker budgetId="budget_1" /></Suspense>} />
              <Route path="/image-optimizer" element={<Suspense fallback={<PageLoadingFallback page="Image Optimizer" />}><ImageOptimizer /></Suspense>} />
            </Routes>
          </main>
          
            {/* Mobile Navigation */}
            <MobileNavigation />
            
            {/* Toast notifications */}
            <Toaster />
          </div>
        </Router>
      </LanguageProvider>
      
      {/* React Query DevTools (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}

export default App;
