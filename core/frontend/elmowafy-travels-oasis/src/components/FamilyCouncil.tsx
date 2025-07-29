
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import { DollarSign, Users, PieChart, Wallet, TrendingUp, Calendar } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

// Mock trip budget data
const tripBudgets = [
  {
    id: 1,
    destination: 'Dubai',
    arabicDestination: 'دبي',
    totalBudget: 12000,
    currentContributions: 8500,
    contributors: [
      { name: 'Ahmed', amount: 3000 },
      { name: 'Mohamed', amount: 2500 },
      { name: 'Amr', amount: 2000 },
      { name: 'Ali', amount: 1000 },
    ],
    date: '2023-12-15',
  },
  {
    id: 2,
    destination: 'Istanbul',
    arabicDestination: 'اسطنبول',
    totalBudget: 9000,
    currentContributions: 3500,
    contributors: [
      { name: 'Khaled', amount: 2000 },
      { name: 'Ahmed', amount: 1500 },
    ],
    date: '2024-02-10',
  },
];

// Mock expenses data
const tripExpenses = [
  {
    id: 1,
    tripId: 1,
    category: 'Accommodation',
    arabicCategory: 'الإقامة',
    amount: 4500,
    paidBy: 'Ahmed',
    date: '2023-12-16',
    splitBetween: ['Ahmed', 'Mohamed', 'Amr', 'Ali'],
  },
  {
    id: 2,
    tripId: 1,
    category: 'Transportation',
    arabicCategory: 'المواصلات',
    amount: 1200,
    paidBy: 'Mohamed',
    date: '2023-12-17',
    splitBetween: ['Ahmed', 'Mohamed', 'Amr', 'Ali'],
  },
  {
    id: 3,
    tripId: 1,
    category: 'Food',
    arabicCategory: 'الطعام',
    amount: 800,
    paidBy: 'Amr',
    date: '2023-12-18',
    splitBetween: ['Ahmed', 'Mohamed', 'Amr', 'Ali'],
  },
];

