import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, Zap, Image as ImageIcon, FileImage, CheckCircle } from 'lucide-react';
import { assetOptimizer } from '@/utils/assetOptimizer';

interface OptimizedImage {
  id: string;
  original: File;
  optimized: Blob;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  format: string;
  loadTime: number;
}

export const ImageOptimizer: React.FC = () => {
  const [images, setImages] = useState<OptimizedImage[]>([]);
  const [processing, setProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (files: FileList) => {
    if (!files.length) return;

    setProcessing(true);
    const totalFiles = files.length;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        setUploadProgress((i / totalFiles) * 100);
        
        // Optimize the image
        const result = await assetOptimizer.optimizeImage(file, {
          quality: 0.8,
          format: 'webp'
        });

        const optimizedImage: OptimizedImage = {
          id: `img_${Date.now()}_${i}`,
          original: file,
          optimized: result.blob,
          originalSize: result.metrics.originalSize,
          optimizedSize: result.metrics.optimizedSize,
          compressionRatio: result.metrics.compressionRatio,
          format: result.metrics.format,
          loadTime: result.metrics.loadTime
        };

        setImages(prev => [...prev, optimizedImage]);
        
      } catch (error) {
        console.error('Failed to optimize image:', error);
      }
    }
    
    setUploadProgress(100);
    setTimeout(() => {
      setProcessing(false);
      setUploadProgress(0);
    }, 500);
  }, []);

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const downloadOptimized = (image: OptimizedImage) => {
    const url = URL.createObjectURL(image.optimized);
    const a = document.createElement('a');
    a.href = url;
    a.download = `optimized_${image.original.name.split('.')[0]}.${image.format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAll = () => {
    images.forEach(image => downloadOptimized(image));
  };

  const clearImages = () => {
    setImages([]);
  };

  const getTotalSavings = () => {
    const totalOriginal = images.reduce((sum, img) => sum + img.originalSize, 0);
    const totalOptimized = images.reduce((sum, img) => sum + img.optimizedSize, 0);
    return {
      originalSize: totalOriginal,
      optimizedSize: totalOptimized,
      savings: totalOriginal - totalOptimized,
      ratio: totalOriginal > 0 ? (totalOriginal - totalOptimized) / totalOriginal : 0
    };
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const savings = getTotalSavings();

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ImageIcon className="h-6 w-6" />
            <span>Image Optimization Demo</span>
            <Badge variant="outline" className="text-green-600">
              <Zap className="h-3 w-3 mr-1" />
              Performance Optimized
            </Badge>
          </CardTitle>
          <CardDescription>
            Demonstrate WebP conversion, compression, and lazy loading optimization
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{images.length}</div>
              <div className="text-sm text-gray-600">Images Optimized</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {savings.ratio > 0 ? Math.round(savings.ratio * 100) : 0}%
              </div>
              <div className="text-sm text-gray-600">Size Reduction</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {formatFileSize(savings.savings)}
              </div>
              <div className="text-sm text-gray-600">Total Saved</div>
            </div>
          </div>

          {/* Upload Area */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6">
            <div className="flex flex-col items-center space-y-4">
              <Upload className="h-12 w-12 text-gray-400" />
              <div>
                <h3 className="text-lg font-semibold">Upload Images for Optimization</h3>
                <p className="text-gray-600">Support for JPEG, PNG, WebP formats</p>
              </div>
              
              <Button onClick={handleFileUpload} disabled={processing}>
                <FileImage className="h-4 w-4 mr-2" />
                {processing ? 'Processing...' : 'Select Images'}
              </Button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
              />
            </div>
          </div>

          {/* Processing Progress */}
          {processing && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Optimizing images...</span>
                <span className="text-sm text-gray-600">{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {/* Action Buttons */}
          {images.length > 0 && (
            <div className="flex space-x-2 mb-6">
              <Button onClick={downloadAll} variant="default">
                <Download className="h-4 w-4 mr-2" />
                Download All
              </Button>
              <Button onClick={clearImages} variant="outline">
                Clear All
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Optimized Images List */}
      {images.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Optimization Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {images.map((image) => (
                <div key={image.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <div>
                        <h4 className="font-medium">{image.original.name}</h4>
                        <p className="text-sm text-gray-600">
                          Optimized to {image.format.toUpperCase()}
                        </p>
                      </div>
                    </div>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadOptimized(image)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Original Size</span>
                      <div className="font-medium">{formatFileSize(image.originalSize)}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Optimized Size</span>
                      <div className="font-medium text-green-600">
                        {formatFileSize(image.optimizedSize)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Compression</span>
                      <div className="font-medium text-blue-600">
                        {Math.round(image.compressionRatio * 100)}%
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Process Time</span>
                      <div className="font-medium text-purple-600">
                        {Math.round(image.loadTime)}ms
                      </div>
                    </div>
                  </div>
                  
                  {/* Compression Visual */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span>Compression Efficiency</span>
                      <span>{Math.round(image.compressionRatio * 100)}% reduction</span>
                    </div>
                    <Progress value={image.compressionRatio * 100} className="h-2" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>Performance Optimization Tips</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-semibold">Image Optimization Best Practices</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Use WebP format for 25-35% smaller files</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Implement lazy loading for non-critical images</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Generate responsive image sizes</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Use quality settings 80-85% for optimal balance</span>
                </li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold">Performance Impact</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-blue-500" />
                  <span>Faster page load times</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-blue-500" />
                  <span>Reduced bandwidth usage</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-blue-500" />
                  <span>Better mobile experience</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-blue-500" />
                  <span>Improved SEO scores</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImageOptimizer; 