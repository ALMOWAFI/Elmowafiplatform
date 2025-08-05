import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';

// Define the form schema using Zod
const travelFormSchema = z.object({
  destination: z.string().min(1, 'Destination is required'),
  budget: z.number().min(100, 'Budget should be at least $100').max(10000, 'Maximum budget is $10,000'),
  duration: z.number().min(1, 'Duration must be at least 1 day').max(30, 'Maximum duration is 30 days'),
  familyMembers: z.array(z.string()).min(1, 'At least one family member is required'),
  preferences: z.object({
    interests: z.array(z.string()).optional(),
    accessibilityNeeds: z.array(z.string()).optional(),
    dietaryRestrictions: z.array(z.string()).optional(),
    pace: z.enum(['relaxed', 'moderate', 'active']).optional(),
    accommodationType: z.enum(['budget', 'mid-range', 'luxury']).optional(),
  })
});

type TravelFormData = z.infer<typeof travelFormSchema>;

interface TravelPreferencesFormProps {
  onSubmit: (data: TravelFormData) => Promise<void>;
  isLoading?: boolean;
  familyMembers: Array<{ id: string; name: string }>;
}

export function TravelPreferencesForm({ onSubmit, isLoading = false, familyMembers }: TravelPreferencesFormProps) {
  const [selectedFamilyMembers, setSelectedFamilyMembers] = useState<string[]>([]);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<TravelFormData>({
    resolver: zodResolver(travelFormSchema),
    defaultValues: {
      budget: 1000,
      duration: 7,
      preferences: {
        pace: 'moderate',
        accommodationType: 'mid-range',
      },
    },
  });

  const handleFamilyMemberToggle = (memberId: string) => {
    setSelectedFamilyMembers(prev => {
      const newSelection = prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId];
      setValue('familyMembers', newSelection, { shouldValidate: true });
      return newSelection;
    });
  };

  const handleFormSubmit: SubmitHandler<TravelFormData> = async (data) => {
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="space-y-4">
        {/* Destination */}
        <div>
          <Label htmlFor="destination">Destination *</Label>
          <Input
            id="destination"
            placeholder="Where do you want to go?"
            {...register('destination')}
            disabled={isLoading}
          />
          {errors.destination && (
            <p className="text-sm text-red-500 mt-1">{errors.destination.message}</p>
          )}
        </div>

        {/* Budget */}
        <div>
          <div className="flex justify-between items-center">
            <Label htmlFor="budget">Budget (${watch('budget')})</Label>
            <span className="text-sm text-muted-foreground">
              ${watch('budget')}
            </span>
          </div>
          <Slider
            id="budget"
            min={100}
            max={10000}
            step={100}
            value={[watch('budget')]}
            onValueChange={([value]) => setValue('budget', value, { shouldValidate: true })}
            disabled={isLoading}
            className="mt-2"
          />
          {errors.budget && (
            <p className="text-sm text-red-500 mt-1">{errors.budget.message}</p>
          )}
        </div>

        {/* Duration */}
        <div>
          <Label htmlFor="duration">Duration (days) *</Label>
          <Input
            id="duration"
            type="number"
            min="1"
            max="30"
            {...register('duration', { valueAsNumber: true })}
            disabled={isLoading}
          />
          {errors.duration && (
            <p className="text-sm text-red-500 mt-1">{errors.duration.message}</p>
          )}
        </div>

        {/* Family Members */}
        <div>
          <Label>Family Members *</Label>
          <div className="mt-2 space-y-2">
            {familyMembers.map((member) => (
              <div key={member.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`member-${member.id}`}
                  checked={selectedFamilyMembers.includes(member.id)}
                  onCheckedChange={() => handleFamilyMemberToggle(member.id)}
                  disabled={isLoading}
                />
                <Label htmlFor={`member-${member.id}`} className="font-normal">
                  {member.name}
                </Label>
              </div>
            ))}
          </div>
          {errors.familyMembers && (
            <p className="text-sm text-red-500 mt-1">{errors.familyMembers.message}</p>
          )}
        </div>

        {/* Travel Pace */}
        <div>
          <Label htmlFor="pace">Travel Pace</Label>
          <Select
            onValueChange={(value: 'relaxed' | 'moderate' | 'active') =>
              setValue('preferences.pace', value, { shouldValidate: true })
            }
            value={watch('preferences.pace')}
            disabled={isLoading}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select travel pace" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relaxed">Relaxed</SelectItem>
              <SelectItem value="moderate">Moderate</SelectItem>
              <SelectItem value="active">Active</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Accommodation Type */}
        <div>
          <Label htmlFor="accommodation">Accommodation Type</Label>
          <Select
            onValueChange={(value: 'budget' | 'mid-range' | 'luxury') =>
              setValue('preferences.accommodationType', value, { shouldValidate: true })
            }
            value={watch('preferences.accommodationType')}
            disabled={isLoading}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select accommodation type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="budget">Budget</SelectItem>
              <SelectItem value="mid-range">Mid-range</SelectItem>
              <SelectItem value="luxury">Luxury</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Getting Recommendations...
          </>
        ) : (
          'Get Travel Recommendations'
        )}
      </Button>
    </form>
  );
}