const FamilyCouncil: React.FC = () => {
  const { language } = useLanguage();
  const [activeTrip, setActiveTrip] = useState(tripBudgets[0]);
  const [activeTripExpenses, setActiveTripExpenses] = useState(
    tripExpenses.filter(expense => expense.tripId === tripBudgets[0].id)
  );

  const handleTripSelect = (tripId: number) => {
    const trip = tripBudgets.find(t => t.id === tripId);
    if (trip) {
      setActiveTrip(trip);
      setActiveTripExpenses(tripExpenses.filter(expense => expense.tripId === tripId));
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage < 30) return "bg-red-500";
    if (percentage < 70) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-gradient-to-r from-primary to-primary/70 text-white">
        <CardTitle className="flex items-center gap-2">
          <Users />
          {language === 'en' ? 'Family Council' : 'مجلس العيلة'}
        </CardTitle>
        <CardDescription className="text-white/80">
          {language === 'en' 
            ? 'Collaborate on travel finances with transparency' 
            : 'تعاون في إدارة نفقات السفر بشفافية'}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="budgets" className="w-full">
          <TabsList className="grid grid-cols-3 h-auto p-0 bg-muted/20">
            <TabsTrigger value="budgets" className="py-3 data-[state=active]:bg-primary/10">
              <div className="flex flex-col items-center gap-1">
                <Wallet size={18} />
                <span className="text-xs font-medium">
                  {language === 'en' ? 'Budgets' : 'الميزانيات'}
                </span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="expenses" className="py-3 data-[state=active]:bg-primary/10">
              <div className="flex flex-col items-center gap-1">
                <DollarSign size={18} />
                <span className="text-xs font-medium">
                  {language === 'en' ? 'Expenses' : 'النفقات'}
                </span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="py-3 data-[state=active]:bg-primary/10">
              <div className="flex flex-col items-center gap-1">
                <PieChart size={18} />
                <span className="text-xs font-medium">
                  {language === 'en' ? 'Analytics' : 'التحليلات'}
                </span>
              </div>
            </TabsTrigger>
          </TabsList>
          
          <div className="p-4">
            {/* Trip selection */}
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={18} className="text-primary" />
              <span className="font-medium">
                {language === 'en' ? 'Select Trip:' : 'اختر الرحلة:'}
              </span>
              <select 
                className="p-1 border rounded"
                onChange={(e) => handleTripSelect(parseInt(e.target.value))}
                defaultValue={activeTrip.id}
              >
                {tripBudgets.map((trip) => (
                  <option key={trip.id} value={trip.id}>
                    {language === 'en' ? trip.destination : trip.arabicDestination}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <TabsContent value="budgets" className="p-4 pt-0">
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">
                {language === 'en' 
                  ? `${activeTrip.destination} Trip Budget` 
                  : `ميزانية رحلة ${activeTrip.arabicDestination}`}
              </h3>
              
              <div className="bg-muted/30 p-4 rounded-lg">
                <div className="flex justify-between mb-1">
                  <span>{language === 'en' ? 'Budget Progress' : 'تقدم الميزانية'}</span>
                  <span className="font-semibold">
                    {`${activeTrip.currentContributions} / ${activeTrip.totalBudget}`}
                  </span>
                </div>
                
                <Progress 
                  value={(activeTrip.currentContributions / activeTrip.totalBudget) * 100}
                  className={getProgressColor((activeTrip.currentContributions / activeTrip.totalBudget) * 100)}
                />
                
                <p className="text-xs mt-1 text-right">
                  {language === 'en' 
                    ? `${Math.round((activeTrip.currentContributions / activeTrip.totalBudget) * 100)}% Complete` 
                    : `تم إكمال ${Math.round((activeTrip.currentContributions / activeTrip.totalBudget) * 100)}%`}
                </p>
              </div>
              
              <h4 className="font-medium mt-4 mb-2">
                {language === 'en' ? 'Contributors' : 'المساهمون'}
              </h4>
              
              <div className="space-y-2">
                {activeTrip.contributors.map((contributor, index) => (
                  <div key={index} className="flex justify-between items-center bg-muted/20 p-3 rounded-md">
                    <span>{contributor.name}</span>
                    <span className="font-semibold">{contributor.amount}</span>
                  </div>
                ))}
              </div>
              
              <Button className="w-full mt-4">
                {language === 'en' ? 'Add Contribution' : 'إضافة مساهمة'}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="expenses" className="p-4 pt-0">
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">
                {language === 'en' 
                  ? `${activeTrip.destination} Trip Expenses` 
                  : `نفقات رحلة ${activeTrip.arabicDestination}`}
              </h3>
              
              <div className="space-y-3">
                {activeTripExpenses.map((expense) => (
                  <div key={expense.id} className="bg-muted/20 p-3 rounded-lg">
                    <div className="flex justify-between">
                      <span className="font-medium">
                        {language === 'en' ? expense.category : expense.arabicCategory}
                      </span>
                      <span className="font-semibold">{expense.amount}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground mt-1">
                      <span>{language === 'en' ? `Paid by ${expense.paidBy}` : `دفع بواسطة ${expense.paidBy}`}</span>
                      <span>{expense.date}</span>
                    </div>
                    <div className="text-xs mt-2 pt-2 border-t border-dashed">
                      <span>
                        {language === 'en' ? 'Split between: ' : 'مقسمة بين: '}
                        {expense.splitBetween.join(', ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              
              <Button className="w-full mt-4">
                {language === 'en' ? 'Add Expense' : 'إضافة نفقة'}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="analytics" className="p-4 pt-0">
            <div className="text-center p-6">
              <TrendingUp size={48} className="mx-auto text-primary/50" />
              <h3 className="text-lg font-semibold mt-2">
                {language === 'en' ? 'Expense Analysis' : 'تحليل النفقات'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {language === 'en' 
                  ? 'More detailed analytics features coming soon!' 
                  : 'المزيد من ميزات التحليل التفصيلية قادمة قريبًا!'}
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default FamilyCouncil;
