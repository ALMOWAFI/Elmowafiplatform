/**
 * Asset Optimization Utility
 * Optimizes images, fonts, and other assets for better performance
 */

interface ImageOptimizationOptions {
  quality: number;
  format: 'webp' | 'avif' | 'jpeg' | 'png';
  width?: number;
  height?: number;
  lazy?: boolean;
}

interface FontOptimizationOptions {
  preload: boolean;
  display: 'swap' | 'fallback' | 'optional' | 'auto';
  subset?: string[];
}

interface AssetMetrics {
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  loadTime: number;
  format: string;
}

// Image optimization utilities
export class ImageOptimizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  async optimizeImage(
    file: File | string, 
    options: ImageOptimizationOptions = { quality: 0.8, format: 'webp' }
  ): Promise<{ blob: Blob; metrics: AssetMetrics }> {
    const startTime = performance.now();
    
    // Load image
    const img = await this.loadImage(file);
    
    // Set canvas dimensions
    const { width, height } = this.calculateDimensions(img, options);
    this.canvas.width = width;
    this.canvas.height = height;
    
    // Draw and compress
    this.ctx.drawImage(img, 0, 0, width, height);
    
    // Convert to optimized format
    const blob = await this.canvasToBlob(options);
    
    const loadTime = performance.now() - startTime;
    const originalSize = typeof file === 'string' ? 0 : file.size;
    
    const metrics: AssetMetrics = {
      originalSize,
      optimizedSize: blob.size,
      compressionRatio: originalSize > 0 ? (originalSize - blob.size) / originalSize : 0,
      loadTime,
      format: options.format
    };

    console.log(`🖼️ Image optimized: ${originalSize > 0 ? Math.round(metrics.compressionRatio * 100) : 0}% reduction`);
    
    return { blob, metrics };
  }

  private async loadImage(source: File | string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => resolve(img);
      img.onerror = reject;
      
      if (typeof source === 'string') {
        img.src = source;
      } else {
        img.src = URL.createObjectURL(source);
      }
    });
  }

  private calculateDimensions(
    img: HTMLImageElement, 
    options: ImageOptimizationOptions
  ): { width: number; height: number } {
    let { width, height } = options;
    
    if (!width && !height) {
      return { width: img.naturalWidth, height: img.naturalHeight };
    }
    
    const aspectRatio = img.naturalWidth / img.naturalHeight;
    
    if (width && !height) {
      height = width / aspectRatio;
    } else if (height && !width) {
      width = height * aspectRatio;
    }
    
    return { width: width!, height: height! };
  }

  private async canvasToBlob(options: ImageOptimizationOptions): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const mimeType = `image/${options.format}`;
      
      this.canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert canvas to blob'));
          }
        },
        mimeType,
        options.quality
      );
    });
  }

  // Generate responsive image srcset
  generateSrcSet(
    baseUrl: string, 
    sizes: number[] = [320, 640, 1024, 1920]
  ): string {
    return sizes
      .map(size => `${baseUrl}?w=${size}&f=webp ${size}w`)
      .join(', ');
  }

  // Lazy loading image component
  createLazyImage(src: string, alt: string, options: ImageOptimizationOptions = { quality: 0.8, format: 'webp' }): HTMLImageElement {
    const img = document.createElement('img');
    
    img.alt = alt;
    img.loading = 'lazy';
    img.decoding = 'async';
    
    // Set up intersection observer for lazy loading
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            img.src = src;
            observer.unobserve(img);
          }
        });
      });
      
      observer.observe(img);
    } else {
      // Fallback for browsers without IntersectionObserver
      img.src = src;
    }
    
    return img;
  }
}

// Font optimization utilities
export class FontOptimizer {
  private loadedFonts = new Set<string>();

  async preloadFont(
    fontFamily: string,
    url: string,
    options: FontOptimizationOptions = { preload: true, display: 'swap' }
  ): Promise<void> {
    if (this.loadedFonts.has(fontFamily)) {
      return;
    }

    // Create preload link
    if (options.preload) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = url;
      link.as = 'font';
      link.type = 'font/woff2';
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    }

    // Create font face
    const fontFace = new FontFace(fontFamily, `url(${url})`, {
      display: options.display
    });

    try {
      await fontFace.load();
      document.fonts.add(fontFace);
      this.loadedFonts.add(fontFamily);
      
      console.log(`📝 Font loaded: ${fontFamily}`);
    } catch (error) {
      console.warn(`Failed to load font: ${fontFamily}`, error);
    }
  }

  // Optimize Google Fonts loading
  optimizeGoogleFonts(families: string[]): void {
    // Preconnect to Google Fonts
    this.addPreconnect('https://fonts.googleapis.com');
    this.addPreconnect('https://fonts.gstatic.com');

    // Load fonts with optimal parameters
    const fontUrl = this.buildGoogleFontsUrl(families);
    this.loadStylesheet(fontUrl);
  }

  private addPreconnect(href: string): void {
    if (document.querySelector(`link[href="${href}"][rel="preconnect"]`)) {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = href;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  }

  private buildGoogleFontsUrl(families: string[]): string {
    const baseUrl = 'https://fonts.googleapis.com/css2';
    const familyParams = families.map(family => `family=${encodeURIComponent(family)}`);
    
    return `${baseUrl}?${familyParams.join('&')}&display=swap`;
  }

  private loadStylesheet(href: string): void {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.media = 'print';
    link.onload = () => {
      link.media = 'all';
    };
    document.head.appendChild(link);
  }
}

