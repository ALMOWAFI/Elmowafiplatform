import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Image as ImageIcon, X } from 'lucide-react';
import { memoryService } from '@/services/api';

interface PhotoUploadProps {
  onUploadComplete?: (result: any) => void;
  memoryId?: string;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({ 
  onUploadComplete,
  memoryId 
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    // Filter for image files only
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      alert('Please select image files only.');
      return;
    }

    setSelectedFiles(prev => [...prev, ...imageFiles]);

    // Create preview URLs
    const newPreviewUrls = imageFiles.map(file => URL.createObjectURL(file));
    setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
  };

  const removeFile = (index: number) => {
    // Revoke the preview URL to free memory
    URL.revokeObjectURL(previewUrls[index]);
    
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      alert('Please select at least one photo to upload.');
      return;
    }

    setUploading(true);

    try {
      const uploadPromises = selectedFiles.map(async (file) => {
        return await memoryService.uploadPhoto(file, memoryId);
      });

      const results = await Promise.all(uploadPromises);
      
      // If we have title/description, create a memory
      if (title || description) {
        const memoryData = {
          title,
          description,
          photos: results.map(r => r.file_path),
          date: new Date().toISOString(),
        };
        
        await memoryService.createMemory(memoryData);
      }

      // Clean up
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      setSelectedFiles([]);
      setPreviewUrls([]);
      setTitle('');
      setDescription('');

      if (onUploadComplete) {
        onUploadComplete(results);
      }

      alert(`Successfully uploaded ${results.length} photo(s)!`);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          Upload Family Photos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Upload area */}
        <div
          onClick={triggerFileSelect}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
        >
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium text-gray-700 mb-2">
            Click to select photos
          </p>
          <p className="text-sm text-gray-500">
            or drag and drop your images here
          </p>
        </div>

        {/* Memory details */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="memory-title">Memory Title (Optional)</Label>
            <Input
              id="memory-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Family Trip to Dubai"
            />
          </div>
          
          <div>
            <Label htmlFor="memory-description">Description (Optional)</Label>
            <Textarea
              id="memory-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Share details about this memory..."
              rows={3}
            />
          </div>
        </div>

        {/* Preview area */}
        {selectedFiles.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">
              Selected Photos ({selectedFiles.length})
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {previewUrls.map((url, index) => (
                <div key={index} className="relative group">
                  <img
                    src={url}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => removeFile(index)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                    {(selectedFiles[index].size / 1024 / 1024).toFixed(1)}MB
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload button */}
        <Button
          onClick={handleUpload}
          disabled={selectedFiles.length === 0 || uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Uploading...
            </>
          ) : (
            `Upload ${selectedFiles.length} Photo${selectedFiles.length !== 1 ? 's' : ''}`
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default PhotoUpload; 