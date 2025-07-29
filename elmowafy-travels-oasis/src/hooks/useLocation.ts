import { useEffect, useState } from 'react';

/**
 * Custom location hook that simulates the basic functionality of
 * react-router's useLocation hook for demonstration purposes
 */
export const useLocation = () => {
  const [pathname, setPathname] = useState<string>(window.location.pathname);
  const [search, setSearch] = useState<string>(window.location.search);
  const [hash, setHash] = useState<string>(window.location.hash);
  const [previousPath, setPreviousPath] = useState<string | null>(null);
  
  useEffect(() => {
    // Update path when URL changes
    const handleLocationChange = () => {
      if (previousPath !== window.location.pathname) {
        setPreviousPath(pathname);
      }
      setPathname(window.location.pathname);
      setSearch(window.location.search);
      setHash(window.location.hash);
    };
    
    // Listen for popstate events (browser back/forward)
    window.addEventListener('popstate', handleLocationChange);
    
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, [pathname, previousPath]);
  
  return {
    pathname,
    search,
    hash,
    previousPath,
    isNewRoute: previousPath !== null && previousPath !== pathname
  };
};
