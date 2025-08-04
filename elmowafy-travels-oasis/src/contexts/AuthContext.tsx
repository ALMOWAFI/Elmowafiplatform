import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authService } from '@/services/api';

interface User {
  id: string;
  email: string;
  username?: string;
  display_name: string;
  is_active: boolean;
  family_groups: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  roles: string[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Initialize authentication state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const storedUser = localStorage.getItem('user');

        if (token && storedUser) {
          // Try to validate the stored user data by fetching current user
          try {
            const currentUser = await authService.getCurrentUser();
            setUser(currentUser);
            
            // Update stored user data
            localStorage.setItem('user', JSON.stringify(currentUser));
          } catch (error) {
            // Token might be expired, try refresh
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
              try {
                const response = await authService.refresh(refreshToken);
                localStorage.setItem('authToken', response.access_token);
                localStorage.setItem('refreshToken', response.refresh_token);
                localStorage.setItem('user', JSON.stringify(response.user));
                setUser(response.user);
              } catch (refreshError) {
                // Refresh failed, clear stored data
                clearAuthData();
              }
            } else {
              // No refresh token, clear stored data
              clearAuthData();
            }
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        clearAuthData();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const clearAuthData = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login({ email, password });
      
      if (response.access_token) {
        localStorage.setItem('authToken', response.access_token);
        localStorage.setItem('refreshToken', response.refresh_token);
        localStorage.setItem('user', JSON.stringify(response.user));
        setUser(response.user);
      }
    } catch (error) {
      throw error;
    }
  };

  const register = async (userData: any) => {
    try {
      const response = await authService.register(userData);
      
      if (response.access_token) {
        localStorage.setItem('authToken', response.access_token);
        localStorage.setItem('refreshToken', response.refresh_token);
        localStorage.setItem('user', JSON.stringify(response.user));
        setUser(response.user);
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    clearAuthData();
    // Call logout endpoint to invalidate server-side session if needed
    authService.logout().catch(console.error);
  };

  const refreshUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      localStorage.setItem('user', JSON.stringify(currentUser));
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      // If refresh fails, logout
      logout();
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;