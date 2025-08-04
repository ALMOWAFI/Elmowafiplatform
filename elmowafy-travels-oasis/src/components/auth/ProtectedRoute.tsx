import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AuthForm from './AuthForm';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  fallback,
  requireRoles = []
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <AuthForm />
      </div>
    );
  }

  // Check role requirements
  if (requireRoles.length > 0 && user) {
    const userRoles = user.roles || [];
    const hasRequiredRole = requireRoles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <Card className="w-96">
            <CardContent className="text-center p-8">
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">
                You don't have the required permissions to access this page.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Required roles: {requireRoles.join(', ')}
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  // User is authenticated and has required roles
  return <>{children}</>;
};

export default ProtectedRoute;