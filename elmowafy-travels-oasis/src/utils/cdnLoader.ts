/**
 * CDN Loader Utility
 * Dynamically loads external libraries from CDN to reduce bundle size
 */

interface CDNLibrary {
  name: string;
  url: string;
  globalName: string;
  version: string;
  integrity?: string;
  dependencies?: string[];
}

interface LoaderOptions {
  timeout?: number;
  retries?: number;
  fallbackToLocal?: boolean;
}

// CDN library configurations
const CDN_LIBRARIES: Record<string, CDNLibrary> = {
  react: {
    name: 'react',
    url: 'https://unpkg.com/react@18/umd/react.production.min.js',
    globalName: 'React',
    version: '18.2.0',
    integrity: 'sha512-/3IjMdb2L9QbBdWiW5e3P2/npwMBaU9mHCSCUzNln0ZCYbcfTsGbTJrU/kGemdH2IWmB2ioZ+zkxtmq6g09fGQ=='
  },
  'react-dom': {
    name: 'react-dom',
    url: 'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
    globalName: 'ReactDOM',
    version: '18.2.0',
    dependencies: ['react'],
    integrity: 'sha512-6CAPlsEUCl2DuLp5xydwjdyHAr4DtT7xrR6rC4gBAMHVJPjFPVUeJNfN4pgjN8HFMG9Gp7lAaCX+XpBfDyBD5g=='
  },
  three: {
    name: 'three',
    url: 'https://unpkg.com/three@0.158.0/build/three.min.js',
    globalName: 'THREE',
    version: '0.158.0',
    integrity: 'sha512-FvqCI5O7lFqA4sX0WDjzrW+H2fA6mz1KYWnbJKKp9XaRu6zfk0EXR/B9P0VVj2a6YqXJm2hUZ3QdH1kJh+y6lw=='
  },
  'chart.js': {
    name: 'chart.js',
    url: 'https://unpkg.com/chart.js@4.4.0/dist/chart.umd.js',
    globalName: 'Chart',
    version: '4.4.0',
    integrity: 'sha512-C74QN1bxwV1v2PEujhmKjOZ7iNiCdVlN45BLnmzFJnU7qWe2VpDcC3m8a8d6pI8pAlGsVpgB/O6nYP9QJ1J3jw=='
  },
  'mapbox-gl': {
    name: 'mapbox-gl',
    url: 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js',
    globalName: 'mapboxgl',
    version: '2.15.0'
  }
};

// Loaded libraries cache
const loadedLibraries = new Set<string>();
const loadingPromises = new Map<string, Promise<any>>();

/**
 * Load a script from CDN with integrity check and fallback
 */
export async function loadScript(
  url: string, 
  options: { 
    integrity?: string; 
    timeout?: number;
    globalName?: string;
  } = {}
): Promise<void> {
  const { integrity, timeout = 10000, globalName } = options;

  return new Promise((resolve, reject) => {
    // Check if already loaded by global name
    if (globalName && (window as any)[globalName]) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    
    if (integrity) {
      script.integrity = integrity;
      script.crossOrigin = 'anonymous';
    }

    let timeoutId: NodeJS.Timeout | null = null;

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      script.removeEventListener('load', onLoad);
      script.removeEventListener('error', onError);
    };

    const onLoad = () => {
      cleanup();
      console.log(`✅ Loaded script from CDN: ${url}`);
      resolve();
    };

    const onError = (error: Event) => {
      cleanup();
      document.head.removeChild(script);
      console.warn(`❌ Failed to load script from CDN: ${url}`, error);
      reject(new Error(`Failed to load script: ${url}`));
    };

    // Set timeout
    timeoutId = setTimeout(() => {
      cleanup();
      document.head.removeChild(script);
      reject(new Error(`Timeout loading script: ${url}`));
    }, timeout);

    script.addEventListener('load', onLoad);
    script.addEventListener('error', onError);
    
    document.head.appendChild(script);
  });
}

/**
 * Load CSS from CDN
 */
export async function loadCSS(url: string, integrity?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    const existingLink = document.querySelector(`link[href="${url}"]`);
    if (existingLink) {
      resolve();
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    
    if (integrity) {
      link.integrity = integrity;
      link.crossOrigin = 'anonymous';
    }

    const onLoad = () => {
      console.log(`✅ Loaded CSS from CDN: ${url}`);
      resolve();
    };

    const onError = () => {
      document.head.removeChild(link);
      console.warn(`❌ Failed to load CSS from CDN: ${url}`);
      reject(new Error(`Failed to load CSS: ${url}`));
    };

    link.addEventListener('load', onLoad);
    link.addEventListener('error', onError);
    
    document.head.appendChild(link);
  });
}

