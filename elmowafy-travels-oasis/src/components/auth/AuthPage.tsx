import React, { useState } from 'react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { Plane, Heart, Globe, Users } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);

  const features = [
    {
      icon: <Globe className="h-8 w-8 text-blue-600" />,
      title: "Smart Travel Planning",
      description: "AI-powered recommendations tailored to your family's preferences"
    },
    {
      icon: <Heart className="h-8 w-8 text-red-600" />,
      title: "Memory Preservation",
      description: "Organize and preserve your precious family memories with intelligent categorization"
    },
    {
      icon: <Users className="h-8 w-8 text-green-600" />,
      title: "Family Collaboration",
      description: "Plan trips together with shared budgets and collaborative decision making"
    },
    {
      icon: <Plane className="h-8 w-8 text-purple-600" />,
      title: "Cultural Heritage",
      description: "Preserve your family's cultural journey with bilingual Arabic-English support"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-purple-50 flex">
      {/* Left Side - Features */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-12 bg-gradient-to-br from-blue-600 to-purple-700">
        <div className="text-white">
          <h1 className="text-5xl font-bold mb-4">
            🌟 Elmowafy Travels Oasis
          </h1>
          <p className="text-xl mb-12 text-blue-100">
            Your intelligent family memory keeper and travel companion
          </p>
          
          <div className="space-y-8">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start space-x-4">
                <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-blue-100 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-12 p-6 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20">
            <p className="text-blue-100 italic">
              "More than just a travel app - it's your family's digital heritage keeper, 
              intelligent travel planner, and collaborative decision-making companion all in one."
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Forms */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Header */}
          <div className="lg:hidden mb-8 text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              🌟 Elmowafy Travels
            </h1>
            <p className="text-gray-600">
              Your intelligent family travel companion
            </p>
          </div>

          {/* Auth Form */}
          {isLogin ? (
            <LoginForm onToggleMode={() => setIsLogin(false)} />
          ) : (
            <RegisterForm onToggleMode={() => setIsLogin(true)} />
          )}
          
          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              By continuing, you agree to our{' '}
              <a href="#" className="text-blue-600 hover:underline">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};