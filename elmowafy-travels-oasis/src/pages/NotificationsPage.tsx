import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Bell, BellOff, Check, X, Heart, MessageCircle, Camera, 
  Plane, Users, Calendar, Gift, Star, MapPin, Clock, 
  Filter, Search, Settings, Trash2, MarkAsUnread
} from 'lucide-react';

interface Notification {
  id: string;
  type: 'memory' | 'travel' | 'family' | 'achievement' | 'event' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  avatar?: string;
  actionUrl?: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
}

const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Demo notifications data
  useEffect(() => {
    const demoNotifications: Notification[] = [
      {
        id: '1',
        type: 'memory',
        title: 'New Memory Shared',
        message: 'Fatima shared 5 new photos from the Cairo trip',
        timestamp: '2024-01-15T10:30:00Z',
        read: false,
        avatar: '/api/placeholder/40/40',
        actionUrl: '/memories',
        priority: 'medium',
        category: 'Family'
      },
      {
        id: '2',
        type: 'travel',
        title: 'Flight Reminder',
        message: 'Your flight to Dubai is in 24 hours. Check-in now available!',
        timestamp: '2024-01-15T08:00:00Z',
        read: false,
        priority: 'high',
        category: 'Travel'
      },
      {
        id: '3',
        type: 'family',
        title: 'Omar completed a challenge',
        message: 'Omar just completed the "Family Historian" achievement!',
        timestamp: '2024-01-14T16:45:00Z',
        read: true,
        avatar: '/api/placeholder/40/40',
        actionUrl: '/achievements',
        priority: 'low',
        category: 'Achievements'
      },
      {
        id: '4',
        type: 'event',
        title: 'Upcoming Family Dinner',
        message: 'Family dinner at Grandma\'s house tomorrow at 7 PM',
        timestamp: '2024-01-14T12:00:00Z',
        read: false,
        priority: 'medium',
        category: 'Events'
      },
      {
        id: '5',
        type: 'achievement',
        title: 'Travel Milestone Reached!',
        message: 'Congratulations! You\'ve visited 10 countries this year',
        timestamp: '2024-01-13T20:30:00Z',
        read: true,
        priority: 'medium',
        category: 'Achievements'
      },
      {
        id: '6',
        type: 'system',
        title: 'New Feature Available',
        message: 'Check out the new family tree visualization feature',
        timestamp: '2024-01-13T09:15:00Z',
        read: false,
        priority: 'low',
        category: 'System'
      }
    ];

    setNotifications(demoNotifications);
    setUnreadCount(demoNotifications.filter(n => !n.read).length);
    setLoading(false);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'memory': return <Camera className="h-5 w-5" />;
      case 'travel': return <Plane className="h-5 w-5" />;
      case 'family': return <Users className="h-5 w-5" />;
      case 'achievement': return <Star className="h-5 w-5" />;
      case 'event': return <Calendar className="h-5 w-5" />;
      case 'system': return <Settings className="h-5 w-5" />;
      default: return <Bell className="h-5 w-5" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500 bg-red-50';
      case 'medium': return 'border-l-yellow-500 bg-yellow-50';
      case 'low': return 'border-l-blue-500 bg-blue-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
    setUnreadCount(0);
  };

  const deleteNotification = (id: string) => {
    const notification = notifications.find(n => n.id === id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (notification && !notification.read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    const matchesFilter = filter === 'all' || 
                         filter === 'unread' && !notification.read ||
                         filter === notification.type;
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-sm">
              {unreadCount} unread
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={markAllAsRead}
            variant="outline"
            size="sm"
            disabled={unreadCount === 0}
          >
            <Check className="h-4 w-4 mr-2" />
            Mark All Read
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="all">All Notifications</option>
                <option value="unread">Unread Only</option>
                <option value="memory">Memories</option>
                <option value="travel">Travel</option>
                <option value="family">Family</option>
                <option value="achievement">Achievements</option>
                <option value="event">Events</option>
                <option value="system">System</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <BellOff className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">No notifications found</h3>
              <p className="text-gray-500">
                {filter === 'unread' 
                  ? 'You\'re all caught up! No unread notifications.'
                  : searchTerm 
                    ? 'Try adjusting your search or filter criteria.'
                    : 'Check back later for new updates.'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredNotifications.map((notification) => (
            <Card 
              key={notification.id}
              className={`cursor-pointer hover:shadow-md transition-shadow border-l-4 ${
                !notification.read ? 'bg-blue-50' : ''
              } ${getPriorityColor(notification.priority)}`}
              onClick={() => !notification.read && markAsRead(notification.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {notification.avatar ? (
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={notification.avatar} />
                      <AvatarFallback>
                        {notification.title.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      {getIcon(notification.type)}
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`font-medium ${!notification.read ? 'font-semibold' : ''}`}>
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                        <p className="text-gray-600 text-sm mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTimestamp(notification.timestamp)}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {notification.category}
                          </Badge>
                          <Badge 
                            variant={notification.priority === 'high' ? 'destructive' : 
                                   notification.priority === 'medium' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {notification.priority}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Notification Settings */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Customize when and how you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium">Notification Types</h4>
              <div className="space-y-3">
                {[
                  { key: 'memories', label: 'New Memories', icon: Camera },
                  { key: 'travel', label: 'Travel Updates', icon: Plane },
                  { key: 'family', label: 'Family Activities', icon: Users },
                  { key: 'achievements', label: 'Achievements', icon: Star },
                  { key: 'events', label: 'Events & Reminders', icon: Calendar }
                ].map(({ key, label, icon: Icon }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-gray-500" />
                      <Label>{label}</Label>
                    </div>
                    <Switch defaultChecked />
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium">Delivery Methods</h4>
              <div className="space-y-3">
                {[
                  { key: 'push', label: 'Push Notifications', desc: 'Browser notifications' },
                  { key: 'email', label: 'Email Notifications', desc: 'Daily digest via email' },
                  { key: 'sms', label: 'SMS Alerts', desc: 'Important updates only' }
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <Label>{label}</Label>
                      <p className="text-sm text-gray-500">{desc}</p>
                    </div>
                    <Switch defaultChecked={key !== 'sms'} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationsPage; 