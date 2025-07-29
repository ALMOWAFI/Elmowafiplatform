import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { authService } from '@/services/api';
import { Heart, Users, Camera, Plane } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect if already authenticated
    if (authService.isAuthenticated()) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleAuthSuccess = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        
        {/* Left side - Welcome content */}
        <div className="space-y-8 text-center lg:text-left">
          <div className="space-y-4">
            <h1 className="text-4xl lg:text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Elmowafiplatform
            </h1>
            <p className="text-xl lg:text-2xl text-gray-600 font-medium">
              Your AI-Powered Family Digital Hub
            </p>
            <p className="text-gray-500 text-lg max-w-md mx-auto lg:mx-0">
              Connect, share memories, plan adventures, and grow together as a family in the digital age.
            </p>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-2 gap-6 max-w-md mx-auto lg:mx-0">
            <div className="flex flex-col items-center lg:items-start space-y-2">
              <div className="p-3 bg-blue-100 rounded-full">
                <Heart className="h-6 w-6 text-blue-600" />
              </div>
              <div className="text-center lg:text-left">
                <h3 className="font-semibold text-gray-800">Family Bonds</h3>
                <p className="text-sm text-gray-600">Strengthen connections</p>
              </div>
            </div>

            <div className="flex flex-col items-center lg:items-start space-y-2">
              <div className="p-3 bg-purple-100 rounded-full">
                <Camera className="h-6 w-6 text-purple-600" />
              </div>
              <div className="text-center lg:text-left">
                <h3 className="font-semibold text-gray-800">Smart Memories</h3>
                <p className="text-sm text-gray-600">AI-organized photos</p>
              </div>
            </div>

            <div className="flex flex-col items-center lg:items-start space-y-2">
              <div className="p-3 bg-pink-100 rounded-full">
                <Plane className="h-6 w-6 text-pink-600" />
              </div>
              <div className="text-center lg:text-left">
                <h3 className="font-semibold text-gray-800">Travel Planning</h3>
                <p className="text-sm text-gray-600">Adventures together</p>
              </div>
            </div>

            <div className="flex flex-col items-center lg:items-start space-y-2">
              <div className="p-3 bg-green-100 rounded-full">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div className="text-center lg:text-left">
                <h3 className="font-semibold text-gray-800">Family Tree</h3>
                <p className="text-sm text-gray-600">Interactive genealogy</p>
              </div>
            </div>
          </div>

          {/* Stats or testimonial */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 max-w-md mx-auto lg:mx-0">
            <div className="flex items-center space-x-4">
              <div className="flex -space-x-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                  A
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-sm">
                  M
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-500 to-red-500 flex items-center justify-center text-white font-semibold text-sm">
                  F
                </div>
              </div>
              <div>
                <p className="font-semibold text-gray-800">Join thousands of families</p>
                <p className="text-sm text-gray-600">Building stronger connections through technology</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Auth form */}
        <div className="flex justify-center lg:justify-end">
          {isLogin ? (
            <LoginForm
              onSuccess={handleAuthSuccess}
              onSwitchToRegister={() => setIsLogin(false)}
            />
          ) : (
            <RegisterForm
              onSuccess={handleAuthSuccess}
              onSwitchToLogin={() => setIsLogin(true)}
            />
          )}
        </div>
      </div>

      {/* Background decorations */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>
    </div>
  );
};

export default AuthPage; 