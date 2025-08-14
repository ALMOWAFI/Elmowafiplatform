import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { IntegrationProvider } from './context/IntegrationContext';
import ConnectedDashboard from './components/ConnectedDashboard';
import MemoriesGallery from './components/MemoriesGallery';
import { MemoryUpload } from './components/MemoryUpload';
import TravelGuideChat from './components/TravelGuideChat';
import ActivityCustomizer from './components/activities/ActivityCustomizer';
import Gaming from './components/Gaming';
import SettingsPage from './components/SettingsPage';
import HealthCheck from './components/HealthCheck';
import FamilyAITest from './pages/FamilyAITest';
import { BudgetDashboard } from './features/budget';
import MobileNavigation from './components/navigation/MobileNavigation';
import { toast } from 'sonner';
import { AuthPage } from './components/auth/AuthPage';
import { UserProfile } from './components/auth/UserProfile';
import { Avatar, AvatarFallback, AvatarImage } from './components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './components/ui/dropdown-menu';
import { LoadingPage } from './components/ui/loading';
import { LogOut, Settings as SettingsIcon, User } from 'lucide-react';

// Create a client
const queryClient = new QueryClient();

// API base URL - Railway backend in production, localhost in development
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://elmowafiplatform-production.up.railway.app';

function AppContent() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  
  // Mock user for demo
  const mockUser = { 
    id: '1', 
    name: 'Demo Family', 
    email: 'demo@family.com', 
    avatar: '' 
  };
  const [gameSession, setGameSession] = useState<any>(null);
  const [gameState, setGameState] = useState<string | null>(null);
  const [joinSessionId, setJoinSessionId] = useState<string>('');

  // Load real game session from API
  useEffect(() => {
    // Remove mock data - will load from real API
    // setGameSession(null);
  }, []);

  const createMafiaGame = async (hostName: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/games/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          game_type: 'mafia',
          host_name: hostName,
          max_players: 8
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setGameSession(data);
        toast.success('Mafia game created successfully!');
      } else {
        toast.error('Failed to create game');
      }
    } catch (error) {
      console.error('Error creating game:', error);
      toast.error('Error creating game');
    }
  };

  const joinGame = async (playerName: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/games/${joinSessionId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_name: playerName })
      });
      
      if (response.ok) {
        const data = await response.json();
        setGameSession(data);
        toast.success('Joined game successfully!');
      } else {
        toast.error('Failed to join game');
      }
    } catch (error) {
      console.error('Error joining game:', error);
      toast.error('Error joining game');
    }
  };

  const startGame = async () => {
    if (!gameSession) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/games/${gameSession.session_id}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        setGameState(data.state);
        toast.success('Game started!');
      } else {
        toast.error('Failed to start game');
      }
    } catch (error) {
      console.error('Error starting game:', error);
      toast.error('Error starting game');
    }
  };

  const copyJoinCode = () => {
    if (!gameSession) return;
    const code = gameSession.join_code;
    navigator.clipboard.writeText(code);
    toast.success('Join code copied to clipboard!');
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Error logging out');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  if (isLoading) {
    return (
      <LoadingPage 
        title="Welcome Back!"
        description="Loading your family adventure and personalizing your experience..."
      />
    );
  }

  // Temporarily bypass auth for demo
  // if (!isAuthenticated) {
  //   return <AuthPage />;
  // }

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-gray-900">
                  🌟 Elmowafy Travels Oasis
                </h1>
              </div>
              <div className="flex items-center space-x-6">
                <nav className="hidden md:flex space-x-8">
                  <Link to="/" className="text-gray-700 hover:text-blue-600 transition-colors">
                    Dashboard
                  </Link>
                  <Link to="/memories" className="text-gray-700 hover:text-blue-600 transition-colors">
                    Memories
                  </Link>
                  <Link to="/budget" className="text-gray-700 hover:text-blue-600 transition-colors">
                    Budget
                  </Link>
                  <Link to="/travel" className="text-gray-700 hover:text-blue-600 transition-colors">
                    Travel Guide
                  </Link>
                  <Link to="/activities" className="text-gray-700 hover:text-blue-600 transition-colors">
                    Activities
                  </Link>
                  <Link to="/gaming" className="text-gray-700 hover:text-blue-600 transition-colors">
                    Gaming
                  </Link>
                  <Link to="/family-ai-test" className="text-gray-700 hover:text-blue-600 transition-colors">
                    Family AI Test
                  </Link>
                </nav>
                
                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center space-x-2 focus:outline-none">
                    <Avatar className="h-8 w-8 border-2 border-gray-200">
                      <AvatarImage src={mockUser?.avatar} alt={mockUser?.name} />
                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm">
                        {mockUser?.name ? getInitials(mockUser.name) : 'DF'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:block text-gray-700 font-medium">{mockUser?.name}</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="flex items-center space-x-2 w-full">
                        <User className="h-4 w-4" />
                        <span>Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/settings" className="flex items-center space-x-2 w-full">
                        <SettingsIcon className="h-4 w-4" />
                        <span>Settings</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={handleLogout}
                      className="flex items-center space-x-2 text-red-600 focus:text-red-600 focus:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
          <Routes>
            <Route path="/" element={<ConnectedDashboard />} />
            <Route path="/memories" element={
              <div className="space-y-8">
                <MemoryUpload />
                <MemoriesGallery />
              </div>
            } />
            <Route path="/budget" element={<BudgetDashboard />} />
            <Route path="/travel" element={<TravelGuideChat />} />
            <Route path="/activities" element={<ActivityCustomizer />} />
            <Route path="/gaming" element={
              <div className="space-y-8">
                <Gaming />
                <HealthCheck />
              </div>
            } />
            <Route path="/profile" element={<UserProfile />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/family-ai-test" element={<FamilyAITest />} />
          </Routes>
        </main>
        
        {/* Mobile Navigation - Only visible on small screens */}
        <div className="md:hidden">
          <MobileNavigation />
        </div>
      </div>
    </Router>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>
          <DataProvider>
            <IntegrationProvider>
              <AppContent />
              <Toaster position="top-right" />
            </IntegrationProvider>
          </DataProvider>
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;