import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar, CalendarDays, Clock, MapPin, Users, Plus, Edit, Trash2, 
  Bell, BellOff, ChevronLeft, ChevronRight, Filter, Search, Star,
  Plane, Camera, Cake, Heart, Gift, Home, Utensils, BookOpen
} from 'lucide-react';

interface FamilyEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location?: string;
  type: 'birthday' | 'travel' | 'dinner' | 'celebration' | 'reminder' | 'other';
  priority: 'low' | 'medium' | 'high';
  attendees: string[];
  createdBy: string;
  reminders: string[];
  color: string;
}

const CalendarPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<FamilyEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<FamilyEvent | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'list'>('month');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Demo events data
  useEffect(() => {
    const demoEvents: FamilyEvent[] = [
      {
        id: '1',
        title: 'Omar\'s Birthday',
        description: 'Celebrate Omar turning 16!',
        date: '2024-02-15',
        time: '19:00',
        location: 'Home',
        type: 'birthday',
        priority: 'high',
        attendees: ['omar', 'fatima', 'ahmad', 'layla'],
        createdBy: 'ahmad',
        reminders: ['1day', '1hour'],
        color: '#ef4444'
      },
      {
        id: '2',
        title: 'Family Trip to Alexandria',
        description: 'Weekend getaway to the beautiful Mediterranean coast',
        date: '2024-02-20',
        time: '08:00',
        location: 'Alexandria, Egypt',
        type: 'travel',
        priority: 'high',
        attendees: ['ahmad', 'fatima', 'omar', 'layla'],
        createdBy: 'ahmad',
        reminders: ['3days', '1day'],
        color: '#3b82f6'
      },
      {
        id: '3',
        title: 'Grandma\'s Dinner',
        description: 'Monthly family dinner at Grandma\'s house',
        date: '2024-01-28',
        time: '18:30',
        location: 'Grandma\'s House',
        type: 'dinner',
        priority: 'medium',
        attendees: ['ahmad', 'fatima', 'omar', 'layla'],
        createdBy: 'fatima',
        reminders: ['1day'],
        color: '#10b981'
      },
      {
        id: '4',
        title: 'School Parent Meeting',
        description: 'Parent-teacher conference for Omar',
        date: '2024-02-05',
        time: '16:00',
        location: 'Cairo International School',
        type: 'other',
        priority: 'medium',
        attendees: ['ahmad', 'fatima'],
        createdBy: 'fatima',
        reminders: ['1day', '2hours'],
        color: '#f59e0b'
      },
      {
        id: '5',
        title: 'Wedding Anniversary',
        description: '15 years of beautiful marriage!',
        date: '2024-03-12',
        time: '20:00',
        location: 'Four Seasons Hotel',
        type: 'celebration',
        priority: 'high',
        attendees: ['ahmad', 'fatima'],
        createdBy: 'ahmad',
        reminders: ['1week', '1day'],
        color: '#ec4899'
      }
    ];
    
    setEvents(demoEvents);
  }, []);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'birthday': return <Cake className="h-4 w-4" />;
      case 'travel': return <Plane className="h-4 w-4" />;
      case 'dinner': return <Utensils className="h-4 w-4" />;
      case 'celebration': return <Heart className="h-4 w-4" />;
      case 'reminder': return <Bell className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const getEventsForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return events.filter(event => event.date === dateString);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSameDay = (date1: Date | null, date2: Date) => {
    if (!date1) return false;
    return date1.toDateString() === date2.toDateString();
  };

  const filteredEvents = events.filter(event => {
    const matchesFilter = filterType === 'all' || event.type === filterType;
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const upcomingEvents = events
    .filter(event => new Date(event.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Family Calendar</h1>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowEventForm(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Event
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Calendar */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateMonth('prev')}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h2 className="text-xl font-semibold">
                    {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateMonth('next')}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === 'month' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('month')}
                  >
                    Month
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    List
                  </Button>
                </div>
              </div>
              
              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search events..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="all">All Events</option>
                  <option value="birthday">Birthdays</option>
                  <option value="travel">Travel</option>
                  <option value="dinner">Dinners</option>
                  <option value="celebration">Celebrations</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </CardHeader>
            
            <CardContent>
              {viewMode === 'month' ? (
                <div className="grid grid-cols-7 gap-1">
                  {/* Day headers */}
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                      {day}
                    </div>
                  ))}
                  
                  {/* Calendar days */}
                  {getDaysInMonth(currentDate).map((date, index) => (
                    <div
                      key={index}
                      className={`min-h-[80px] p-1 border border-gray-100 cursor-pointer hover:bg-gray-50 ${
                        date && isSameDay(selectedDate, date) ? 'bg-blue-50 border-blue-300' : ''
                      } ${
                        date && isToday(date) ? 'bg-yellow-50 border-yellow-300' : ''
                      }`}
                      onClick={() => date && setSelectedDate(date)}
                    >
                      {date && (
                        <>
                          <div className={`text-sm font-medium ${isToday(date) ? 'text-blue-600' : ''}`}>
                            {date.getDate()}
                          </div>
                          <div className="space-y-1">
                            {getEventsForDate(date).slice(0, 2).map(event => (
                              <div
                                key={event.id}
                                className="text-xs p-1 rounded truncate"
                                style={{ backgroundColor: event.color + '20', color: event.color }}
                              >
                                {event.title}
                              </div>
                            ))}
                            {getEventsForDate(date).length > 2 && (
                              <div className="text-xs text-gray-500">
                                +{getEventsForDate(date).length - 2} more
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredEvents.map(event => (
                    <Card key={event.id} className="border-l-4" style={{ borderLeftColor: event.color }}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-full" style={{ backgroundColor: event.color + '20' }}>
                              {getEventIcon(event.type)}
                            </div>
                            <div>
                              <h4 className="font-medium">{event.title}</h4>
                              <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(event.date).toLocaleDateString()}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {event.time}
                                </span>
                                {event.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {event.location}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={event.priority === 'high' ? 'destructive' : 
                                           event.priority === 'medium' ? 'default' : 'secondary'}>
                              {event.priority}
                            </Badge>
                            <Button variant="ghost" size="sm" onClick={() => setEditingEvent(event)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Upcoming Events */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Upcoming Events
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingEvents.map(event => (
                <div key={event.id} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                  <div className="w-2 h-2 rounded-full mt-2" style={{ backgroundColor: event.color }}></div>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-medium text-sm truncate">{event.title}</h5>
                    <p className="text-xs text-gray-500">
                      {new Date(event.date).toLocaleDateString()} at {event.time}
                    </p>
                  </div>
                </div>
              ))}
              {upcomingEvents.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No upcoming events
                </p>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>This Month</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Events</span>
                <span className="font-medium">{events.filter(e => 
                  new Date(e.date).getMonth() === currentDate.getMonth() &&
                  new Date(e.date).getFullYear() === currentDate.getFullYear()
                ).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Birthdays</span>
                <span className="font-medium">{events.filter(e => 
                  e.type === 'birthday' &&
                  new Date(e.date).getMonth() === currentDate.getMonth() &&
                  new Date(e.date).getFullYear() === currentDate.getFullYear()
                ).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Travel Plans</span>
                <span className="font-medium">{events.filter(e => 
                  e.type === 'travel' &&
                  new Date(e.date).getMonth() === currentDate.getMonth() &&
                  new Date(e.date).getFullYear() === currentDate.getFullYear()
                ).length}</span>
              </div>
            </CardContent>
          </Card>

          {/* Selected Date Events */}
          {selectedDate && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  {formatDate(selectedDate)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {getEventsForDate(selectedDate).map(event => (
                    <div key={event.id} className="flex items-center gap-2 p-2 border rounded">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: event.color }}></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{event.title}</p>
                        <p className="text-xs text-gray-500">{event.time}</p>
                      </div>
                    </div>
                  ))}
                  {getEventsForDate(selectedDate).length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-2">
                      No events this day
                    </p>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-2"
                    onClick={() => setShowEventForm(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Event
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarPage; 