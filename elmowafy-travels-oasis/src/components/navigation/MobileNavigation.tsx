import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Image, Map, Gamepad2, Activity } from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const MobileNavigation: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems: NavItem[] = [
    {
      path: '/',
      label: 'Dashboard',
      icon: <Home className="mobile-nav-icon" />
    },
    {
      path: '/memories',
      label: 'Memories',
      icon: <Image className="mobile-nav-icon" />
    },
    {
      path: '/travel',
      label: 'Travel',
      icon: <Map className="mobile-nav-icon" />
    },
    {
      path: '/activities',
      label: 'Activities',
      icon: <Activity className="mobile-nav-icon" />
    },
    {
      path: '/gaming',
      label: 'Gaming',
      icon: <Gamepad2 className="mobile-nav-icon" />
    }
  ];

  return (
    <nav className="mobile-bottom-nav mobile-safe-area-bottom">
      {navItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className={`mobile-nav-item ${currentPath === item.path ? 'active' : ''}`}
        >
          {item.icon}
          <span className="mobile-nav-label">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
};

export default MobileNavigation;