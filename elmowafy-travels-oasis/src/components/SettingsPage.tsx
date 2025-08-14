import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Settings, User, Bell, Shield, Globe, Palette } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const SettingsPage: React.FC = () => {
  const { t, isRTL, toggleLanguage, language } = useLanguage();

  const settingsSections = [
    {
      icon: User,
      title: 'Profile Settings',
      description: 'Manage your personal information and preferences',
      items: ['Edit Profile', 'Change Password', 'Privacy Settings']
    },
    {
      icon: Bell,
      title: 'Notifications',
      description: 'Configure how you receive notifications',
      items: ['Email Notifications', 'Push Notifications', 'SMS Alerts']
    },
    {
      icon: Shield,
      title: 'Security',
      description: 'Manage your account security settings',
      items: ['Two-Factor Authentication', 'Login History', 'Device Management']
    },
    {
      icon: Globe,
      title: 'Language & Region',
      description: 'Set your preferred language and regional settings',
      items: ['Language', 'Time Zone', 'Date Format']
    },
    {
      icon: Palette,
      title: 'Appearance',
      description: 'Customize the look and feel of the application',
      items: ['Theme', 'Color Scheme', 'Font Size']
    }
  ];

  return (
    <div className="space-y-8">
      <div className="text-center">
        <Settings className="w-16 h-16 mx-auto mb-4 text-blue-600" />
        <h1 className="text-4xl font-bold mb-2">Settings</h1>
        <p className="text-lg text-muted-foreground">Customize your experience</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {settingsSections.map((section, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <section.icon className="w-5 h-5" />
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{section.description}</p>
              <div className="space-y-2">
                {section.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                    <span className="text-sm">{item}</span>
                    <Button variant="ghost" size="sm">
                      Configure
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Language Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Language Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Current Language</p>
              <p className="text-sm text-muted-foreground">
                {language === 'en' ? 'English' : 'العربية'}
              </p>
            </div>
            <Button onClick={toggleLanguage} variant="outline">
              Switch to {language === 'en' ? 'العربية' : 'English'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
