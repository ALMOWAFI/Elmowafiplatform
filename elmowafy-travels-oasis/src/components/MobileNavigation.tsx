import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { 
  Home, Users, Camera, Plane, Gamepad2, Menu, X,
  Settings, LogOut, User, Bell, Heart, MapPin,
  Calendar, Book, Globe, Trophy, Search
} from 'lucide-react';
import { authService } from '@/services/api';

interface MobileNavigationProps {
  currentUser?: any;
  onLogout?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: number;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({ 
  currentUser, 
  onLogout 
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const bottomNavItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Home',
      icon: <Home className="h-5 w-5" />,
      path: '/dashboard'
    },
    {
      id: 'family',
      label: 'Family',
      icon: <Users className="h-5 w-5" />,
      path: '/family-tree'
    },
    {
      id: 'memories',
      label: 'Memories',
      icon: <Camera className="h-5 w-5" />,
      path: '/memories'
    },
    {
      id: 'travel',
      label: 'Travel',
      icon: <Plane className="h-5 w-5" />,
      path: '/travel-planning'
    },
    {
      id: 'games',
      label: 'Games',
      icon: <Gamepad2 className="h-5 w-5" />,
      path: '/gaming'
    }
  ];

  const menuItems = [
    {
      id: 'profile',
      label: 'Profile',
      icon: <User className="h-5 w-5" />,
      path: '/profile'
    },
    {
      id: 'cultural',
      label: 'Cultural Heritage',
      icon: <Globe className="h-5 w-5" />,
      path: '/cultural'
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: <Calendar className="h-5 w-5" />,
      path: '/calendar'
    },
    {
      id: 'achievements',
      label: 'Achievements',
      icon: <Trophy className="h-5 w-5" />,
      path: '/achievements'
    },
    {
      id: 'search',
      label: 'Search',
      icon: <Search className="h-5 w-5" />,
      path: '/search'
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: <Bell className="h-5 w-5" />,
      path: '/notifications',
      badge: 3
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="h-5 w-5" />,
      path: '/settings'
    }
  ];

  const isActivePath = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      authService.logout();
      window.location.href = '/auth';
    }
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Header */}
      <header className="md:hidden bg-white/90 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Heart className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Elmowafiplatform
            </span>
          </Link>

          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                3
              </span>
            </Button>

            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 p-0">
                <div className="flex flex-col h-full">
                  {/* Menu Header */}
                  <div className="p-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold">Menu</h2>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setIsMenuOpen(false)}
                        className="text-white hover:bg-white/20"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>

                    {currentUser && (
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                          <User className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="font-medium">{currentUser.username || 'Family Member'}</p>
                          <p className="text-sm opacity-90">{currentUser.email || 'member@family.com'}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Menu Items */}
                  <div className="flex-1 overflow-y-auto">
                    <div className="py-4">
                      {menuItems.map((item) => (
                        <Link
                          key={item.id}
                          to={item.path}
                          className={`flex items-center justify-between px-6 py-3 text-gray-700 hover:bg-gray-100 transition-colors ${
                            isActivePath(item.path) ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' : ''
                          }`}
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <div className="flex items-center space-x-3">
                            {item.icon}
                            <span className="font-medium">{item.label}</span>
                          </div>
                          {item.badge && (
                            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Menu Footer */}
                  <div className="p-6 border-t border-gray-200">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start" 
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Logout
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="flex items-center justify-around py-2">
          {bottomNavItems.map((item) => (
            <Link
              key={item.id}
              to={item.path}
              className={`flex flex-col items-center justify-center px-3 py-2 min-w-0 flex-1 text-center transition-colors ${
                isActivePath(item.path)
                  ? 'text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className={`p-1 rounded-lg transition-colors ${
                isActivePath(item.path) ? 'bg-blue-100' : ''
              }`}>
                {item.icon}
              </div>
              <span className="text-xs font-medium mt-1 leading-none">
                {item.label}
              </span>
              {item.badge && (
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
              )}
            </Link>
          ))}
        </div>
      </nav>

      {/* Safe area for bottom navigation */}
      <div className="md:hidden h-16"></div>
    </>
  );
};

export default MobileNavigation; 