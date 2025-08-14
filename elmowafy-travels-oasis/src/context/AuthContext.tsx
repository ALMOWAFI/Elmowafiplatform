import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password: string, passwordConfirm: string) => Promise<void>;
  updateProfile: (name: string, email: string) => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string, passwordConfirm: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      setAccessToken(data.accessToken);
      setUser(data.data.user);
      
      // Store token in localStorage for persistence
      localStorage.setItem('accessToken', data.accessToken);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setAccessToken(null);
      setUser(null);
      localStorage.removeItem('accessToken');
    }
  };

  const register = async (name: string, email: string, password: string, passwordConfirm: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ name, email, password, passwordConfirm }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      setAccessToken(data.accessToken);
      setUser(data.data.user);
      
      // Store token in localStorage for persistence
      localStorage.setItem('accessToken', data.accessToken);
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const updateProfile = async (name: string, email: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/updateMe`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        credentials: 'include',
        body: JSON.stringify({ name, email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Profile update failed');
      }

      setUser(data.data.user);
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  };

  const updatePassword = async (currentPassword: string, newPassword: string, passwordConfirm: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/updatePassword`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword, passwordConfirm }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Password update failed');
      }

      // Update access token if returned
      if (data.accessToken) {
        setAccessToken(data.accessToken);
        localStorage.setItem('accessToken', data.accessToken);
      }
    } catch (error) {
      console.error('Password update error:', error);
      throw error;
    }
  };

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setAccessToken(token);
        setUser(data.data.user);
      } else {
        // Token might be expired, try to refresh
        await refreshToken();
      }
    } catch (error) {
      console.error('Fetch profile error:', error);
      localStorage.removeItem('accessToken');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshToken = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setAccessToken(data.accessToken);
        localStorage.setItem('accessToken', data.accessToken);
        await fetchUserProfile();
      } else {
        localStorage.removeItem('accessToken');
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      localStorage.removeItem('accessToken');
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      register,
      updateProfile,
      updatePassword
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
