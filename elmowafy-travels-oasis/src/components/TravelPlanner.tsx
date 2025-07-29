
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/context/LanguageContext';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';

const TravelPlanner = () => {
  const { language, t } = useLanguage();
  const [destination, setDestination] = useState('');
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    if (!destination) {
      toast.error(language === 'en' ? 'Please enter a destination' : 'الرجاء إدخال الوجهة');
      return;
    }
    
    if (!fromDate || !toDate) {
      toast.error(language === 'en' ? 'Please select dates' : 'الرجاء اختيار التواريخ');
      return;
    }

    // Here we would normally save the travel plan to a database
    toast.success(
      language === 'en' 
        ? `Travel plan to ${destination} saved!` 
        : `تم حفظ خطة السفر إلى ${destination}!`
    );
    
    // Reset the form
    setDestination('');
    setFromDate(undefined);
    setToDate(undefined);
    setNotes('');
  };

  return (
    <Card className={`w-full shadow-md ${language === 'ar' ? 'rtl-text' : 'ltr-text'}`}>
      <CardHeader className="bg-gradient-to-r from-primary to-primary/70 text-white">
        <CardTitle>{t('planner.title')}</CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">{t('destination')}</label>
          <Input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder={language === 'en' ? "Where are you going?" : "إلى أين أنت ذاهب؟"}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('fromDate')}</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fromDate ? (
                    format(fromDate, "PPP")
                  ) : (
                    <span className="text-muted-foreground">
                      {language === 'en' ? "Select date" : "اختر التاريخ"}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={fromDate}
                  onSelect={setFromDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">{t('toDate')}</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {toDate ? (
                    format(toDate, "PPP")
                  ) : (
                    <span className="text-muted-foreground">
                      {language === 'en' ? "Select date" : "اختر التاريخ"}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={toDate}
                  onSelect={setToDate}
                  initialFocus
                  disabled={(date) => 
                    (fromDate ? date < fromDate : false) || 
                    date < new Date()
                  }
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">{t('notes')}</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={language === 'en' ? "Activities, places to visit..." : "الأنشطة، أماكن للزيارة..."}
            rows={4}
          />
        </div>
        
        <Button 
          onClick={handleSave} 
          className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
        >
          {t('save')}
        </Button>
      </CardContent>
    </Card>
  );
};

export default TravelPlanner;
