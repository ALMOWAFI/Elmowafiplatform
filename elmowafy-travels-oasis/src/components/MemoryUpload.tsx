import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Upload, Camera, MapPin, Calendar, Users, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../context/LanguageContext';

// API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://elmowafiplatform-production.up.railway.app';

export const MemoryUpload: React.FC = () => {
  const { t, isRTL } = useLanguage();
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    location: '',
    tags: '',
    familyMembers: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
      toast.success('File selected successfully');
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    setIsUploading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('file', selectedFile);
      if (formData.title) formDataToSend.append('title', formData.title);
      if (formData.description) formDataToSend.append('description', formData.description);
      if (formData.date) formDataToSend.append('date', formData.date);
      if (formData.location) formDataToSend.append('location', formData.location);
      if (formData.tags) formDataToSend.append('tags', formData.tags);
      if (formData.familyMembers) formDataToSend.append('familyMembers', formData.familyMembers);

      const response = await fetch(`${API_BASE_URL}/api/v1/upload`, {
        method: 'POST',
        body: formDataToSend,
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Upload result with AI analysis:', result);
        
        if (result.data?.ai_analysis) {
          toast.success('Memory uploaded and analyzed with AI! 🧠');
          console.log('AI Analysis Result:', result.data.ai_analysis);
        } else {
          toast.success('Memory uploaded successfully!');
        }
        
        // Reset form
        setFormData({
          title: '',
          description: '',
          date: new Date().toISOString().split('T')[0],
          location: '',
          tags: '',
          familyMembers: ''
        });
        setSelectedFile(null);
        
        // Reset file input
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        
      } else {
        const errorData = await response.json();
        toast.error(errorData.detail || 'Failed to upload memory');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Error uploading memory');
    } finally {
      setIsUploading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Upload New Memory
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file-upload" className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Photo or Video
            </Label>
            <Input
              id="file-upload"
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
              className="cursor-pointer"
              required
            />
            <p className="text-sm text-muted-foreground">
              Supported formats: JPG, PNG, GIF, MP4. Max size: 10MB
            </p>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Memory Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter a memorable title..."
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Share the story behind this memory..."
              rows={3}
            />
          </div>

          {/* Date and Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Location
              </Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="Where was this taken?"
              />
            </div>
          </div>

          {/* Tags and Family Members */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tags" className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Tags
              </Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => handleInputChange('tags', e.target.value)}
                placeholder="fun, vacation, birthday..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="familyMembers" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Family Members
              </Label>
              <Input
                id="familyMembers"
                value={formData.familyMembers}
                onChange={(e) => handleInputChange('familyMembers', e.target.value)}
                placeholder="mom, dad, kids..."
              />
            </div>
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Memory
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}; 