/**
 * Load a library from CDN with dependency resolution
 */
export async function loadLibrary(
  libraryName: string, 
  options: LoaderOptions = {}
): Promise<any> {
  const { timeout = 10000, retries = 2, fallbackToLocal = true } = options;
  
  // Return cached promise if already loading
  if (loadingPromises.has(libraryName)) {
    return loadingPromises.get(libraryName);
  }

  // Return immediately if already loaded
  if (loadedLibraries.has(libraryName)) {
    const lib = CDN_LIBRARIES[libraryName];
    return lib ? (window as any)[lib.globalName] : null;
  }

  const loadPromise = async (): Promise<any> => {
    const library = CDN_LIBRARIES[libraryName];
    if (!library) {
      throw new Error(`Unknown library: ${libraryName}`);
    }

    try {
      // Load dependencies first
      if (library.dependencies) {
        await Promise.all(
          library.dependencies.map(dep => loadLibrary(dep, options))
        );
      }

      // Load the library
      await loadScript(library.url, {
        integrity: library.integrity,
        timeout,
        globalName: library.globalName
      });

      loadedLibraries.add(libraryName);
      console.log(`📦 Loaded library from CDN: ${libraryName} v${library.version}`);
      
      return (window as any)[library.globalName];

    } catch (error) {
      console.error(`Failed to load ${libraryName} from CDN:`, error);
      
      if (fallbackToLocal && retries > 0) {
        console.log(`🔄 Attempting fallback for ${libraryName}...`);
        // Try to import from local bundle as fallback
        try {
          const module = await import(/* @vite-ignore */ libraryName);
          loadedLibraries.add(libraryName);
          return module.default || module;
        } catch (fallbackError) {
          console.error(`Fallback also failed for ${libraryName}:`, fallbackError);
          throw fallbackError;
        }
      }
      
      throw error;
    }
  };

  const promise = loadPromise();
  loadingPromises.set(libraryName, promise);
  
  // Clean up promise cache after completion
  promise.finally(() => {
    loadingPromises.delete(libraryName);
  });

  return promise;
}

/**
 * Preload libraries for better performance
 */
export function preloadLibraries(libraryNames: string[]): void {
  libraryNames.forEach(name => {
    const library = CDN_LIBRARIES[name];
    if (library && !loadedLibraries.has(name)) {
      // Create preload link
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = library.url;
      link.as = 'script';
      
      if (library.integrity) {
        link.integrity = library.integrity;
        link.crossOrigin = 'anonymous';
      }
      
      document.head.appendChild(link);
      console.log(`🔮 Preloaded: ${name}`);
    }
  });
}

/**
 * Check CDN availability
 */
export async function checkCDNAvailability(): Promise<boolean> {
  try {
    const response = await fetch('https://unpkg.com/', {
      method: 'HEAD',
      mode: 'no-cors'
    });
    return true;
  } catch {
    console.warn('CDN not available, will use local bundles');
    return false;
  }
}

/**
 * React hook for loading libraries
 */
export function useLibraryLoader(libraryName: string, options: LoaderOptions = {}) {
  const [library, setLibrary] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    let mounted = true;
    
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const lib = await loadLibrary(libraryName, options);
        
        if (mounted) {
          setLibrary(lib);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();
    
    return () => {
      mounted = false;
    };
  }, [libraryName]);

  return { library, loading, error };
}

/**
 * Performance monitoring for CDN loads
 */
export const CDNPerformanceMonitor = {
  getLoadedLibraries(): string[] {
    return Array.from(loadedLibraries);
  },

  getLoadingLibraries(): string[] {
    return Array.from(loadingPromises.keys());
  },

  getStats() {
    return {
      loaded: loadedLibraries.size,
      loading: loadingPromises.size,
      available: Object.keys(CDN_LIBRARIES).length,
      libraries: this.getLoadedLibraries()
    };
  },

  async measureLoadTime(libraryName: string): Promise<number> {
    const startTime = performance.now();
    await loadLibrary(libraryName);
    const endTime = performance.now();
    
    const loadTime = endTime - startTime;
    console.log(`📊 ${libraryName} load time: ${loadTime.toFixed(2)}ms`);
    return loadTime;
  }
};

// Auto-preload critical libraries on idle
if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
  requestIdleCallback(() => {
    preloadLibraries(['react', 'react-dom']);
  });
}

export default {
  loadLibrary,
  loadScript,
  loadCSS,
  preloadLibraries,
  checkCDNAvailability,
  useLibraryLoader,
  CDNPerformanceMonitor
}; 