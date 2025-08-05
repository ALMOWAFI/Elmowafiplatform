import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TravelRecommendation } from '@/services/aiService';

interface TravelRecommendationsProps {
  recommendations: TravelRecommendation | null;
  isLoading: boolean;
  error: string | null;
}

export function TravelRecommendations({ recommendations, isLoading, error }: TravelRecommendationsProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <span className="ml-4 text-muted-foreground">Generating your travel recommendations...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-lg bg-destructive/10 border border-destructive text-destructive">
        <h3 className="font-semibold mb-2">Error loading recommendations</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!recommendations) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p>Enter your travel preferences to get personalized recommendations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Destination Overview */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{recommendations.destination_analysis.destination}</CardTitle>
              <div className="flex items-center mt-2 space-x-2">
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  {Math.round(recommendations.destination_analysis.suitability_score * 10)}/10
                </Badge>
                <Badge variant="outline" className="bg-blue-100 text-blue-800">
                  Family Friendly: {recommendations.destination_analysis.family_friendly_rating.toFixed(1)}/5
                </Badge>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              {recommendations.destination_analysis.cultural_significance}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{recommendations.destination_analysis.overview}</p>
        </CardContent>
      </Card>

      {/* Itinerary */}
      <Card>
        <CardHeader>
          <CardTitle>Suggested Itinerary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {recommendations.itinerary_suggestions.map((day, index) => (
            <div key={index} className="border-l-4 border-primary pl-4 py-2">
              <h4 className="font-semibold">Day {day.day}</h4>
              <ul className="mt-2 space-y-2">
                {day.activities.map((activity, i) => (
                  <li key={i} className="flex items-start">
                    <span className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-primary mr-2"></span>
                    <span>{activity}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 text-sm text-muted-foreground">
                Estimated cost: ${day.budget_estimate}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Budget Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Expenses</h4>
              <ul className="space-y-2">
                <li className="flex justify-between">
                  <span>Accommodation</span>
                  <span>${recommendations.budget_breakdown.accommodation}</span>
                </li>
                <li className="flex justify-between">
                  <span>Activities</span>
                  <span>${recommendations.budget_breakdown.activities}</span>
                </li>
                <li className="flex justify-between">
                  <span>Meals</span>
                  <span>${recommendations.budget_breakdown.meals}</span>
                </li>
                <li className="flex justify-between">
                  <span>Transportation</span>
                  <span>${recommendations.budget_breakdown.transportation}</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Family Considerations</h4>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                  {recommendations.family_considerations.child_friendly_venues 
                    ? 'Child-friendly venues available' 
                    : 'Limited child-friendly venues'}
                </li>
                <li className="flex items-center">
                  <span className={`w-2 h-2 rounded-full ${recommendations.family_considerations.elderly_accessible ? 'bg-green-500' : 'bg-amber-500'} mr-2`}></span>
                  {recommendations.family_considerations.elderly_accessible 
                    ? 'Elderly accessible' 
                    : 'Limited elderly accessibility'}
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                  {recommendations.family_considerations.cultural_dietary_options 
                    ? 'Cultural dietary options available' 
                    : 'Limited dietary options'}
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                  Language support: {recommendations.family_considerations.language_support}
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cultural Tips */}
      {recommendations.cultural_tips && recommendations.cultural_tips.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Cultural Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recommendations.cultural_tips.map((tip, index) => (
                <li key={index} className="flex items-start">
                  <span className="flex-shrink-0 w-1.5 h-1.5 mt-2 rounded-full bg-foreground mr-2"></span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
