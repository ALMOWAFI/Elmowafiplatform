import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

type FamilyMember = {
  _id?: string;
  name: string;
  arabicName: string;
  gender: 'Male' | 'Female';
  dob?: string;
  bio?: string;
  arabicBio?: string;
  profilePicture?: string;
  parents?: Array<{ _id: string; name: string }>;
  spouse?: { _id: string; name: string };
  children?: Array<{ _id: string; name: string }>;
};\n
const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  arabicName: z.string().min(2, { message: 'Arabic name is required' }),
  gender: z.enum(['Male', 'Female']),
  dob: z.date().optional(),
  bio: z.string().optional(),
  arabicBio: z.string().optional(),
  profilePicture: z.string().url('Please enter a valid URL').optional(),
  parents: z.array(z.string()).optional(),
  spouse: z.string().optional(),
});

interface FamilyMemberFormProps {
  initialData?: FamilyMember;
  onSuccess: () => void;
  onCancel: () => void;
}

export const FamilyMemberForm: React.FC<FamilyMemberFormProps> = ({
  initialData,
  onSuccess,
  onCancel,
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedParents, setSelectedParents] = useState<Array<{ _id: string; name: string }>>(
    initialData?.parents || []
  );
  const [selectedSpouse, setSelectedSpouse] = useState<{ _id: string; name: string } | null>(
    initialData?.spouse || null
  );

  // Fetch family members for relationships
  const { data: familyMembers = [], isLoading: isLoadingMembers } = useQuery<FamilyMember[]>({
    queryKey: ['familyMembers'],
    queryFn: async () => {
      const { data } = await axios.get('/api/family');
      return data;
    },
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || '',
      arabicName: initialData?.arabicName || '',
      gender: initialData?.gender || 'Male',
      dob: initialData?.dob ? new Date(initialData.dob) : undefined,
      bio: initialData?.bio || '',
      arabicBio: initialData?.arabicBio || '',
      profilePicture: initialData?.profilePicture || '',
      parents: initialData?.parents?.map(p => p._id) || [],
      spouse: initialData?.spouse?._id || '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);
      const dataToSubmit = {
        ...values,
        dob: values.dob?.toISOString().split('T')[0],
        parents: selectedParents,
        spouse: selectedSpouse,
      };

      if (initialData?._id) {
        // Update existing member
        await axios.put(`/api/family/${initialData._id}`, dataToSubmit);
        toast({
          title: 'Member updated',
          description: 'Family member has been updated successfully.',
        });
      } else {
        // Create new member
        await axios.post('/api/family', dataToSubmit);
        toast({
          title: 'Member added',
          description: 'New family member has been added successfully.',
        });
      }
      
      onSuccess();
    } catch (error) {
      console.error('Error saving family member:', error);
      toast({
        title: 'Error',
        description: 'Failed to save family member. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableParents = familyMembers.filter(
    member => member._id !== initialData?._id && !selectedParents.some(p => p._id === member._id)
  );

  const availableSpouses = familyMembers.filter(
    member => 
      member._id !== initialData?._id && 
      member.gender !== form.watch('gender') &&
      (!selectedSpouse || member._id !== selectedSpouse._id)
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name (English)</FormLabel>
                <FormControl>
                  <Input placeholder="Enter name in English" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="arabicName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>الاسم (بالعربية)</FormLabel>
                <FormControl>
                  <Input dir="rtl" placeholder="أدخل الاسم بالعربية" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gender</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dob"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date of Birth</FormLabel>
                <FormControl>
                  <DatePicker
                    selected={field.value ? new Date(field.value) : undefined}
                    onSelect={field.onChange}
                    showYearDropdown
                    dropdownMode="select"
                    maxDate={new Date()}
                    className="w-full"
                    placeholderText="Select date of birth"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="profilePicture"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Profile Picture URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://example.com/photo.jpg" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <Label>Parents</Label>
            <div className="flex flex-wrap gap-2">
              {selectedParents.map(parent => (
                <div key={parent._id} className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  <span>{parent.name}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedParents(prev => prev.filter(p => p._id !== parent._id))}
                    className="text-gray-500 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {availableParents.length > 0 && (
                <Select
                  onValueChange={(value) => {
                    const parent = familyMembers.find(m => m._id === value);
                    if (parent) {
                      setSelectedParents(prev => [...prev, { _id: parent._id!, name: parent.name }]);
                    }
                  }}
                  value=""
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Add parent" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableParents.map(member => (
                      <SelectItem key={member._id} value={member._id!}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Spouse</Label>
            {selectedSpouse ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded">
                  {selectedSpouse.name}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSpouse(null)}
                  className="text-gray-500 hover:text-red-500 p-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : availableSpouses.length > 0 ? (
              <Select
                onValueChange={(value) => {
                  const spouse = familyMembers.find(m => m._id === value);
                  if (spouse) {
                    setSelectedSpouse({ _id: spouse._id!, name: spouse.name });
                  }
                }}
                value=""
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select spouse" />
                </SelectTrigger>
                <SelectContent>
                  {availableSpouses.map(member => (
                    <SelectItem key={member._id} value={member._id!}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-gray-500">No available spouses</p>
            )}
          </div>

          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Biography (English)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Tell us about this family member"
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="arabicBio"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>السيرة الذاتية (بالعربية)</FormLabel>
                <FormControl>
                  <Textarea
                    dir="rtl"
                    placeholder="أخبرنا عن هذا العضو من العائلة"
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-4 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : initialData ? (
              'Update Member'
            ) : (
              'Add Member'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default FamilyMemberForm;
