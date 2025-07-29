import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLocation } from '@/hooks/useLocation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe, 
  Menu, 
  X, 
  MapPin, 
  Users, 
  Calendar, 
  Home,
  Star,
  MessageSquare,
  Map,
  Leaf,
  Trophy,
  Brain
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';

const Navbar = () => {
  const { language, setLanguage, t } = useLanguage();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isArabic = language === 'ar';
  
  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const toggleLanguage = () => {
    setLanguage(isArabic ? 'en' : 'ar');
  };
  
  // Define nav items
  const navItems = [
    { 
      path: '/', 
      labelEn: 'Home', 
      labelAr: 'الرئيسية',
      icon: <Home className="h-4 w-4" />
    },
    { 
      path: '/world-map', 
      labelEn: 'World Map', 
      labelAr: 'خريطة العالم',
      icon: <Map className="h-4 w-4" />
    },
    { 
      path: '/family-tree', 
      labelEn: 'Family Tree', 
      labelAr: 'شجرة العائلة',
      icon: <Users className="h-4 w-4" />
    },
    { 
      path: '/planner', 
      labelEn: 'Travel Planner', 
      labelAr: 'مخطط السفر',
      icon: <Calendar className="h-4 w-4" />
    },
    { 
      path: '/memories', 
      labelEn: 'Memories', 
      labelAr: 'الذكريات',
      icon: <Star className="h-4 w-4" />
    },
    { 
      path: '/ai-analysis', 
      labelEn: 'AI Analysis', 
      labelAr: 'تحليل الذكاء الاصطناعي',
      icon: <Brain className="h-4 w-4" />
    },
    { 
      path: '/challenges', 
      labelEn: 'Challenges', 
      labelAr: 'التحديات',
      icon: <Trophy className="h-4 w-4" />
    },
    { 
      path: '/profile', 
      labelEn: 'Profile', 
      labelAr: 'الملف الشخصي',
      icon: <Users className="h-4 w-4" />
    }
  ];

  // Container variants for animation
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.05,
        delayChildren: 0.05
      }
    }
  };
  
  // Item variants for animation
  const itemVariants = {
    hidden: { y: -20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: 'spring', stiffness: 300, damping: 24 }
    }
  };

  // Logo animation variants
  const logoVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { 
        type: 'spring', 
        stiffness: 500, 
        damping: 30,
        duration: 0.7 
      }
    }
  };
  
  // Mobile menu variants
  const mobileMenuVariants = {
    closed: { 
      x: isArabic ? '-100%' : '100%', 
      opacity: 0,
      transition: { 
        type: 'spring', 
        stiffness: 400, 
        damping: 40 
      }
    },
    open: { 
      x: 0, 
      opacity: 1,
      transition: { 
        type: 'spring', 
        stiffness: 400, 
        damping: 40,
        staggerChildren: 0.07,
        delayChildren: 0.1
      }
    }
  };
  
  const mobileItemVariants = {
    closed: { x: isArabic ? -20 : 20, opacity: 0 },
    open: { x: 0, opacity: 1 }
  };

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300",
        isScrolled 
          ? "bg-white/90 dark:bg-slate-900/90 backdrop-blur-md py-2 shadow-md" 
          : "bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm py-4"
      )}
    >
      <div className={cn(
        "container mx-auto flex items-center justify-between px-4",
        isArabic ? "flex-row-reverse" : "flex-row"
      )}>
        {/* Logo */}
        <motion.div 
          className="flex items-center gap-2"
          initial="hidden"
          animate="visible"
          variants={logoVariants}
        >
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
              <Leaf className="h-5 w-5 text-primary" />
              <motion.div 
                className="absolute inset-0 border-2 border-primary rounded-full"
                animate={{ 
                  scale: [1, 1.1, 1],
                  opacity: [1, 0.7, 1] 
                }}
                transition={{ 
                  duration: 3, 
                  repeat: Infinity,
                  repeatType: "loop" 
                }}
              />
            </div>
          </div>
          <div className={cn(
            "font-serif flex flex-col",
            isArabic ? "items-end" : "items-start"
          )}>
            <span className={cn(
              "text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary",
              isArabic ? "font-noto" : "font-playfair"
            )}>
              {isArabic ? 'الموافي' : 'Elmowafy'}
            </span>
            <span className="text-xs text-muted-foreground">
              {isArabic ? 'واحة الرحلات العائلية' : 'Family Travel Oasis'}
            </span>
          </div>
        </motion.div>

        {/* Desktop Menu */}
        <motion.div 
          className="hidden md:flex items-center gap-1"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <motion.div key={item.path} variants={itemVariants}>
                <Link 
                  to={item.path} 
                  className={cn(
                    "px-3 py-2 rounded-full flex items-center gap-1.5 transition-all duration-300 text-sm font-medium",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "hover:bg-muted hover:text-primary",
                    isArabic ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  {item.icon}
                  <span>{isArabic ? item.labelAr : item.labelEn}</span>
                  {isActive && (
                    <motion.div 
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                      layoutId="navbar-indicator"
                      transition={{ type: "spring", duration: 0.5 }}
                    />
                  )}
                </Link>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Right side actions */}
        <div className={cn(
          "flex items-center gap-2",
          isArabic ? "flex-row-reverse" : "flex-row"
        )}>
          {/* Language switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn(
                  "flex items-center gap-1.5 px-2.5 rounded-full hover:bg-muted",
                  isArabic && "flex-row-reverse"
                )}
              >
                <Globe className="h-4 w-4" />
                <span className="text-xs font-medium">
                  {isArabic ? 'العربية' : 'English'}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isArabic ? 'end' : 'start'} className="w-40">
              <DropdownMenuItem 
                className={cn(
                  "flex items-center gap-2 cursor-pointer",
                  isArabic && "flex-row-reverse text-right"
                )} 
                onClick={() => setLanguage('en')}
              >
                <span className={language === 'en' ? "font-bold" : ""}>English</span>
                {language === 'en' && <motion.div layoutId="lang-check" />}
              </DropdownMenuItem>
              <DropdownMenuItem 
                className={cn(
                  "flex items-center gap-2 cursor-pointer font-noto", 
                  isArabic && "flex-row-reverse text-right"
                )} 
                onClick={() => setLanguage('ar')}
              >
                <span className={language === 'ar' ? "font-bold" : ""}>العربية</span>
                {language === 'ar' && <motion.div layoutId="lang-check" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Chat button */}
          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-full hidden sm:flex items-center gap-1.5 border-primary/20 text-primary hover:bg-primary/5 hover:text-primary hover:border-primary/30"
            asChild
          >
            <Link to="/assistant">
              <MessageSquare className="h-4 w-4" />
              <span>{isArabic ? 'المساعد الذكي' : 'AI Assistant'}</span>
            </Link>
          </Button>

          {/* Mobile menu toggle */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            className={cn(
              "fixed inset-0 top-[60px] bg-background/95 backdrop-blur-md z-50 border-t overflow-hidden md:hidden",
              isArabic ? "right-0" : "left-0"
            )}
            initial="closed"
            animate="open"
            exit="closed"
            variants={mobileMenuVariants}
          >
            <motion.div 
              className="p-4 flex flex-col h-full"
              initial="closed"
              animate="open"
              exit="closed"
              variants={containerVariants}
            >
              <div className="flex flex-col space-y-1 mb-6">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <motion.div 
                      key={item.path}
                      variants={mobileItemVariants}
                    >
                      <Link 
                        to={item.path} 
                        className={cn(
                          "p-3 flex items-center rounded-lg transition-colors",
                          isActive 
                            ? "bg-primary/10 text-primary font-medium" 
                            : "hover:bg-muted",
                          isArabic ? "flex-row-reverse text-right" : "text-left"
                        )}
                      >
                        <div className={cn(
                          "flex items-center gap-3",
                          isArabic && "flex-row-reverse"
                        )}>
                          {item.icon}
                          <span>{isArabic ? item.labelAr : item.labelEn}</span>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>

              <div className="mt-auto">
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="w-full rounded-xl flex items-center gap-2 py-6"
                  asChild
                >
                  <Link to="/assistant">
                    <MessageSquare className="h-5 w-5" />
                    <span className="font-medium">
                      {isArabic ? 'تحدث مع المساعد الذكي' : 'Talk to AI Assistant'}
                    </span>
                  </Link>
                </Button>
                
                <p className="text-xs text-center text-muted-foreground mt-6">
                  {isArabic 
                    ? 'منصة الموافي - واحة الرحلات العائلية' 
                    : 'Elmowafy Platform - Family Travel Oasis'}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
