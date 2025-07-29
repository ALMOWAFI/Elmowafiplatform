
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';

const Hero = () => {
  const { language, t } = useLanguage();
  
  return (
    <div 
      className="relative w-full h-[70vh] bg-gradient-to-r from-primary/90 to-secondary/90 hero-image flex items-center"
      style={{ 
        backgroundImage: "url('https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1742&q=80')",
        backgroundBlendMode: "overlay"
      }}
    >
      <div className={`container mx-auto px-6 ${language === 'ar' ? 'rtl-text' : 'ltr-text'}`}>
        <div className="max-w-lg animate-fade-in">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
            {t('hero.title')}
          </h1>
          <p className="text-white/90 text-lg mb-8">
            {t('hero.subtitle')}
          </p>
          <Button 
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-medium px-6 py-3 rounded-md"
            size="lg"
            asChild
          >
            <a href="/planner">{t('hero.cta')}</a>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Hero;
