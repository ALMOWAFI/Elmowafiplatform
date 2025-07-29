declare module 'react-router-dom' {
  import * as React from 'react';

  export interface Location {
    pathname: string;
    search: string;
    hash: string;
    state: any;
    key: string;
  }

  export interface NavigateOptions {
    replace?: boolean;
    state?: any;
  }

  export interface NavigateFunction {
    (to: string, options?: NavigateOptions): void;
  }

  export function useNavigate(): NavigateFunction;
  
  export interface Params {
    [key: string]: string;
  }
  
  export function useParams<T extends Params = Params>(): T;
  
  export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
    to: string;
    replace?: boolean;
    state?: any;
  }
  
  export const Link: React.FC<LinkProps>;
  
  export interface RouteProps {
    path?: string;
    index?: boolean;
    element?: React.ReactNode;
    children?: React.ReactNode;
  }
  
  export const Route: React.FC<RouteProps>;
  
  export interface RoutesProps {
    children?: React.ReactNode;
    location?: Location;
  }
  
  export const Routes: React.FC<RoutesProps>;
  
  export interface BrowserRouterProps {
    basename?: string;
    children?: React.ReactNode;
  }
  
  export const BrowserRouter: React.FC<BrowserRouterProps>;
}
