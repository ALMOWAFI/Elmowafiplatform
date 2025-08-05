import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/services/api';

// Types
interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}

interface AuthTokens {
  access_token: string;
  refresh_token?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean }>;
  register: (userData: any) => Promise<{ success: boolean }>;
  logout: () => void;
  refreshUser: () => Promise<User>;
  updateUser: (updates: Partial<User>) => void;
  refreshToken: string | null;
}

// Extend authService with additional methods
type ExtendedAuthService = typeof authService & {
  setAuthToken: (token: string | null) => void;
  refreshToken: (token: string) => Promise<AuthTokens>;
};

// Create extended auth service
const extendedAuthService: ExtendedAuthService = {
  ...authService,
  setAuthToken: (token: string | null) => {
    const api = require('@/services/api').default;
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  },
  refreshToken: async (token: string) => {
    const response = await authService.refresh(token);
    return {
      access_token: response.access_token,
      refresh_token: response.refresh_token
    };
  }
};

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // State
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [refreshToken, setRefreshToken] = useState<string | null>(
    localStorage.getItem('refreshToken')
  );
  
  const navigate = useNavigate();
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isAuthenticated = !!user;

  // Helper functions
  const clearRefreshTimeout = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
  }, []);

  // Initialize authentication state
  useEffect(() => {
    let isMounted = true;

    // Logout function
    const logout = () => {
      if (!isMounted) return;
      
      // Clear all auth data
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      extendedAuthService.setAuthToken(null);
      
      // Clear any pending refresh
      clearRefreshTimeout();
      
      // Reset state
      setUser(null);
      setRefreshToken(null);
      
      // Redirect to login
      navigate('/login');
    };
    
    // Token refresh logic
    const startTokenRefresh = (token: string) => {
      if (!isMounted) return;
      
      // Clear any existing timeout
      clearRefreshTimeout();
      
      // Set a timeout to refresh the token before it expires
      const refreshTime = 25 * 60 * 1000; // 25 minutes
      
      refreshTimeoutRef.current = setTimeout(async () => {
        try {
          const newTokens = await extendedAuthService.refreshToken(token);
          if (newTokens.access_token) {
            localStorage.setItem('authToken', newTokens.access_token);
            
            if (newTokens.refresh_token) {
              localStorage.setItem('refreshToken', newTokens.refresh_token);
              setRefreshToken(newTokens.refresh_token);
              startTokenRefresh(newTokens.refresh_token);
            } else {
              startTokenRefresh(token);
            }
            
            extendedAuthService.setAuthToken(newTokens.access_token);
          }
        } catch (error) {
          console.error('Token refresh failed:', error);
          logout();
        }
      }, refreshTime);
    };

    // Login function
    const login = async (email: string, password: string) => {
      try {
        setIsLoading(true);
        const response = await extendedAuthService.login({ email, password });
        
        if (response.access_token) {
          localStorage.setItem('authToken', response.access_token);
          
          if (response.refresh_token) {
            localStorage.setItem('refreshToken', response.refresh_token);
            setRefreshToken(response.refresh_token);
            startTokenRefresh(response.refresh_token);
          }
          
          extendedAuthService.setAuthToken(response.access_token);
          
          // Fetch user data
          const userData = await extendedAuthService.getCurrentUser();
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
          
          return { success: true };
        }
        return { success: false };
      } catch (error) {
        console.error('Login error:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    };

    // Register function
    const register = async (userData: any) => {
      try {
        setIsLoading(true);
        const response = await extendedAuthService.register(userData);
        
        if (response.success) {
          // Auto-login after successful registration
          return await login(userData.email, userData.password);
        }
        return response;
      } catch (error) {
        console.error('Registration error:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    };

    // Update user data
    const updateUser = (updates: Partial<User>) => {
      setUser(prevUser => {
        if (!prevUser) return null;
        const updatedUser = { ...prevUser, ...updates };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        return updatedUser;
      });
    };

    // Refresh user data
    const refreshUser = async () => {
      try {
        const userData = await extendedAuthService.getCurrentUser();
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        return userData;
      } catch (error) {
        console.error('Failed to refresh user data:', error);
        // If token is invalid, log out
        if ((error as any)?.response?.status === 401) {
          logout();
        }
        throw error;
      }
    };

    // Initialize auth state
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const storedRefreshToken = localStorage.getItem('refreshToken');
        
        if (token && storedRefreshToken) {
          extendedAuthService.setAuthToken(token);
          
          try {
            // Verify the token is still valid
            const userData = await extendedAuthService.getCurrentUser();
            setUser(userData);
            
            // Start token refresh
            startTokenRefresh(storedRefreshToken);
          } catch (error) {
            console.error('Failed to verify token:', error);
            logout();
          }
        } else {
          logout();
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
    
    // Cleanup function
    return () => {
      isMounted = false;
      clearRefreshTimeout();
    };
  }, [navigate, clearRefreshTimeout]);

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login: useCallback((email: string, password: string) => {
      return extendedAuthService.login({ email, password })
        .then(response => {
          if (response.access_token) {
            localStorage.setItem('authToken', response.access_token);
            if (response.refresh_token) {
              localStorage.setItem('refreshToken', response.refresh_token);
              setRefreshToken(response.refresh_token);
            }
            extendedAuthService.setAuthToken(response.access_token);
            return { success: true };
          }
          return { success: false };
        });
    }, []),
    register: useCallback((userData: any) => {
      return extendedAuthService.register(userData);
    }, []),
    logout: useCallback(() => {
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      extendedAuthService.setAuthToken(null);
      setUser(null);
      setRefreshToken(null);
      navigate('/login');
    }, [navigate]),
    refreshUser: useCallback(async () => {
      const userData = await extendedAuthService.getCurrentUser();
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      return userData;
    }, []),
    updateUser: useCallback((updates: Partial<User>) => {
      setUser(prevUser => {
        if (!prevUser) return null;
        const updatedUser = { ...prevUser, ...updates };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        return updatedUser;
      });
    }, []),
    refreshToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
type ExtendedAuthService = typeof authService & {
  setAuthToken: (token: string | null) => void;
  refreshToken: (token: string) => Promise<{
    access_token: string;
    refresh_token?: string;
  }>;
};

// Create extended auth service
const extendedAuthService: ExtendedAuthService = {
  ...authService,
  setAuthToken: (token: string | null) => {
    const api = require('@/services/api').default;
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  },
  refreshToken: async (token: string) => {
    const response = await authService.refresh(token);
    return {
      access_token: response.access_token,
      refresh_token: response.refresh_token
    };
  }
};

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
  login: (email: string, password: string) => Promise<{ success: boolean }>;
  register: (userData: any) => Promise<{ success: boolean }>;
  logout: () => void;
  refreshUser: () => Promise<User>;
  updateUser: (updates: Partial<User>) => void;
  refreshToken: string | null;
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
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [refreshToken, setRefreshToken] = useState<string | null>(
    localStorage.getItem('refreshToken')
  );
  
  const navigate = useNavigate();
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isAuthenticated = !!user;

  const clearRefreshTimeout = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
  }, []);



  // Initialize authentication state
  useEffect(() => {
    // Logout function
    const logout = () => {
      // Clear all auth data
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      extendedAuthService.setAuthToken(null);
      
      // Clear any pending refresh
      clearRefreshTimeout();
      
      // Reset state
      setUser(null);
      setRefreshToken(null);
      
      // Redirect to login
      navigate('/login');
    };
    
    // Define startTokenRefresh inside useEffect to access logout
    const startTokenRefresh = (token: string) => {
      // Clear any existing timeout
      clearRefreshTimeout();
      
      // Set a timeout to refresh the token before it expires (e.g., 5 minutes before)
      const refreshTime = 25 * 60 * 1000; // 25 minutes (assuming token expires in 30 minutes)
      
      refreshTimeoutRef.current = setTimeout(async () => {
        try {
          const newTokens = await extendedAuthService.refreshToken(token);
          if (newTokens.access_token) {
            localStorage.setItem('authToken', newTokens.access_token);
            
            if (newTokens.refresh_token) {
              localStorage.setItem('refreshToken', newTokens.refresh_token);
              setRefreshToken(newTokens.refresh_token);
              startTokenRefresh(newTokens.refresh_token);
            } else {
              startTokenRefresh(token);
            }
            
            extendedAuthService.setAuthToken(newTokens.access_token);
          }
        } catch (error) {
          console.error('Token refresh failed:', error);
          logout();
        }
      }, refreshTime);
    };

    const initAuth = async () => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const storedRefreshToken = localStorage.getItem('refreshToken');
        
        if (token && storedRefreshToken) {
          // Set the auth token in the API service
          extendedAuthService.setAuthToken(token);
          
          try {
            // Verify the token is still valid
            const userData = await extendedAuthService.getCurrentUser();
            setUser(userData);
            
            // Start token refresh
            startTokenRefresh(storedRefreshToken);
          } catch (error) {
            console.error('Failed to verify token:', error);
            // If token verification fails, clear auth data
            logout();
          }
        } else {
          // No valid token found, ensure we're logged out
          logout();
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
    
    // Cleanup function
    return () => {
      clearRefreshTimeout();
    };
  }, [navigate, clearRefreshTimeout]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await extendedAuthService.login({ email, password });
      
      if (response.access_token) {
        localStorage.setItem('authToken', response.access_token);
        
        if (response.refresh_token) {
          localStorage.setItem('refreshToken', response.refresh_token);
          setRefreshToken(response.refresh_token);
          startTokenRefresh(response.refresh_token);
        }
        
        extendedAuthService.setAuthToken(response.access_token);
        
        // Fetch user data
        const userData = await extendedAuthService.getCurrentUser();
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        
        return { success: true };
      }
      return { success: false };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [startTokenRefresh]);

  const register = useCallback(async (userData: any) => {
    try {
      setIsLoading(true);
      const response = await extendedAuthService.register(userData);
      
      if (response.success) {
        // Auto-login after successful registration
        return await login(userData.email, userData.password);
      }
      return response;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [login]);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser(prevUser => {
      if (!prevUser) return null;
      const updatedUser = { ...prevUser, ...updates };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return updatedUser;
    });
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const userData = await extendedAuthService.getCurrentUser();
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      return userData;
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      // If token is invalid, log out
      if ((error as any)?.response?.status === 401) {
        logout();
      }
      throw error;
    }
  }, [logout]);

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
    updateUser,
    refreshToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;