// Critical resource optimizer
export class CriticalResourceOptimizer {
  private criticalResources = new Set<string>();
  private resourceLoadTimes = new Map<string, number>();

  // Preload critical resources
  preloadCriticalResources(resources: string[]): void {
    resources.forEach(resource => {
      if (this.criticalResources.has(resource)) {
        return;
      }

      const startTime = performance.now();
      
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource;
      
      // Determine resource type
      if (resource.endsWith('.js')) {
        link.as = 'script';
      } else if (resource.endsWith('.css')) {
        link.as = 'style';
      } else if (resource.match(/\.(woff|woff2|eot|ttf|otf)$/)) {
        link.as = 'font';
        link.crossOrigin = 'anonymous';
      } else if (resource.match(/\.(png|jpg|jpeg|webp|avif|svg)$/)) {
        link.as = 'image';
      }

      link.onload = () => {
        const loadTime = performance.now() - startTime;
        this.resourceLoadTimes.set(resource, loadTime);
        console.log(`⚡ Critical resource loaded: ${resource} (${Math.round(loadTime)}ms)`);
      };

      document.head.appendChild(link);
      this.criticalResources.add(resource);
    });
  }

  // Get performance metrics for critical resources
  getCriticalResourceMetrics(): Record<string, number> {
    return Object.fromEntries(this.resourceLoadTimes);
  }

  // Prefetch next-page resources
  prefetchResources(resources: string[]): void {
    resources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = resource;
      document.head.appendChild(link);
    });
  }
}

// Asset compression utilities
export class AssetCompressor {
  // Compress text-based assets
  async compressText(text: string): Promise<{ compressed: string; ratio: number }> {
    // Simple compression using gzip-like approach
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    const originalBytes = encoder.encode(text);
    
    // Use CompressionStream if available
    if ('CompressionStream' in window) {
      const compressionStream = new CompressionStream('gzip');
      const writer = compressionStream.writable.getWriter();
      const reader = compressionStream.readable.getReader();
      
      writer.write(originalBytes);
      writer.close();
      
      const chunks: Uint8Array[] = [];
      let result = await reader.read();
      
      while (!result.done) {
        chunks.push(result.value);
        result = await reader.read();
      }
      
      const compressedBytes = this.concatenateUint8Arrays(chunks);
      const compressed = decoder.decode(compressedBytes);
      const ratio = (originalBytes.length - compressedBytes.length) / originalBytes.length;
      
      return { compressed, ratio };
    }
    
    // Fallback: simple minification
    const minified = text
      .replace(/\s+/g, ' ')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .trim();
    
    const minifiedBytes = encoder.encode(minified);
    const ratio = (originalBytes.length - minifiedBytes.length) / originalBytes.length;
    
    return { compressed: minified, ratio };
  }

  private concatenateUint8Arrays(arrays: Uint8Array[]): Uint8Array {
    const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
    const result = new Uint8Array(totalLength);
    
    let offset = 0;
    arrays.forEach(arr => {
      result.set(arr, offset);
      offset += arr.length;
    });
    
    return result;
  }
}

// Main asset optimizer class
export class AssetOptimizer {
  private imageOptimizer = new ImageOptimizer();
  private fontOptimizer = new FontOptimizer();
  private criticalResourceOptimizer = new CriticalResourceOptimizer();
  private assetCompressor = new AssetCompressor();

  // Initialize optimizations
  async initialize(): Promise<void> {
    console.log('🚀 Asset Optimizer initialized');
    
    // Preload critical resources
    this.criticalResourceOptimizer.preloadCriticalResources([
      '/assets/index.js',
      '/assets/index.css'
    ]);
    
    // Optimize Google Fonts
    this.fontOptimizer.optimizeGoogleFonts([
      'Inter:wght@400;500;600;700',
      'Cairo:wght@400;500;600;700' // Arabic font
    ]);
    
    // Set up performance monitoring
    this.setupPerformanceMonitoring();
  }

  // Public API
  optimizeImage = this.imageOptimizer.optimizeImage.bind(this.imageOptimizer);
  preloadFont = this.fontOptimizer.preloadFont.bind(this.fontOptimizer);
  preloadCriticalResources = this.criticalResourceOptimizer.preloadCriticalResources.bind(this.criticalResourceOptimizer);
  compressText = this.assetCompressor.compressText.bind(this.assetCompressor);

  // Get overall optimization metrics
  getOptimizationMetrics() {
    return {
      criticalResources: this.criticalResourceOptimizer.getCriticalResourceMetrics(),
      loadedFonts: this.fontOptimizer['loadedFonts'].size,
      timestamp: Date.now()
    };
  }

  private setupPerformanceMonitoring(): void {
    // Monitor resource loading performance
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'resource') {
            const resource = entry as PerformanceResourceTiming;
            
            if (resource.transferSize > 100000) { // > 100KB
              console.warn(`🐌 Large resource detected: ${resource.name} (${Math.round(resource.transferSize / 1024)}KB)`);
            }
          }
        });
      });
      
      observer.observe({ entryTypes: ['resource'] });
    }
  }
}

// Export singleton instance
export const assetOptimizer = new AssetOptimizer();

// Auto-initialize if in browser environment
if (typeof window !== 'undefined') {
  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => assetOptimizer.initialize());
  } else {
    assetOptimizer.initialize();
  }
}

export default assetOptimizer; 